using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public sealed record TransactionQuery(
    int Page, int PageSize, TransactionType? Type, TransactionStatus? Status,
    Guid? AccountId, Guid? UserId, string? Search, DateTimeOffset? DateFrom,
    DateTimeOffset? DateTo, bool SuspiciousOnly);

public sealed record AccountTransactionProfile(
    decimal TypicalAmount, int ConfirmedNormalTransactionCount, int RecentTransactionCount);

public interface ITransactionRepository
{
    Task<(IReadOnlyList<FinancialTransaction> Items, int Total)> ListAsync(
        TransactionQuery query, Guid? restrictToUserId, CancellationToken ct);
    Task<FinancialTransaction?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<AccountTransactionProfile> GetAccountProfileAsync(
        Guid accountId, TransactionType type, Guid excludingTransactionId,
        DateTimeOffset recentSince, CancellationToken ct);
    void Add(FinancialTransaction transaction);
    void AddAnomaly(AnomalyResult anomaly);
}

public sealed class TransactionRepository(IsoGuardDbContext db) : ITransactionRepository
{
    public async Task<(IReadOnlyList<FinancialTransaction> Items, int Total)> ListAsync(
        TransactionQuery request, Guid? restrictToUserId, CancellationToken ct)
    {
        var query = db.Transactions.AsNoTracking()
            .Include(x => x.SourceAccount)
            .Include(x => x.DestinationAccount)
            .Include(x => x.PerformedBy)
            .Include(x => x.AnomalyResult)
            .AsQueryable();
        if (restrictToUserId is not null)
            query = query.Where(x => x.PerformedById == restrictToUserId);
        else if (request.UserId is not null)
            query = query.Where(x => x.PerformedById == request.UserId);
        if (request.Type is not null) query = query.Where(x => x.Type == request.Type);
        if (request.Status is not null) query = query.Where(x => x.Status == request.Status);
        if (request.AccountId is not null)
            query = query.Where(x => x.SourceAccountId == request.AccountId ||
                                     x.DestinationAccountId == request.AccountId);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            var accountId = Guid.TryParse(term, out var parsedAccountId)
                ? parsedAccountId
                : (Guid?)null;
            query = query.Where(x =>
                EF.Functions.ILike(x.ReferenceNumber, $"%{term}%") ||
                EF.Functions.ILike(x.SourceAccount.AccountNumber, $"%{term}%") ||
                (x.DestinationAccount != null &&
                 EF.Functions.ILike(x.DestinationAccount.AccountNumber, $"%{term}%")) ||
                (accountId != null &&
                 (x.SourceAccountId == accountId || x.DestinationAccountId == accountId)));
        }
        if (request.DateFrom is not null)
            query = query.Where(x => x.CreatedAt >= request.DateFrom);
        if (request.DateTo is not null)
            query = query.Where(x => x.CreatedAt <= request.DateTo);
        if (request.SuspiciousOnly)
            query = query.Where(x =>
                x.AnomalyResult != null && x.AnomalyResult.IsSuspicious);

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);
        return (rows, total);
    }

    public Task<FinancialTransaction?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Transactions.AsNoTracking()
            .Include(x => x.SourceAccount)
            .Include(x => x.DestinationAccount)
            .Include(x => x.PerformedBy)
            .SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task<AccountTransactionProfile> GetAccountProfileAsync(
        Guid accountId, TransactionType type, Guid excludingTransactionId,
        DateTimeOffset recentSince, CancellationToken ct)
    {
        var accountHistory = db.Transactions.Where(x =>
            x.SourceAccountId == accountId &&
            x.Status == TransactionStatus.COMPLETED &&
            x.Id != excludingTransactionId);
        var recentCount = await accountHistory.CountAsync(x => x.CreatedAt >= recentSince, ct);

        // Only an administrator's NORMAL decision can influence a customer's
        // personal baseline. Pending and confirmed-suspicious transactions must
        // never make future activity appear normal.
        var confirmedAmounts = await accountHistory
            .Where(x => x.Type == type &&
                        x.AnomalyResult != null &&
                        x.AnomalyResult.ReviewStatus == AnomalyReviewStatus.NORMAL)
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => x.Amount)
            .ToListAsync(ct);

        if (confirmedAmounts.Count < 5)
            return new AccountTransactionProfile(0m, confirmedAmounts.Count, recentCount);

        confirmedAmounts.Sort();
        var middle = confirmedAmounts.Count / 2;
        var median = confirmedAmounts.Count % 2 == 0
            ? (confirmedAmounts[middle - 1] + confirmedAmounts[middle]) / 2m
            : confirmedAmounts[middle];
        return new AccountTransactionProfile(median, confirmedAmounts.Count, recentCount);
    }

    public void Add(FinancialTransaction transaction) => db.Transactions.Add(transaction);
    public void AddAnomaly(AnomalyResult anomaly) => db.AnomalyResults.Add(anomaly);
}
