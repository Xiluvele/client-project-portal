namespace LethaboPortal.Api.Domain;

public class ClientAccount
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Contact { get; set; } = "";
    public string Email { get; set; } = "";
    public List<PortalProject> Projects { get; set; } = [];
    public List<PortalUser> Users { get; set; } = [];
}

public class PortalUser
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "";
    public string? ClientId { get; set; }
    public ClientAccount? Client { get; set; }
    public string? MemberId { get; set; }
    public string Title { get; set; } = "";
    public bool Active { get; set; } = true;
    public int FailedAttempts { get; set; }
    public bool Locked { get; set; }
}

public class TeamMember
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ShortName { get; set; } = "";
    public string Role { get; set; } = "";
    public string Initials { get; set; } = "";
    public string Email { get; set; } = "";
    public bool Allocated { get; set; }
}

public class PortalProject
{
    public string Id { get; set; } = "";
    public string ClientId { get; set; } = "";
    public ClientAccount? Client { get; set; }
    public string Name { get; set; } = "";
    public string Service { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "";
    public string Stage { get; set; } = "";
    public string StartedLabel { get; set; } = "";
    public string DueLabel { get; set; } = "";
    public bool DueThisWeek { get; set; }
    public int Progress { get; set; }
    public List<ProjectMember> Members { get; set; } = [];
    public List<Milestone> Milestones { get; set; } = [];
    public List<WorkItem> Tasks { get; set; } = [];
    public List<ProjectFile> Files { get; set; } = [];
    public List<ProjectComment> Comments { get; set; } = [];
}

public class ProjectMember
{
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string MemberId { get; set; } = "";
    public TeamMember? Member { get; set; }
}

public class Milestone
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string Name { get; set; } = "";
    public string TargetLabel { get; set; } = "";
    public string Status { get; set; } = "planned";
}

public class WorkItem
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string Type { get; set; } = "";
    public string Status { get; set; } = "backlog";
    public string? AssigneeId { get; set; }
    public string DueLabel { get; set; } = "";
    public bool Overdue { get; set; }
}

public class ProjectFile
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string Name { get; set; } = "";
    public string Kind { get; set; } = "";
    public string UploadedBy { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string Approval { get; set; } = "pending";
    public int Version { get; set; } = 1;
}

public class ProjectComment
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string AuthorName { get; set; } = "";
    public string Initials { get; set; } = "";
    public string Role { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public bool Read { get; set; }
}

public class Invoice
{
    public string Id { get; set; } = "";
    public string Number { get; set; } = "";
    public string ClientId { get; set; } = "";
    public ClientAccount? Client { get; set; }
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string IssuedLabel { get; set; } = "";
    public string DueLabel { get; set; } = "";
    public List<InvoiceLine> Lines { get; set; } = [];
}

public class InvoiceLine
{
    public string Id { get; set; } = "";
    public string InvoiceId { get; set; } = "";
    public Invoice? Invoice { get; set; }
    public string Description { get; set; } = "";
    public decimal Amount { get; set; }
}

public class ChangeRequest
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string ClientId { get; set; } = "";
    public ClientAccount? Client { get; set; }
    public string Description { get; set; } = "";
    public string Status { get; set; } = "submitted";
    public DateTime CreatedAt { get; set; }
}

public class Requirement
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string Text { get; set; } = "";
    public string Status { get; set; } = "recorded";
}

public class ActivityEntry
{
    public string Id { get; set; } = "";
    public string ProjectId { get; set; } = "";
    public PortalProject? Project { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public class PortalNotification
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public PortalUser? User { get; set; }
    public string? ProjectId { get; set; }
    public PortalProject? Project { get; set; }
    public string Text { get; set; } = "";
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class EmailOtp
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Purpose { get; set; } = "";
    public string? UserId { get; set; }
    public string CodeHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public string? DraftJson { get; set; }
}
