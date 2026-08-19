using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IsoGuard.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAnomalyReviewWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "review_status",
                table: "anomaly_results",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "reviewed_at",
                table: "anomaly_results",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "reviewed_by_id",
                table: "anomaly_results",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "review_status",
                table: "anomaly_results");

            migrationBuilder.DropColumn(
                name: "reviewed_at",
                table: "anomaly_results");

            migrationBuilder.DropColumn(
                name: "reviewed_by_id",
                table: "anomaly_results");
        }
    }
}
