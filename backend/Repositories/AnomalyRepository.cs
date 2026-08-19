using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Repositories;

public interface IAnomalyRepository
{
    Task<IReadOnlyList<AnomalyResult>> ListSuspiciousAsync(CancellationToken ct);
    Task<AnomalyResult?> GetByTransactionIdAsync(
        Guid transactionId, CancellationToken ct);
    Task<AnomalyResult?> GetByTransactionIdAsync(
        Guid transactionId, bool tracking, CancellationToken ct);
}

public sealed class AnomalyRepository(IsoGuardDbContext db) : IAnomalyRepository
{
    private IQueryable<AnomalyResult> Query(bool tracking = false)
    {
        IQueryable<AnomalyResult> query = db.AnomalyResults;
        if (!tracking) query = query.AsNoTracking();
        return query
            .Include(x => x.Transaction)
            .ThenInclude(x => x.SourceAccount)
            .Include(x => x.Transaction)
            .ThenInclude(x => x.PerformedBy);
    }

    public async Task<IReadOnlyList<AnomalyResult>> ListSuspiciousAsync(
        CancellationToken ct) =>
        await Query()
            .Where(x => x.IsSuspicious)
            .OrderByDescending(x => x.AnalyzedAt)
            .ToListAsync(ct);

    public Task<AnomalyResult?> GetByTransactionIdAsync(
        Guid transactionId, CancellationToken ct) =>
        Query().SingleOrDefaultAsync(x => x.TransactionId == transactionId, ct);

    public Task<AnomalyResult?> GetByTransactionIdAsync(
        Guid transactionId, bool tracking, CancellationToken ct) =>
        Query(tracking).SingleOrDefaultAsync(x => x.TransactionId == transactionId, ct);
}
