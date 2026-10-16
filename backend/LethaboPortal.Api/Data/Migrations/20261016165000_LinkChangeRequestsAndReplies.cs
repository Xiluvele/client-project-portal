using LethaboPortal.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LethaboPortal.Api.Data.Migrations
{
    [DbContext(typeof(PortalDbContext))]
    [Migration("20261016165000_LinkChangeRequestsAndReplies")]
    public partial class LinkChangeRequestsAndReplies : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReplyToId",
                table: "ProjectComments",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentKind",
                table: "ChangeRequests",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentName",
                table: "ChangeRequests",
                type: "nvarchar(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentPreviewUrl",
                table: "ChangeRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaskId",
                table: "ChangeRequests",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ReplyToId", table: "ProjectComments");
            migrationBuilder.DropColumn(name: "AttachmentKind", table: "ChangeRequests");
            migrationBuilder.DropColumn(name: "AttachmentName", table: "ChangeRequests");
            migrationBuilder.DropColumn(name: "AttachmentPreviewUrl", table: "ChangeRequests");
            migrationBuilder.DropColumn(name: "TaskId", table: "ChangeRequests");
        }
    }
}
