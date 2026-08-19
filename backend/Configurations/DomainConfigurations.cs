using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IsoGuard.Api.Configurations;

public sealed class ProfileConfiguration : IEntityTypeConfiguration<Profile>
{
    public void Configure(EntityTypeBuilder<Profile> b)
    {
        b.ToTable("profiles", table =>
        {
            table.HasCheckConstraint("ck_profiles_role", "role IN ('ADMIN', 'USER')");
            table.HasCheckConstraint(
                "ck_profiles_status",
                "status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')");
        });
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.AuthUserId).IsUnique();
        b.Property(x => x.FullName).HasMaxLength(150).IsRequired();
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(10).IsRequired();
    }
}

public sealed class InvitationConfiguration : IEntityTypeConfiguration<Invitation>
{
    public void Configure(EntityTypeBuilder<Invitation> b)
    {
        b.ToTable("invitations", table =>
        {
            table.HasCheckConstraint(
                "ck_invitations_role",
                "invited_role IN ('ADMIN', 'USER')");
            table.HasCheckConstraint(
                "ck_invitations_status",
                "status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')");
            table.HasCheckConstraint(
                "ck_invitations_accept_or_revoke",
                "accepted_at IS NULL OR revoked_at IS NULL");
        });
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.Email, x.Status });
        b.HasIndex(x => x.SupabaseUserId);
        b.Property(x => x.Email).HasMaxLength(320).IsRequired();
        b.Property(x => x.InvitedRole).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(12).IsRequired();
        b.HasOne(x => x.InvitedBy).WithMany().HasForeignKey(x => x.InvitedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> b)
    {
        b.ToTable("accounts");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.AccountNumber).IsUnique();
        b.HasIndex(x => new { x.OwnerId, x.Currency })
            .HasFilter("status <> 'CLOSED'")
            .IsUnique();
        b.Property(x => x.AccountNumber).HasMaxLength(34).IsRequired();
        b.Property(x => x.Balance).HasPrecision(15, 2);
        b.Property(x => x.Currency).HasMaxLength(3).HasDefaultValue("EUR").IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.ToTable(t =>
        {
            t.HasCheckConstraint("ck_accounts_balance_nonnegative", "balance >= 0");
            t.HasCheckConstraint(
                "ck_accounts_status",
                "status IN ('ACTIVE', 'BLOCKED', 'CLOSED')");
        });
        b.HasOne(x => x.Owner).WithMany(x => x.Accounts).HasForeignKey(x => x.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class TransactionConfiguration : IEntityTypeConfiguration<FinancialTransaction>
{
    public void Configure(EntityTypeBuilder<FinancialTransaction> b)
    {
        b.ToTable("transactions");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.ReferenceNumber).IsUnique();
        b.HasIndex(x => new { x.PerformedById, x.CreatedAt });
        b.HasIndex(x => new { x.SourceAccountId, x.CreatedAt });
        b.Property(x => x.Amount).HasPrecision(15, 2);
        b.Property(x => x.SourceBalanceBefore).HasPrecision(15, 2);
        b.Property(x => x.SourceBalanceAfter).HasPrecision(15, 2);
        b.Property(x => x.DestinationBalanceBefore).HasPrecision(15, 2);
        b.Property(x => x.DestinationBalanceAfter).HasPrecision(15, 2);
        b.Property(x => x.ReferenceNumber).HasMaxLength(32).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(12).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.ToTable(t =>
        {
            t.HasCheckConstraint("ck_transactions_amount_positive", "amount > 0");
            t.HasCheckConstraint("ck_transactions_distinct_accounts",
                "destination_account_id IS NULL OR source_account_id <> destination_account_id");
            t.HasCheckConstraint(
                "ck_transactions_type",
                "type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')");
            t.HasCheckConstraint(
                "ck_transactions_status",
                "status IN ('COMPLETED', 'REJECTED')");
            t.HasCheckConstraint(
                "ck_transactions_destination_fields",
                "(type = 'TRANSFER' AND destination_account_id IS NOT NULL " +
                "AND destination_balance_before IS NOT NULL " +
                "AND destination_balance_after IS NOT NULL) OR " +
                "(type <> 'TRANSFER' AND destination_account_id IS NULL " +
                "AND destination_balance_before IS NULL " +
                "AND destination_balance_after IS NULL)");
        });
        b.HasOne(x => x.SourceAccount).WithMany().HasForeignKey(x => x.SourceAccountId)
            .OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.DestinationAccount).WithMany().HasForeignKey(x => x.DestinationAccountId)
            .OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.PerformedBy).WithMany().HasForeignKey(x => x.PerformedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class AnomalyResultConfiguration : IEntityTypeConfiguration<AnomalyResult>
{
    public void Configure(EntityTypeBuilder<AnomalyResult> b)
    {
        b.ToTable("anomaly_results");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.TransactionId).IsUnique();
        b.ToTable(t => t.HasCheckConstraint(
            "ck_anomaly_results_normalized_score",
            "normalized_anomaly_score BETWEEN 0 AND 1"));
        b.Property(x => x.ModelName).HasMaxLength(100).IsRequired();
        b.Property(x => x.ModelVersion).HasMaxLength(100).IsRequired();
        b.Property(x => x.ReviewStatus).HasConversion<string>().HasMaxLength(24).IsRequired();
        b.HasOne(x => x.Transaction).WithOne(x => x.AnomalyResult)
            .HasForeignKey<AnomalyResult>(x => x.TransactionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("audit_logs");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.CreatedAt);
        b.Property(x => x.Action).HasMaxLength(100).IsRequired();
        b.Property(x => x.EntityType).HasMaxLength(100).IsRequired();
        b.Property(x => x.IpAddress).HasColumnType("inet");
        b.Property(x => x.Metadata).HasColumnType("jsonb");
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
