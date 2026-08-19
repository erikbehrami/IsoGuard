using System.Data;
using IsoGuard.Api.DTOs.Anomalies;
using IsoGuard.Api.DTOs.Transactions;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Exceptions;
using IsoGuard.Api.Repositories;

namespace IsoGuard.Api.Services;

public sealed class TransactionService(
    IProfileRepository profiles,
    IAccountRepository accounts,
    ITransactionRepository transactions,
    IUnitOfWork unitOfWork,
    IAuditService audit,
    IAnomalyClient anomalyClient,
    ILogger<TransactionService> logger)
{
    public Task<FinancialTransaction> DepositAsync(
        DepositRequest request, Guid actorId, CancellationToken ct) =>
        ExecuteAsync(request.AccountId, null, request.Amount, request.Description,
            TransactionType.DEPOSIT, actorId, ct);

    public Task<FinancialTransaction> WithdrawAsync(
        WithdrawalRequest request, Guid actorId, CancellationToken ct) =>
        ExecuteAsync(request.AccountId, null, request.Amount, request.Description,
            TransactionType.WITHDRAWAL, actorId, ct);

    public Task<FinancialTransaction> TransferAsync(
        TransferRequest request, Guid actorId, CancellationToken ct)
    {
        if (request.SourceAccountId == request.DestinationAccountId)
            throw new BadRequestException("Source and destination accounts must differ.");
        return ExecuteAsync(request.SourceAccountId, request.DestinationAccountId,
            request.Amount, request.Description, TransactionType.TRANSFER, actorId, ct);
    }

    private async Task<FinancialTransaction> ExecuteAsync(
        Guid sourceId, Guid? destinationId, decimal amount, string? description,
        TransactionType type, Guid authUserId, CancellationToken ct)
    {
        if (amount <= 0) throw new BadRequestException("Amount must be greater than zero.");
        var actor = await profiles.GetActiveByAuthIdAsync(authUserId, false, ct)
            ?? throw new AuthenticationException("No active application profile was found.");

        await using var tx = await unitOfWork.BeginTransactionAsync(
            IsolationLevel.ReadCommitted, ct);

        var ids = destinationId is null
            ? new[] { sourceId }
            : new[] { sourceId, destinationId.Value }.Order().ToArray();
        await accounts.LockAsync(ids, ct);

        var source = await accounts.GetByIdAsync(sourceId, true, ct)
            ?? throw new NotFoundException("Source account was not found.");
        Account? destination = destinationId is null
            ? null
            : await accounts.GetByIdAsync(destinationId.Value, true, ct);

        if (type == TransactionType.TRANSFER && destination is null)
            throw new NotFoundException("Destination account was not found.");
        if (source.Status != AccountStatus.ACTIVE ||
            (destination is not null && destination.Status != AccountStatus.ACTIVE))
            throw new ConflictException("Only active accounts can transact.");
        if (actor.Role != UserRole.ADMIN && source.OwnerId != actor.Id)
            throw new ForbiddenException("You may only transact from your own accounts.");
        if (type != TransactionType.DEPOSIT && source.Balance < amount)
            throw new ConflictException("Insufficient account balance.");
        if (destination is not null &&
            !string.Equals(source.Currency, destination.Currency, StringComparison.Ordinal))
            throw new ConflictException("Transfers require accounts with the same currency.");

        var sourceBefore = source.Balance;
        var destinationBefore = destination?.Balance;
        source.Balance += type == TransactionType.DEPOSIT ? amount : -amount;
        if (destination is not null) destination.Balance += amount;

        var entity = new FinancialTransaction
        {
            Id = Guid.NewGuid(),
            ReferenceNumber = $"ISO-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..32],
            SourceAccountId = source.Id,
            DestinationAccountId = destination?.Id,
            PerformedById = actor.Id,
            Type = type,
            Amount = amount,
            SourceBalanceBefore = sourceBefore,
            SourceBalanceAfter = source.Balance,
            DestinationBalanceBefore = destinationBefore,
            DestinationBalanceAfter = destination?.Balance,
            Status = TransactionStatus.COMPLETED,
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        };
        transactions.Add(entity);
        audit.Record(actor.Id, "TRANSACTION_COMPLETED", nameof(FinancialTransaction), entity.Id,
            new { type = type.ToString(), amount, sourceId, destinationId });
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await AnalyzeAsync(entity, ct);
        return entity;
    }

    private async Task AnalyzeAsync(FinancialTransaction transaction, CancellationToken ct)
    {
        try
        {
            var recentSince = DateTimeOffset.UtcNow.AddHours(-24);
            var profile = await transactions.GetAccountProfileAsync(
                transaction.SourceAccountId, transaction.Type, transaction.Id, recentSince, ct);
            var before = transaction.SourceBalanceBefore;
            var request = new PredictionRequest(
                transaction.Id, transaction.Amount, (int)transaction.Type,
                transaction.CreatedAt.Hour, (int)transaction.CreatedAt.DayOfWeek,
                profile.TypicalAmount, profile.ConfirmedNormalTransactionCount,
                profile.RecentTransactionCount,
                // A deposit does not consume a customer's balance. Its amount
                // compared with a small pre-deposit balance is not a risk signal
                // (for example, a normal salary paid into a €10 account).
                transaction.Type == TransactionType.DEPOSIT || before == 0
                    ? 0
                    : transaction.Amount / Math.Abs(before));
            var result = await anomalyClient.PredictAsync(request, ct);
            transactions.AddAnomaly(new AnomalyResult
            {
                Id = Guid.NewGuid(),
                TransactionId = transaction.Id,
                IsSuspicious = result.IsSuspicious,
                RawModelScore = result.RawModelScore,
                NormalizedAnomalyScore = result.NormalizedAnomalyScore,
                ModelName = result.ModelName,
                ModelVersion = result.ModelVersion,
                AnalyzedAt = DateTimeOffset.UtcNow
            });
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Anomaly analysis failed for transaction {TransactionId}",
                transaction.Id);
        }
    }
}
