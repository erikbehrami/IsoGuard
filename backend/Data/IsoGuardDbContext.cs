using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Data;

public sealed class IsoGuardDbContext(DbContextOptions<IsoGuardDbContext> options)
    : DbContext(options)
{
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountRequest> AccountRequests => Set<AccountRequest>();
    public DbSet<FinancialTransaction> Transactions => Set<FinancialTransaction>();
    public DbSet<AnomalyResult> AnomalyResults => Set<AnomalyResult>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IsoGuardDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added &&
                entry.Entity is Profile or Invitation or Account or AccountRequest
                    or FinancialTransaction or AuditLog)
            {
                entry.Property("CreatedAt").CurrentValue = now;
            }
            if (entry.Entity is Profile or Account &&
                entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Property("UpdatedAt").CurrentValue = now;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
