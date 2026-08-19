using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public interface IAccountRequestRepository
{
    Task<(IReadOnlyList<AccountRequest> Items, int Total)> ListAsync(
        int page, int pageSize, AccountRequestStatus? status, Guid? requestedById, string? search,
        CancellationToken ct);
    Task<AccountRequest?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> HasPendingAsync(Guid requestedById, CancellationToken ct);
    void Add(AccountRequest request);
}

public sealed class AccountRequestRepository(IsoGuardDbContext db)
    : IAccountRequestRepository
{
    public async Task<(IReadOnlyList<AccountRequest> Items, int Total)> ListAsync(
        int page, int pageSize, AccountRequestStatus? status, Guid? requestedById, string? search,
        CancellationToken ct)
    {
        var query = db.AccountRequests.AsNoTracking()
            .Include(x => x.RequestedBy)
            .Include(x => x.DecidedBy)
            .AsQueryable();
        if (status is not null) query = query.Where(x => x.Status == status);
        if (requestedById is not null)
            query = query.Where(x => x.RequestedById == requestedById);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.RequestedBy.FullName, $"%{term}%") ||
                db.Invitations.Any(invitation =>
                    invitation.SupabaseUserId == x.RequestedBy.AuthUserId &&
                    EF.Functions.ILike(invitation.Email, $"%{term}%")));
        }
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (rows, total);
    }

    public Task<AccountRequest?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.AccountRequests
            .Include(x => x.RequestedBy)
            .Include(x => x.DecidedBy)
            .SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<bool> HasPendingAsync(Guid requestedById, CancellationToken ct) =>
        db.AccountRequests.AnyAsync(
            x => x.RequestedById == requestedById &&
                 x.Status == AccountRequestStatus.PENDING, ct);

    public void Add(AccountRequest request) => db.AccountRequests.Add(request);
}
