using System.Data;
using IsoGuard.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace IsoGuard.Api.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct);
    Task<IDbContextTransaction> BeginTransactionAsync(
        IsolationLevel isolationLevel, CancellationToken ct);
}

public sealed class EfUnitOfWork(IsoGuardDbContext db) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct) => db.SaveChangesAsync(ct);

    public Task<IDbContextTransaction> BeginTransactionAsync(
        IsolationLevel isolationLevel, CancellationToken ct) =>
        db.Database.BeginTransactionAsync(isolationLevel, ct);
}
