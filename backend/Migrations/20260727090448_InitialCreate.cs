using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IsoGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    auth_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    role = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_profiles", x => x.id);
                    table.CheckConstraint("ck_profiles_role", "role IN ('ADMIN', 'USER')");
                    table.CheckConstraint("ck_profiles_status", "status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')");
                });

            migrationBuilder.CreateTable(
                name: "accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_number = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    balance = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "EUR"),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_accounts", x => x.id);
                    table.CheckConstraint("ck_accounts_balance_nonnegative", "balance >= 0");
                    table.CheckConstraint("ck_accounts_status", "status IN ('ACTIVE', 'BLOCKED', 'CLOSED')");
                    table.ForeignKey(
                        name: "fk_accounts_profiles_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_accounts_profiles_owner_id",
                        column: x => x.owner_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ip_address = table.Column<System.Net.IPAddress>(type: "inet", nullable: true),
                    metadata = table.Column<JsonDocument>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_audit_logs_profiles_user_id",
                        column: x => x.user_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    invited_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invited_role = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    status = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    supabase_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revoked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_invitations", x => x.id);
                    table.CheckConstraint("ck_invitations_accept_or_revoke", "accepted_at IS NULL OR revoked_at IS NULL");
                    table.CheckConstraint("ck_invitations_role", "invited_role IN ('ADMIN', 'USER')");
                    table.CheckConstraint("ck_invitations_status", "status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')");
                    table.ForeignKey(
                        name: "fk_invitations_profiles_invited_by_id",
                        column: x => x.invited_by_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    reference_number = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    source_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    destination_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    performed_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: false),
                    source_balance_before = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: false),
                    source_balance_after = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: false),
                    destination_balance_before = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: true),
                    destination_balance_after = table.Column<decimal>(type: "numeric(15,2)", precision: 15, scale: 2, nullable: true),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_transactions", x => x.id);
                    table.CheckConstraint("ck_transactions_amount_positive", "amount > 0");
                    table.CheckConstraint("ck_transactions_destination_fields", "(type = 'TRANSFER' AND destination_account_id IS NOT NULL AND destination_balance_before IS NOT NULL AND destination_balance_after IS NOT NULL) OR (type <> 'TRANSFER' AND destination_account_id IS NULL AND destination_balance_before IS NULL AND destination_balance_after IS NULL)");
                    table.CheckConstraint("ck_transactions_distinct_accounts", "destination_account_id IS NULL OR source_account_id <> destination_account_id");
                    table.CheckConstraint("ck_transactions_status", "status IN ('COMPLETED', 'REJECTED')");
                    table.CheckConstraint("ck_transactions_type", "type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')");
                    table.ForeignKey(
                        name: "fk_transactions_accounts_destination_account_id",
                        column: x => x.destination_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transactions_accounts_source_account_id",
                        column: x => x.source_account_id,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transactions_profiles_performed_by_id",
                        column: x => x.performed_by_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "anomaly_results",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    transaction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_suspicious = table.Column<bool>(type: "boolean", nullable: false),
                    raw_model_score = table.Column<double>(type: "double precision", nullable: false),
                    normalized_anomaly_score = table.Column<double>(type: "double precision", nullable: false),
                    model_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    model_version = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    analyzed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_anomaly_results", x => x.id);
                    table.CheckConstraint("ck_anomaly_results_normalized_score", "normalized_anomaly_score BETWEEN 0 AND 1");
                    table.ForeignKey(
                        name: "fk_anomaly_results_transactions_transaction_id",
                        column: x => x.transaction_id,
                        principalTable: "transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_accounts_account_number",
                table: "accounts",
                column: "account_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_accounts_created_by_id",
                table: "accounts",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounts_owner_id",
                table: "accounts",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "ix_anomaly_results_transaction_id",
                table: "anomaly_results",
                column: "transaction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_created_at",
                table: "audit_logs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_invitations_email_status",
                table: "invitations",
                columns: new[] { "email", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_invitations_invited_by_id",
                table: "invitations",
                column: "invited_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_invitations_supabase_user_id",
                table: "invitations",
                column: "supabase_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_profiles_auth_user_id",
                table: "profiles",
                column: "auth_user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_transactions_destination_account_id",
                table: "transactions",
                column: "destination_account_id");

            migrationBuilder.CreateIndex(
                name: "ix_transactions_performed_by_id_created_at",
                table: "transactions",
                columns: new[] { "performed_by_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_transactions_reference_number",
                table: "transactions",
                column: "reference_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_transactions_source_account_id_created_at",
                table: "transactions",
                columns: new[] { "source_account_id", "created_at" });

            migrationBuilder.Sql(
                """
                CREATE FUNCTION reject_completed_transaction_changes()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    IF OLD.status = 'COMPLETED' THEN
                        RAISE EXCEPTION 'Completed transactions are immutable';
                    END IF;
                    RETURN NEW;
                END;
                $$;

                CREATE TRIGGER transactions_immutable
                BEFORE UPDATE OR DELETE ON transactions
                FOR EACH ROW
                EXECUTE FUNCTION reject_completed_transaction_changes();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP FUNCTION IF EXISTS reject_completed_transaction_changes() CASCADE;");

            migrationBuilder.DropTable(
                name: "anomaly_results");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "invitations");

            migrationBuilder.DropTable(
                name: "transactions");

            migrationBuilder.DropTable(
                name: "accounts");

            migrationBuilder.DropTable(
                name: "profiles");
        }
    }
}
