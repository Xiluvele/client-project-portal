using LethaboPortal.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace LethaboPortal.Api.Data;

public class PortalDbContext(DbContextOptions<PortalDbContext> options) : DbContext(options)
{
    public DbSet<ClientAccount> Clients => Set<ClientAccount>();
    public DbSet<PortalUser> Users => Set<PortalUser>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<PortalProject> Projects => Set<PortalProject>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<ProjectFile> ProjectFiles => Set<ProjectFile>();
    public DbSet<ProjectComment> ProjectComments => Set<ProjectComment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<ChangeRequest> ChangeRequests => Set<ChangeRequest>();
    public DbSet<Requirement> Requirements => Set<Requirement>();
    public DbSet<ActivityEntry> Activities => Set<ActivityEntry>();
    public DbSet<PortalNotification> Notifications => Set<PortalNotification>();
    public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ClientAccount>(entity =>
        {
            entity.ToTable("Clients");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.Name).HasMaxLength(200);
            entity.Property(item => item.Contact).HasMaxLength(200);
            entity.Property(item => item.Email).HasMaxLength(200);
            entity.HasIndex(item => item.Email).IsUnique();
        });

        modelBuilder.Entity<PortalUser>(entity =>
        {
            entity.ToTable("Users");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.Name).HasMaxLength(200);
            entity.Property(item => item.Email).HasMaxLength(200);
            entity.Property(item => item.PasswordHash).HasMaxLength(500);
            entity.Property(item => item.Role).HasMaxLength(40);
            entity.Property(item => item.ClientId).HasMaxLength(40);
            entity.Property(item => item.MemberId).HasMaxLength(40);
            entity.Property(item => item.Title).HasMaxLength(200);
            entity.HasIndex(item => item.Email).IsUnique();
            entity.HasOne(item => item.Client)
                .WithMany(item => item.Users)
                .HasForeignKey(item => item.ClientId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.ToTable("TeamMembers");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.Name).HasMaxLength(200);
            entity.Property(item => item.ShortName).HasMaxLength(80);
            entity.Property(item => item.Role).HasMaxLength(80);
            entity.Property(item => item.Initials).HasMaxLength(8);
            entity.Property(item => item.Email).HasMaxLength(200);
            entity.HasIndex(item => item.Email).IsUnique();
        });

        modelBuilder.Entity<PortalProject>(entity =>
        {
            entity.ToTable("Projects");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ClientId).HasMaxLength(40);
            entity.Property(item => item.Name).HasMaxLength(200);
            entity.Property(item => item.Service).HasMaxLength(200);
            entity.Property(item => item.Description).HasMaxLength(2000);
            entity.Property(item => item.Status).HasMaxLength(40);
            entity.Property(item => item.Stage).HasMaxLength(40);
            entity.Property(item => item.StartedLabel).HasMaxLength(40);
            entity.Property(item => item.DueLabel).HasMaxLength(40);
            entity.HasOne(item => item.Client)
                .WithMany(item => item.Projects)
                .HasForeignKey(item => item.ClientId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.ToTable("ProjectMembers");
            entity.HasKey(item => new { item.ProjectId, item.MemberId });
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.MemberId).HasMaxLength(40);
            entity.HasOne(item => item.Project)
                .WithMany(item => item.Members)
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Member)
                .WithMany()
                .HasForeignKey(item => item.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Milestone>(entity =>
        {
            entity.ToTable("Milestones");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Name).HasMaxLength(200);
            entity.Property(item => item.TargetLabel).HasMaxLength(40);
            entity.Property(item => item.Status).HasMaxLength(40);
            entity.HasOne(item => item.Project)
                .WithMany(item => item.Milestones)
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkItem>(entity =>
        {
            entity.ToTable("WorkItems");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Title).HasMaxLength(300);
            entity.Property(item => item.Description).HasMaxLength(2000);
            entity.Property(item => item.Type).HasMaxLength(40);
            entity.Property(item => item.Status).HasMaxLength(40);
            entity.Property(item => item.AssigneeId).HasMaxLength(40);
            entity.Property(item => item.DueLabel).HasMaxLength(40);
            entity.HasOne(item => item.Project)
                .WithMany(item => item.Tasks)
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectFile>(entity =>
        {
            entity.ToTable("ProjectFiles");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Name).HasMaxLength(260);
            entity.Property(item => item.Kind).HasMaxLength(40);
            entity.Property(item => item.UploadedBy).HasMaxLength(200);
            entity.Property(item => item.Approval).HasMaxLength(40);
            entity.HasOne(item => item.Project)
                .WithMany(item => item.Files)
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectComment>(entity =>
        {
            entity.ToTable("ProjectComments");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.AuthorName).HasMaxLength(200);
            entity.Property(item => item.Initials).HasMaxLength(8);
            entity.Property(item => item.Role).HasMaxLength(40);
            entity.Property(item => item.Body).HasMaxLength(2000);
            entity.HasOne(item => item.Project)
                .WithMany(item => item.Comments)
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("Invoices");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.Number).HasMaxLength(40);
            entity.Property(item => item.ClientId).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Title).HasMaxLength(200);
            entity.Property(item => item.Status).HasMaxLength(40);
            entity.Property(item => item.IssuedLabel).HasMaxLength(40);
            entity.Property(item => item.DueLabel).HasMaxLength(40);
            entity.HasIndex(item => item.Number).IsUnique();
            entity.HasOne(item => item.Project)
                .WithMany()
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Client)
                .WithMany()
                .HasForeignKey(item => item.ClientId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<InvoiceLine>(entity =>
        {
            entity.ToTable("InvoiceLines");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.InvoiceId).HasMaxLength(40);
            entity.Property(item => item.Description).HasMaxLength(300);
            entity.Property(item => item.Amount).HasPrecision(18, 2);
            entity.HasOne(item => item.Invoice)
                .WithMany(item => item.Lines)
                .HasForeignKey(item => item.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChangeRequest>(entity =>
        {
            entity.ToTable("ChangeRequests");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.ClientId).HasMaxLength(40);
            entity.Property(item => item.Description).HasMaxLength(2000);
            entity.Property(item => item.Status).HasMaxLength(40);
            entity.HasOne(item => item.Project)
                .WithMany()
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Client)
                .WithMany()
                .HasForeignKey(item => item.ClientId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Requirement>(entity =>
        {
            entity.ToTable("Requirements");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Text).HasMaxLength(2000);
            entity.Property(item => item.Status).HasMaxLength(40);
            entity.HasOne(item => item.Project)
                .WithMany()
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityEntry>(entity =>
        {
            entity.ToTable("Activities");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Text).HasMaxLength(500);
            entity.HasOne(item => item.Project)
                .WithMany()
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PortalNotification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.UserId).HasMaxLength(40);
            entity.Property(item => item.ProjectId).HasMaxLength(40);
            entity.Property(item => item.Text).HasMaxLength(500);
            entity.HasOne(item => item.User)
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(item => item.Project)
                .WithMany()
                .HasForeignKey(item => item.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailOtp>(entity =>
        {
            entity.ToTable("EmailOtps");
            entity.Property(item => item.Id).HasMaxLength(40);
            entity.Property(item => item.Email).HasMaxLength(200);
            entity.Property(item => item.Purpose).HasMaxLength(40);
            entity.Property(item => item.UserId).HasMaxLength(40);
            entity.Property(item => item.CodeHash).HasMaxLength(200);
            entity.Property(item => item.DraftJson).HasMaxLength(4000);
            entity.HasIndex(item => item.Email);
        });
    }
}
