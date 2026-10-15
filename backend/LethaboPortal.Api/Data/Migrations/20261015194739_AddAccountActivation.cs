using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LethaboPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountActivation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Activated",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "ActivationAttempts",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ActivationCodeHash",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ActivationExpires",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Activated",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ActivationAttempts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ActivationCodeHash",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ActivationExpires",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");
        }
    }
}
