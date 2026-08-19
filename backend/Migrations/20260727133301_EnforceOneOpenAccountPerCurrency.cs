using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IsoGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnforceOneOpenAccountPerCurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_accounts_owner_id",
                table: "accounts");

            migrationBuilder.CreateIndex(
                name: "ix_accounts_owner_id_currency",
                table: "accounts",
                columns: new[] { "owner_id", "currency" },
                unique: true,
                filter: "status <> 'CLOSED'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_accounts_owner_id_currency",
                table: "accounts");

            migrationBuilder.CreateIndex(
                name: "ix_accounts_owner_id",
                table: "accounts",
                column: "owner_id");
        }
    }
}
