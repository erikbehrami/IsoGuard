using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public sealed record AccountQuery(
    int Page, int PageSize, AccountStatus? Status, string? Search, Guid? OwnerId);

public interface IAccountRepository
{
    Task<(IReadOnlyList<Account> Items, int Total)> ListAsync(
        AccountQuery query, Guid? restrictToOwnerId, CancellationToken ct);
    Task<Account?> GetByIdAsync(Guid id, bool tracking, CancellationToken ct);
    Task<Account?> FindActiveByNumberAsync(string accountNumber, CancellationToken ct);
    Task<bool> HasOpenCurrencyAsync(
        Guid ownerId, string currency, CancellationToken ct, Guid? excludeId = null);
    Task<IReadOnlyList<Account>> ListByOwnerAsync(Guid ownerId, CancellationToken ct);
    Task LockAsync(IEnumerable<Guid> accountIds, CancellationToken ct);
    void Add(Account account);
}

public sealed class AccountRepository(IsoGuardDbContext db) : IAccountRepository
{
    public async Task<(IReadOnlyList<Account> Items, int Total)> ListAsync(
        AccountQuery request, Guid? restrictToOwnerId, CancellationToken ct)
    {
        var query = db.Accounts.AsNoTracking().Include(x => x.Owner).AsQueryable();
        if (restrictToOwnerId is not null)
            query = query.Where(x => x.OwnerId == restrictToOwnerId);
        else if (request.OwnerId is not null)
            query = query.Where(x => x.OwnerId == request.OwnerId);
        if (request.Status is not null) query = query.Where(x => x.Status == request.Status);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Owner.FullName, $"%{term}%") ||
                EF.Functions.ILike(x.AccountNumber, $"%{term}%"));
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);
        return (rows, total);
    }

    public Task<Account?> GetByIdAsync(Guid id, bool tracking, CancellationToken ct)
    {
        IQueryable<Account> query = db.Accounts.Include(x => x.Owner);
        if (!tracking) query = query.AsNoTracking();
        return query.SingleOrDefaultAsync(x => x.Id == id, ct);
    }

    public Task<Account?> FindActiveByNumberAsync(
        string accountNumber, CancellationToken ct) =>
        db.Accounts.AsNoTracking().SingleOrDefaultAsync(
            x => x.AccountNumber == accountNumber && x.Status == AccountStatus.ACTIVE, ct);

    public Task<bool> HasOpenCurrencyAsync(
        Guid ownerId, string currency, CancellationToken ct, Guid? excludeId = null) =>
        db.Accounts.AnyAsync(
            x => x.OwnerId == ownerId &&
                 x.Currency == currency &&
                 x.Status != AccountStatus.CLOSED &&
                 (excludeId == null || x.Id != excludeId),
            ct);

    public async Task<IReadOnlyList<Account>> ListByOwnerAsync(
        Guid ownerId, CancellationToken ct) =>
        await db.Accounts.AsNoTracking()
            .Where(x => x.OwnerId == ownerId)
            .OrderBy(x => x.AccountNumber)
            .ToListAsync(ct);

    public async Task LockAsync(IEnumerable<Guid> accountIds, CancellationToken ct)
    {
        foreach (var id in accountIds.Distinct().Order())
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM accounts WHERE id = {id} FOR UPDATE", ct);
    }

    public void Add(Account account) => db.Accounts.Add(account);
}
