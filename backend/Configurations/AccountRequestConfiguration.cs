using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IsoGuard.Api.Configurations;

public sealed class AccountRequestConfiguration : IEntityTypeConfiguration<AccountRequest>
{
    public void Configure(EntityTypeBuilder<AccountRequest> b)
    {
        b.ToTable("account_requests", table =>
        {
            table.HasCheckConstraint(
                "ck_account_requests_status",
                "status IN ('PENDING', 'APPROVED', 'REJECTED')");
            table.HasCheckConstraint(
                "ck_account_requests_decision",
                "(status = 'PENDING' AND decided_by_id IS NULL AND decided_at IS NULL) OR " +
                "(status <> 'PENDING' AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL)");
        });
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.RequestedById)
            .HasFilter("status = 'PENDING'")
            .IsUnique();
        b.HasIndex(x => new { x.Status, x.CreatedAt });
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(x => x.DecisionNote).HasMaxLength(500);
        b.HasOne(x => x.RequestedBy).WithMany().HasForeignKey(x => x.RequestedById)
            .OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.DecidedBy).WithMany().HasForeignKey(x => x.DecidedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
