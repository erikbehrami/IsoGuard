using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public sealed record AdminDashboardSnapshot(
    int TotalUsers,
    int ActiveUsers,
    int BlockedUsers,
    int PendingInvitations,
    int UsersWithoutAccounts,
    int TotalAccounts,
    int ActiveAccounts,
    int TotalTransactions,
    int SuspiciousTransactions);

public interface IDashboardRepository
{
    Task<AdminDashboardSnapshot> GetAdminSnapshotAsync(CancellationToken ct);
}

public sealed class DashboardRepository(IsoGuardDbContext db) : IDashboardRepository
{
    public async Task<AdminDashboardSnapshot> GetAdminSnapshotAsync(
        CancellationToken ct) => new(
        await db.Profiles.CountAsync(ct),
        await db.Profiles.CountAsync(x => x.Status == ProfileStatus.ACTIVE, ct),
        await db.Profiles.CountAsync(x => x.Status == ProfileStatus.BLOCKED, ct),
        await db.Invitations.CountAsync(x => x.Status == InvitationStatus.PENDING, ct),
        await db.Profiles.CountAsync(
            x => x.Role == UserRole.USER &&
                 x.Status == ProfileStatus.ACTIVE &&
                 !x.Accounts.Any(), ct),
        await db.Accounts.CountAsync(ct),
        await db.Accounts.CountAsync(x => x.Status == AccountStatus.ACTIVE, ct),
        await db.Transactions.CountAsync(ct),
        await db.AnomalyResults.CountAsync(x => x.IsSuspicious, ct));
}
