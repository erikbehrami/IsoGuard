using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public interface IInvitationRepository
{
    Task<(IReadOnlyList<Invitation> Items, int Total)> ListAsync(
        int page, int pageSize, CancellationToken ct);
    Task<Invitation?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Invitation?> GetPendingByAuthIdAsync(Guid authId, CancellationToken ct);
    Task<bool> HasPendingAsync(string email, CancellationToken ct);
    Task<IReadOnlyDictionary<Guid, string>> GetEmailsAsync(
        IEnumerable<Guid> authIds, CancellationToken ct);
    void Add(Invitation invitation);
}

public sealed class InvitationRepository(IsoGuardDbContext db) : IInvitationRepository
{
    public async Task<(IReadOnlyList<Invitation> Items, int Total)> ListAsync(
        int page, int pageSize, CancellationToken ct)
    {
        var query = db.Invitations.AsNoTracking().Include(x => x.InvitedBy);
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (rows, total);
    }

    public Task<Invitation?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.Invitations.Include(x => x.InvitedBy)
            .SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<Invitation?> GetPendingByAuthIdAsync(Guid authId, CancellationToken ct) =>
        db.Invitations
            .Where(x => x.SupabaseUserId == authId &&
                        x.Status == InvitationStatus.PENDING)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public Task<bool> HasPendingAsync(string email, CancellationToken ct) =>
        db.Invitations.AnyAsync(
            x => x.Email == email && x.Status == InvitationStatus.PENDING, ct);

    public async Task<IReadOnlyDictionary<Guid, string>> GetEmailsAsync(
        IEnumerable<Guid> authIds, CancellationToken ct)
    {
        var ids = authIds.Distinct().ToList();
        var rows = await db.Invitations.AsNoTracking()
            .Where(x => x.SupabaseUserId != null && ids.Contains(x.SupabaseUserId.Value))
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return rows.GroupBy(x => x.SupabaseUserId!.Value)
            .ToDictionary(x => x.Key, x => x.First().Email);
    }

    public void Add(Invitation invitation) => db.Invitations.Add(invitation);
}
