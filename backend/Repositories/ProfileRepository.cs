using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public sealed record ProfileQuery(
    int Page, int PageSize, string? Search, UserRole? Role, ProfileStatus? Status);

public interface IProfileRepository
{
    Task<Profile?> GetActiveByAuthIdAsync(
        Guid authId, bool includeAccounts, CancellationToken ct);
    Task<Profile?> GetByAuthIdAsync(
        Guid authId, bool includeAccounts, CancellationToken ct);
    Task<Profile?> GetByIdAsync(Guid id, bool includeAccounts, CancellationToken ct);
    Task<(IReadOnlyList<Profile> Items, int Total)> ListAsync(
        ProfileQuery query, CancellationToken ct);
    void Add(Profile profile);
}

public sealed class ProfileRepository(IsoGuardDbContext db) : IProfileRepository
{
    public Task<Profile?> GetActiveByAuthIdAsync(
        Guid authId, bool includeAccounts, CancellationToken ct)
    {
        IQueryable<Profile> query = db.Profiles;
        if (includeAccounts) query = query.Include(x => x.Accounts);
        return query.SingleOrDefaultAsync(
            x => x.AuthUserId == authId && x.Status == ProfileStatus.ACTIVE, ct);
    }

    public Task<Profile?> GetByAuthIdAsync(
        Guid authId, bool includeAccounts, CancellationToken ct)
    {
        IQueryable<Profile> query = db.Profiles;
        if (includeAccounts) query = query.Include(x => x.Accounts);
        return query.SingleOrDefaultAsync(x => x.AuthUserId == authId, ct);
    }

    public Task<Profile?> GetByIdAsync(Guid id, bool includeAccounts, CancellationToken ct)
    {
        IQueryable<Profile> query = db.Profiles;
        if (includeAccounts) query = query.Include(x => x.Accounts);
        return query.SingleOrDefaultAsync(x => x.Id == id, ct);
    }

    public async Task<(IReadOnlyList<Profile> Items, int Total)> ListAsync(
        ProfileQuery request, CancellationToken ct)
    {
        var query = db.Profiles.AsNoTracking().Include(x => x.Accounts).AsQueryable();
        if (request.Role is not null) query = query.Where(x => x.Role == request.Role);
        if (request.Status is not null) query = query.Where(x => x.Status == request.Status);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(x => EF.Functions.ILike(x.FullName, $"%{term}%"));
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);
        return (rows, total);
    }

    public void Add(Profile profile) => db.Profiles.Add(profile);
}
