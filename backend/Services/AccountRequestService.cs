using System.Data;
using System.Security.Cryptography;
using IsoGuard.Api.DTOs;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Exceptions;
using IsoGuard.Api.Repositories;

namespace IsoGuard.Api.Services;

public interface IAccountRequestService
{
    Task<PageDto<AccountRequestDto>> ListMineAsync(
        Guid authId, int page, int pageSize, CancellationToken ct);
    Task<PageDto<AccountRequestDto>> ListAdminAsync(
        int page, int pageSize, AccountRequestStatus? status, string? search,
        CancellationToken ct);
    Task<AccountRequestDto> SubmitAsync(
        Guid authId, SubmitAccountRequest request, CancellationToken ct);
    Task<AccountRequestDto> DecideAsync(
        Guid authId, Guid id, DecideAccountRequest request, CancellationToken ct);
}

public sealed class AccountRequestService(
    IAccountRequestRepository requests,
    IProfileRepository profiles,
    IAccountRepository accounts,
    ISupabaseAdminClient supabase,
    IUnitOfWork unitOfWork,
    IAuditService audit) : IAccountRequestService
{
    public async Task<PageDto<AccountRequestDto>> ListMineAsync(
        Guid authId, int page, int pageSize, CancellationToken ct)
    {
        var actor = await ActiveActorAsync(authId, false, ct);
        (page, pageSize) = ApplicationRules.Page(page, pageSize);
        var (rows, total) = await requests.ListAsync(
            page, pageSize, null, actor.Id, null, ct);
        return await PageAsync(rows, page, pageSize, total, ct);
    }

    public async Task<PageDto<AccountRequestDto>> ListAdminAsync(
        int page, int pageSize, AccountRequestStatus? status, string? search,
        CancellationToken ct)
    {
        (page, pageSize) = ApplicationRules.Page(page, pageSize);
        var (rows, total) = await requests.ListAsync(
            page, pageSize, status, null, search, ct);
        return await PageAsync(rows, page, pageSize, total, ct);
    }

    public async Task<AccountRequestDto> SubmitAsync(
        Guid authId, SubmitAccountRequest request, CancellationToken ct)
    {
        var actor = await ActiveActorAsync(authId, true, ct);
        if (actor.Role != UserRole.USER)
            throw new ForbiddenException("Only regular users can request an account.");
        var currency = NormalizeCurrency(request.Currency);
        if (actor.Accounts.Any(
                x => x.Currency == currency && x.Status != AccountStatus.CLOSED))
            throw new ConflictException(
                $"You already have a non-closed {currency} account.");
        if (await requests.HasPendingAsync(actor.Id, ct))
            throw new ConflictException("You already have a pending account request.");

        var row = new AccountRequest
        {
            Id = Guid.NewGuid(),
            RequestedById = actor.Id,
            RequestedBy = actor,
            Currency = currency
        };
        requests.Add(row);
        audit.Record(actor.Id, "ACCOUNT_REQUESTED", nameof(AccountRequest), row.Id,
            new { currency });
        await unitOfWork.SaveChangesAsync(ct);
        return await MapAsync(row, ct);
    }

    public async Task<AccountRequestDto> DecideAsync(
        Guid authId, Guid id, DecideAccountRequest request, CancellationToken ct)
    {
        if (request.Decision == AccountRequestStatus.PENDING)
            throw new BadRequestException("Choose APPROVED or REJECTED.");
        if (request.Decision == AccountRequestStatus.REJECTED &&
            string.IsNullOrWhiteSpace(request.Note))
            throw new BadRequestException("A reason is required when rejecting a request.");

        var actor = await ActiveActorAsync(authId, false, ct);
        await using var tx = await unitOfWork.BeginTransactionAsync(
            IsolationLevel.Serializable, ct);
        var row = await requests.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Account request not found.");
        if (row.Status != AccountRequestStatus.PENDING)
            throw new ConflictException("Only pending account requests can be decided.");

        if (request.Decision == AccountRequestStatus.APPROVED)
        {
            var owner = await profiles.GetByIdAsync(row.RequestedById, true, ct)
                ?? throw new NotFoundException("Requesting user was not found.");
            if (owner.Role != UserRole.USER || owner.Status != ProfileStatus.ACTIVE)
                throw new ConflictException("The requesting user is no longer eligible.");
            if (owner.Accounts.Any(
                    x => x.Currency == row.Currency && x.Status != AccountStatus.CLOSED))
                throw new ConflictException(
                    $"The user already has a non-closed {row.Currency} account.");

            var account = new Account
            {
                Id = Guid.NewGuid(),
                AccountNumber = GenerateAccountNumber(),
                OwnerId = owner.Id,
                Owner = owner,
                CreatedById = actor.Id,
                Currency = row.Currency,
                Balance = 0,
                Status = AccountStatus.ACTIVE
            };
            accounts.Add(account);
            audit.Record(actor.Id, "ACCOUNT_CREATED", nameof(Account), account.Id,
                new { account.OwnerId, account.Currency, accountRequestId = row.Id });
        }

        row.Status = request.Decision;
        row.DecidedById = actor.Id;
        row.DecidedBy = actor;
        row.DecisionNote = string.IsNullOrWhiteSpace(request.Note)
            ? null
            : request.Note.Trim();
        row.DecidedAt = DateTimeOffset.UtcNow;
        audit.Record(actor.Id, $"ACCOUNT_REQUEST_{request.Decision}",
            nameof(AccountRequest), row.Id, new { row.DecisionNote });
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await MapAsync(row, ct);
    }

    private async Task<PageDto<AccountRequestDto>> PageAsync(
        IReadOnlyList<AccountRequest> rows, int page, int pageSize, int total,
        CancellationToken ct)
    {
        var authUsers = await supabase.GetUsersAsync(
            rows.Select(x => x.RequestedBy.AuthUserId), ct);
        var items = rows.Select(row =>
        {
            authUsers.TryGetValue(row.RequestedBy.AuthUserId, out var authUser);
            return Map(row, authUser?.Email ?? "");
        }).ToList();
        return new PageDto<AccountRequestDto>(
            items, page, pageSize, total, ApplicationRules.TotalPages(total, pageSize));
    }

    private async Task<AccountRequestDto> MapAsync(AccountRequest row, CancellationToken ct)
    {
        var users = await supabase.GetUsersAsync([row.RequestedBy.AuthUserId], ct);
        return Map(row, users.GetValueOrDefault(row.RequestedBy.AuthUserId)?.Email ?? "");
    }

    private static AccountRequestDto Map(AccountRequest row, string email) =>
        new(row.Id, row.RequestedById, row.RequestedBy.FullName, email,
            row.Currency, row.Status, row.DecidedBy?.FullName, row.DecisionNote,
            row.CreatedAt, row.DecidedAt);

    private async Task<Profile> ActiveActorAsync(
        Guid authId, bool includeAccounts, CancellationToken ct) =>
        await profiles.GetActiveByAuthIdAsync(authId, includeAccounts, ct)
        ?? throw new AuthenticationException("No active application profile was found.");

    private static string NormalizeCurrency(string value)
    {
        var currency = value.Trim().ToUpperInvariant();
        if (currency is not ("EUR" or "USD" or "GBP"))
            throw new BadRequestException("Currency must be EUR, USD or GBP.");
        return currency;
    }

    private static string GenerateAccountNumber()
    {
        var suffix = RandomNumberGenerator.GetInt32(100_000_000, 999_999_999);
        return $"IG{DateTime.UtcNow:yyMMdd}{suffix:D9}";
    }
}
