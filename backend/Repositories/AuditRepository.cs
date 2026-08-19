using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;

namespace IsoGuard.Api.Repositories;

public interface IAuditRepository
{
    void Add(AuditLog auditLog);
}

public sealed class AuditRepository(IsoGuardDbContext db) : IAuditRepository
{
    public void Add(AuditLog auditLog) => db.AuditLogs.Add(auditLog);
}
