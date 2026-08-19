using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IsoGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "account_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    decided_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    decision_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_account_requests", x => x.id);
                    table.CheckConstraint("ck_account_requests_decision", "(status = 'PENDING' AND decided_by_id IS NULL AND decided_at IS NULL) OR (status <> 'PENDING' AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL)");
                    table.CheckConstraint("ck_account_requests_status", "status IN ('PENDING', 'APPROVED', 'REJECTED')");
                    table.ForeignKey(
                        name: "fk_account_requests_profiles_decided_by_id",
                        column: x => x.decided_by_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_account_requests_profiles_requested_by_id",
                        column: x => x.requested_by_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_account_requests_decided_by_id",
                table: "account_requests",
                column: "decided_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_account_requests_requested_by_id",
                table: "account_requests",
                column: "requested_by_id",
                unique: true,
                filter: "status = 'PENDING'");

            migrationBuilder.CreateIndex(
                name: "ix_account_requests_status_created_at",
                table: "account_requests",
                columns: new[] { "status", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "account_requests");
        }
    }
}
