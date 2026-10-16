using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LethaboPortal.Api.Data;
using LethaboPortal.Api.Domain;
using LethaboPortal.Api.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);


// ============================================================
// SERVICES
// ============================================================

// Adds OpenAPI support.
// This allows API documentation to be exposed during development.
builder.Services.AddOpenApi();
builder.Services.AddSingleton<PortalMailer>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("portal", policy =>
        policy.WithOrigins("http://localhost:5173","http://localhost:5174", "http://127.0.0.1:5173", "https://client-project-portal-a28c.onrender.com")
            .AllowAnyHeader()
            .AllowAnyMethod());
});


// ============================================================
// JWT AUTHENTICATION
// ============================================================
// Store Jwt:Key in user-secrets locally and Jwt__Key in Azure.
// Never put the real signing key in source control.
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "JWT signing key is not configured or is too short. " +
        "Use at least 32 characters. Run: " +
        "dotnet user-secrets set \"Jwt:Key\" \"<strong-random-key>\"");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "LethaboPortal.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "LethaboPortal.Clients";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();


// Register PortalDbContext with dependency injection.
//
// The API uses SQL Server and gets its connection string
// through PortalConnectionString.
//
// EnableRetryOnFailure helps when Azure SQL experiences
// temporary/transient connection problems.
builder.Services.AddDbContext<PortalDbContext>(options =>
    options.UseSqlServer(
        PortalConnectionString.From(builder.Configuration),
        sql => sql.EnableRetryOnFailure()
    ));

var app = builder.Build();


// ============================================================
// DATABASE CONNECTION VALIDATION
// ============================================================

// Build the database connection string using appsettings.json
// together with the configured database password.
var connectionString =
    PortalConnectionString.From(app.Configuration);


// Do not allow the API to start if the database password
// has not been configured.
if (!PortalConnectionString.HasPassword(connectionString))
{
    throw new InvalidOperationException(
        "The Azure SQL password is not configured. " +
        "From backend/LethaboPortal.Api run: " +
        "dotnet user-secrets set \"PortalDb:Password\" \"<password>\"");
}

// ============================================================
// OPENAPI
// ============================================================

// OpenAPI is currently only exposed during local development.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


// ============================================================
// HTTPS
// ============================================================

// Redirect HTTP requests to HTTPS when HTTPS is available.
app.UseHttpsRedirection();
app.UseCors("portal");
app.UseAuthentication();
app.UseAuthorization();


// ============================================================
// HEALTH CHECK
// ============================================================
// GET: /api/health
//
// Checks whether the API can connect successfully to
// the CientPortal Azure SQL database.
// ============================================================

app.MapGet("/api/health", async (
    PortalDbContext db,
    CancellationToken cancellationToken) =>
{
    try
    {
        var connected = await db.Database
            .CanConnectAsync(cancellationToken);

        return connected
            ? Results.Ok(new
            {
                status = "ok",
                database = "CientPortal"
            })
            : Results.Json(
                new
                {
                    status = "unavailable"
                },
                statusCode:
                    StatusCodes.Status503ServiceUnavailable
            );
    }
    catch (Exception exception)
    {
        // Write database connection problems to the application log.
        app.Logger.LogWarning(
            exception,
            "Database health check failed."
        );

        return Results.Json(
            new
            {
                status = "unavailable"
            },
            statusCode:
                StatusCodes.Status503ServiceUnavailable
        );
    }
});


// ============================================================
// PROJECTS
// ============================================================


// ------------------------------------------------------------
// GET: /api/projects
// ------------------------------------------------------------
//
// Returns all projects stored in the database.
//
// Client information is included so that the website and
// mobile application can display which client owns a project.
// ------------------------------------------------------------

app.MapGet("/api/projects", async (PortalDbContext db) =>
{
    var projects = await db.Projects
        .AsNoTracking()
        .Include(p => p.Client)
        .Select(p => new
        {
            p.Id,

            p.ClientId,

            // Include the client's name with the project.
            ClientName = p.Client != null
                ? p.Client.Name
                : "",

            p.Name,
            p.Service,
            p.Description,
            p.Status,
            p.Stage,
            p.StartedLabel,
            p.DueLabel,
            p.DueThisWeek,
            p.Progress
        })
        .ToListAsync();

    return Results.Ok(projects);
});


// ------------------------------------------------------------
// POST: /api/projects
// ------------------------------------------------------------
//
// Creates a new project.
//
// The React website will eventually use this endpoint when
// a Project Manager creates a project.
//
// Flutter can then retrieve the same project through
// GET /api/projects.
// ------------------------------------------------------------

app.MapPost("/api/projects", async (
    CreateProjectRequest request,
    PortalDbContext db) =>
{
    // --------------------------------------------------------
    // Check that the selected client exists
    // --------------------------------------------------------

    // Every project must belong to a valid client.
    var clientExists = await db.Clients
        .AnyAsync(c => c.Id == request.ClientId);

    if (!clientExists)
    {
        return Results.BadRequest(new
        {
            message = "The selected client does not exist."
        });
    }


    // --------------------------------------------------------
    // Create the new project
    // --------------------------------------------------------

    var project =
        new LethaboPortal.Api.Domain.PortalProject
        {
            // Generate a unique project ID.
            Id = Guid.NewGuid().ToString(),

            ClientId = request.ClientId,
            Name = request.Name,
            Service = request.Service,
            Description = request.Description,
            Status = request.Status,
            Stage = request.Stage,
            StartedLabel = request.StartedLabel,
            DueLabel = request.DueLabel,
            DueThisWeek = request.DueThisWeek,
            Progress = request.Progress
        };


    // --------------------------------------------------------
    // Save project to Azure SQL
    // --------------------------------------------------------

    db.Projects.Add(project);

    if (request.MemberIds != null)
    {
        foreach (var memberId in request.MemberIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct())
        {
            var member = await db.TeamMembers.FirstOrDefaultAsync(item => item.Id == memberId);
            if (member == null) continue;
            db.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = project.Id,
                MemberId = member.Id
            });
            member.Allocated = true;
        }
    }

    var clientUsers = await db.Users
        .Where(user => user.ClientId == project.ClientId && user.Active)
        .ToListAsync();

    foreach (var clientUser in clientUsers)
    {
        db.Notifications.Add(new PortalNotification
        {
            Id = Guid.NewGuid().ToString(),
            UserId = clientUser.Id,
            ProjectId = project.Id,
            Text = $"{project.Name} is now visible on your account.",
            Read = false,
            CreatedAt = DateTime.UtcNow
        });
    }

    await db.SaveChangesAsync();


    // --------------------------------------------------------
    // Return HTTP 201 Created
    // --------------------------------------------------------

    return Results.Created(
        $"/api/projects/{project.Id}",
        new
        {
            project.Id,
            project.ClientId,
            project.Name,
            project.Service,
            project.Description,
            project.Status,
            project.Stage,
            project.StartedLabel,
            project.DueLabel,
            project.DueThisWeek,
            project.Progress
        }
    );
});

app.MapGet("/api/projects/{id}", async (string id, PortalDbContext db) =>
    await ProjectWorkspace(db, id));

app.MapGet("/api/team-members", async (PortalDbContext db) =>
{
    var members = await db.TeamMembers
        .AsNoTracking()
        .OrderBy(member => member.Name)
        .Select(member => new
        {
            member.Id,
            member.Name,
            member.ShortName,
            member.Role,
            member.Initials,
            member.Allocated
        })
        .ToListAsync();

    return Results.Ok(members);
});

app.MapGet("/api/notifications", async (ClaimsPrincipal principal, PortalDbContext db) =>
{
    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

    var items = await db.Notifications
        .AsNoTracking()
        .Where(item => item.UserId == userId)
        .OrderByDescending(item => item.CreatedAt)
        .Take(30)
        .Select(item => new
        {
            item.Id,
            item.Text,
            item.Read,
            item.CreatedAt,
            item.ProjectId
        })
        .ToListAsync();

    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/notifications/{id}/read", async (
    string id,
    ClaimsPrincipal principal,
    PortalDbContext db) =>
{
    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    var notice = await db.Notifications.FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId);
    if (notice == null) return Results.NotFound(new { message = "Notification not found." });
    notice.Read = true;
    await db.SaveChangesAsync();
    return Results.Ok(new { notice.Id, notice.Read });
}).RequireAuthorization();

app.MapPost("/api/projects/{projectId}/tasks/{taskId}/assign", async (
    string projectId,
    string taskId,
    AssignTaskRequest request,
    PortalDbContext db) =>
{
    var project = await db.Projects.Include(item => item.Tasks).FirstOrDefaultAsync(item => item.Id == projectId);
    var task = project?.Tasks.FirstOrDefault(item => item.Id == taskId);
    if (project == null || task == null) return Results.NotFound(new { message = "Task not found." });

    var member = await db.TeamMembers.FirstOrDefaultAsync(item => item.Id == request.AssigneeId);
    if (member == null)
    {
        var developer = await db.Users.FirstOrDefaultAsync(item => item.Id == request.AssigneeId);
        if (!string.IsNullOrWhiteSpace(developer?.MemberId))
            member = await db.TeamMembers.FirstOrDefaultAsync(item => item.Id == developer.MemberId);
    }

    if (member == null) return Results.BadRequest(new { message = "Choose a developer." });

    task.AssigneeId = member.Id;
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/tasks/{taskId}/approve", async (
    string projectId,
    string taskId,
    PortalDbContext db) =>
{
    var project = await db.Projects.Include(item => item.Tasks).FirstOrDefaultAsync(item => item.Id == projectId);
    var task = project?.Tasks.FirstOrDefault(item => item.Id == taskId);
    if (project == null || task == null) return Results.NotFound(new { message = "Task not found." });
    task.Status = "done";
    project.Progress = WorkProgress(project.Tasks);
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/tasks/{taskId}/remind", async (
    string projectId,
    string taskId,
    PortalDbContext db) =>
{
    var project = await db.Projects.Include(item => item.Tasks).FirstOrDefaultAsync(item => item.Id == projectId);
    var task = project?.Tasks.FirstOrDefault(item => item.Id == taskId);
    if (project == null || task == null) return Results.NotFound(new { message = "Task not found." });

    var recipients = await db.Users
        .Where(user => user.ClientId == project.ClientId && user.Active)
        .ToListAsync();

    if (recipients.Count == 0)
        return Results.BadRequest(new { message = "This client has no portal login to notify." });

    foreach (var recipient in recipients)
    {
        db.Notifications.Add(new PortalNotification
        {
            Id = Guid.NewGuid().ToString(),
            UserId = recipient.Id,
            ProjectId = project.Id,
            Text = $"Please review \"{task.Title}\" on {project.Name}.",
            Read = false,
            CreatedAt = DateTime.UtcNow
        });
    }

    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/tasks", async (
    string projectId,
    NewTaskRequest request,
    PortalDbContext db) =>
{
    var project = await db.Projects.Include(item => item.Tasks).FirstOrDefaultAsync(item => item.Id == projectId);
    if (project == null) return Results.NotFound(new { message = "Project not found." });
    if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest(new { message = "Enter a task title." });

    project.Tasks.Add(new WorkItem
    {
        Id = Guid.NewGuid().ToString(),
        ProjectId = project.Id,
        Title = request.Title.Trim(),
        Type = "task",
        Status = "backlog",
        DueLabel = ""
    });
    project.Progress = WorkProgress(project.Tasks);
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/comments", async (
    string projectId,
    NewCommentRequest request,
    ClaimsPrincipal principal,
    PortalDbContext db) =>
{
    var exists = await db.Projects.AnyAsync(item => item.Id == projectId);
    if (!exists) return Results.NotFound(new { message = "Project not found." });
    if (string.IsNullOrWhiteSpace(request.Body)) return Results.BadRequest(new { message = "Write a message first." });

    var name = principal.FindFirstValue(ClaimTypes.Name) ?? "Project manager";
    db.ProjectComments.Add(new ProjectComment
    {
        Id = Guid.NewGuid().ToString(),
        ProjectId = projectId,
        AuthorName = name,
        Initials = PersonInitials(name),
        Role = principal.FindFirstValue(ClaimTypes.Role) ?? "manager",
        Body = request.Body.Trim(),
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/files", async (
    string projectId,
    NewFileRequest request,
    ClaimsPrincipal principal,
    PortalDbContext db) =>
{
    var exists = await db.Projects.AnyAsync(item => item.Id == projectId);
    if (!exists) return Results.NotFound(new { message = "Project not found." });
    if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { message = "Enter a file name." });

    db.ProjectFiles.Add(new ProjectFile
    {
        Id = Guid.NewGuid().ToString(),
        ProjectId = projectId,
        Name = request.Name.Trim(),
        Kind = "file",
        UploadedBy = principal.FindFirstValue(ClaimTypes.Name) ?? "Project manager",
        CreatedAt = DateTime.UtcNow,
        Approval = "pending",
        Version = 1
    });
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/requirements", async (
    string projectId,
    NewRequirementRequest request,
    PortalDbContext db) =>
{
    var exists = await db.Projects.AnyAsync(item => item.Id == projectId);
    if (!exists) return Results.NotFound(new { message = "Project not found." });
    if (string.IsNullOrWhiteSpace(request.Text)) return Results.BadRequest(new { message = "Enter what was agreed." });

    db.Requirements.Add(new Requirement
    {
        Id = Guid.NewGuid().ToString(),
        ProjectId = projectId,
        Text = request.Text.Trim(),
        Status = "recorded"
    });
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/change-requests/{requestId}", async (
    string projectId,
    string requestId,
    DecideRequest request,
    PortalDbContext db) =>
{
    var change = await db.ChangeRequests.FirstOrDefaultAsync(item => item.Id == requestId && item.ProjectId == projectId);
    if (change == null) return Results.NotFound(new { message = "Change request not found." });
    if (request.Status is not ("approved" or "rejected"))
        return Results.BadRequest(new { message = "Choose approve or reject." });

    change.Status = request.Status;
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/milestones", async (
    string projectId,
    NewMilestoneRequest request,
    PortalDbContext db) =>
{
    var exists = await db.Projects.AnyAsync(item => item.Id == projectId);
    if (!exists) return Results.NotFound(new { message = "Project not found." });
    if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest(new { message = "Enter a milestone name." });
    if (string.IsNullOrWhiteSpace(request.TargetLabel)) return Results.BadRequest(new { message = "Enter a target date." });

    db.Milestones.Add(new Milestone
    {
        Id = Guid.NewGuid().ToString(),
        ProjectId = projectId,
        Name = request.Name.Trim(),
        TargetLabel = request.TargetLabel.Trim(),
        Status = "planned"
    });
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/milestones/{milestoneId}/complete", async (
    string projectId,
    string milestoneId,
    PortalDbContext db) =>
{
    var milestone = await db.Milestones.FirstOrDefaultAsync(item => item.Id == milestoneId && item.ProjectId == projectId);
    if (milestone == null) return Results.NotFound(new { message = "Milestone not found." });
    milestone.Status = "complete";
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));

app.MapPost("/api/projects/{projectId}/invoices", async (
    string projectId,
    NewInvoiceRequest request,
    PortalDbContext db) =>
{
    var project = await db.Projects.FirstOrDefaultAsync(item => item.Id == projectId);
    if (project == null) return Results.NotFound(new { message = "Project not found." });
    if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest(new { message = "Enter an invoice title." });
    if (request.Amount <= 0) return Results.BadRequest(new { message = "Enter an amount." });

    var invoice = new Invoice
    {
        Id = Guid.NewGuid().ToString(),
        Number = $"INV-{DateTime.UtcNow:yyMMddHHmmss}",
        ClientId = project.ClientId,
        ProjectId = project.Id,
        Title = request.Title.Trim(),
        Status = "pending",
        IssuedLabel = ShortDate(DateTime.UtcNow),
        DueLabel = string.IsNullOrWhiteSpace(request.DueLabel) ? ShortDate(DateTime.UtcNow.AddDays(14)) : request.DueLabel.Trim()
    };
    invoice.Lines.Add(new InvoiceLine
    {
        Id = Guid.NewGuid().ToString(),
        Description = invoice.Title,
        Amount = request.Amount
    });
    db.Invoices.Add(invoice);
    await db.SaveChangesAsync();
    return await ProjectWorkspace(db, projectId);
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));


// ============================================================
// CLIENTS
// ============================================================


// ------------------------------------------------------------
// GET: /api/clients
// ------------------------------------------------------------
//
// Returns the clients stored in the database.
//
// This will allow a Project Manager to select an existing
// client when creating a project.
// ------------------------------------------------------------

app.MapGet("/api/clients", async (PortalDbContext db) =>
{
    var clients = await db.Clients
        .AsNoTracking()
        .Select(c => new
        {
            c.Id,
            c.Name,
            c.Contact,
            c.Email
        })
        .ToListAsync();

    return Results.Ok(clients);
});


// ============================================================
// AUTHENTICATION
// ============================================================


// ------------------------------------------------------------
// POST: /api/auth/login
// ------------------------------------------------------------
//
// Receives an email address and password.
//
// The password entered by the user is NOT compared directly
// with the PasswordHash stored in the database.
//
// PasswordHasher.Verify() calculates the PBKDF2 hash and
// securely verifies the supplied password.
// ------------------------------------------------------------

app.MapPost("/api/auth/login", async (
    LoginRequest request,
    PortalDbContext db) =>
{
    // --------------------------------------------------------
    // Basic input validation
    // --------------------------------------------------------

    if (string.IsNullOrWhiteSpace(request.Email) ||
        string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new
        {
            message = "Email address and password are required."
        });
    }


    // --------------------------------------------------------
    // Find user
    // --------------------------------------------------------

    // Remove unnecessary spaces from the email.
    var email = request.Email.Trim();

    // Find the user by email address.
    //
    // AsNoTracking is used because login does not need to
    // modify the user at this stage.
    var user = await db.Users
        .AsNoTracking()
        .FirstOrDefaultAsync(
            u => u.Email.ToLower() == email.ToLower()
        );


    // --------------------------------------------------------
    // Verify email and password
    // --------------------------------------------------------

    // Use the same response when the email does not exist
    // or the password is incorrect.
    //
    // This avoids revealing which email addresses are
    // registered in the system.
    if (user == null ||
        !PasswordHasher.Verify(
            request.Password,
            user.PasswordHash
        ))
    {
        await RecordAudit(db, "Unknown", email, "signin_failed", "signins", email, null, CancellationToken.None);
        return Results.Json(
            new
            {
                message =
                    "Invalid email address or password."
            },
            statusCode:
                StatusCodes.Status401Unauthorized
        );
    }


    // --------------------------------------------------------
    // Check account status
    // --------------------------------------------------------

    // Do not allow inactive accounts to sign in.
    if (!user.Active)
    {
        return Results.Json(
            new
            {
                message =
                    "This account is inactive."
            },
            statusCode:
                StatusCodes.Status403Forbidden
        );
    }


    if (!user.Activated)
    {
        return Results.Json(
            new
            {
                message =
                    "This account is not active yet. Open Activate account and choose a password."
            },
            statusCode:
                StatusCodes.Status403Forbidden
        );
    }


    // Do not allow locked accounts to sign in.
    if (user.Locked)
    {
        return Results.Json(
            new
            {
                message =
                    "This account is locked."
            },
            statusCode:
                StatusCodes.Status403Forbidden
        );
    }


    // --------------------------------------------------------
    // Successful login
    // --------------------------------------------------------

    // Create a signed JWT for this authenticated user.
    // The user's role is included so protected endpoints can
    // enforce Administrator/Manager/Developer/Client permissions.
    var expiresAt = DateTime.UtcNow.AddHours(8);

    var token = CreateJwtToken(
        user,
        jwtKey,
        jwtIssuer,
        jwtAudience,
        expiresAt);

    await RecordAudit(db, user.Name, user.Email, "signin", "signins", user.Email, null, CancellationToken.None);

    return Results.Ok(new
    {
        message = "Login successful.",
        token,
        expiresAt,

        user = new
        {
            user.Id,
            user.Name,
            user.Email,
            user.Role,
            user.ClientId,
            user.MemberId,
            user.Title
        }
    });
});


// ------------------------------------------------------------
// POST: /api/auth/email-code
// ------------------------------------------------------------
// Sends the 6-digit sign-in code through Gmail SMTP.
// The mailbox address and app password stay in user secrets.
app.MapPost("/api/auth/email-code", async (
    EmailCodeRequest request,
    PortalMailer mailer,
    CancellationToken cancellationToken) =>
{
    var email = request.Email?.Trim() ?? "";
    var code = request.Code?.Trim() ?? "";
    if (string.IsNullOrWhiteSpace(email) || !email.Contains('@') || code.Length != 6 || !code.All(char.IsDigit))
    {
        return Results.BadRequest(new
        {
            sent = false,
            message = "A valid email and 6-digit code are required."
        });
    }

    if (!mailer.IsConfigured)
    {
        return Results.Ok(new
        {
            sent = false,
            message = "Gmail is not connected on the API, so the code was not emailed."
        });
    }

    try
    {
        await mailer.SendCodeAsync(
            email,
            request.Name?.Trim() ?? "",
            code,
            request.Purpose ?? "login",
            request.Link,
            cancellationToken);
        return Results.Ok(new { sent = true, message = "" });
    }
    catch (Exception)
    {
        return Results.Ok(new
        {
            sent = false,
            message = "Gmail rejected the message. Check the app password."
        });
    }
});


// ------------------------------------------------------------
// POST: /api/invoices/payment-reminder
// ------------------------------------------------------------
// Uses the same Gmail mailbox as account activation. A manager
// asks the API to email the client that a sent invoice is due.
app.MapPost("/api/invoices/payment-reminder", async (
    PaymentReminderRequest request,
    PortalMailer mailer,
    CancellationToken cancellationToken) =>
{
    var email = request.Email?.Trim() ?? "";
    var number = request.InvoiceNumber?.Trim() ?? "";
    if (!email.Contains('@') || string.IsNullOrWhiteSpace(number))
    {
        return Results.BadRequest(new { sent = false, message = "A client email and invoice number are required." });
    }

    if (!mailer.IsConfigured)
    {
        return Results.Ok(new
        {
            sent = false,
            message = "Gmail is not connected on the API, so the reminder was not emailed."
        });
    }

    try
    {
        await mailer.SendPaymentReminderAsync(
            email,
            request.Name?.Trim() ?? "",
            number,
            request.ProjectName?.Trim() ?? "",
            request.Amount?.Trim() ?? "",
            request.DueLabel?.Trim() ?? "",
            request.Link,
            cancellationToken);
        return Results.Ok(new { sent = true, message = "" });
    }
    catch (Exception)
    {
        return Results.Ok(new
        {
            sent = false,
            message = "Gmail rejected the message. Check the app password."
        });
    }
}).RequireAuthorization(policy => policy.RequireRole("manager", "administrator"));


// ------------------------------------------------------------
// POST: /api/auth/forgot-password
// ------------------------------------------------------------
// Sends a short-lived code to an active account. The response
// stays the same when the email is unknown, so the page does
// not reveal which addresses are registered.
app.MapPost("/api/auth/forgot-password", async (
    ForgotPasswordRequest request,
    PortalDbContext db,
    PortalMailer mailer,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    var email = request.Email?.Trim().ToLowerInvariant() ?? "";
    if (!email.Contains('@'))
    {
        return Results.BadRequest(new { ok = false, message = "Enter a valid email address." });
    }

    var sent = Results.Ok(new
    {
        ok = true,
        message = "If that email belongs to an active account, a reset code has been sent."
    });

    var user = await db.Users.FirstOrDefaultAsync(item => item.Email.ToLower() == email, cancellationToken);
    if (user == null || !user.Active || !user.Activated)
    {
        return sent;
    }

    var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
    user.ActivationCodeHash = PasswordHasher.Hash(code);
    user.ActivationExpires = DateTime.UtcNow.AddMinutes(15);
    user.ActivationAttempts = 0;
    await db.SaveChangesAsync(cancellationToken);

    if (!mailer.IsConfigured)
    {
        return sent;
    }

    try
    {
        await mailer.SendCodeAsync(email, user.Name, code, "reset", ResetLink(configuration), cancellationToken);
    }
    catch (Exception)
    {
        // The caller still receives the same response.
    }

    return sent;
});


// ------------------------------------------------------------
// POST: /api/auth/reset-password
// ------------------------------------------------------------
app.MapPost("/api/auth/reset-password", async (
    ResetPasswordRequest request,
    PortalDbContext db,
    CancellationToken cancellationToken) =>
{
    var email = request.Email?.Trim().ToLowerInvariant() ?? "";
    var code = request.Code?.Trim() ?? "";
    var password = request.Password ?? "";
    if (!email.Contains('@') || code.Length != 6 || password.Length < 8)
    {
        return Results.BadRequest(new { ok = false, message = "Enter the email, the 6-digit code, and a password of at least 8 characters." });
    }

    var user = await db.Users.FirstOrDefaultAsync(item => item.Email.ToLower() == email, cancellationToken);
    if (user == null || !user.Active || !user.Activated)
    {
        return Results.Json(new { ok = false, message = "That code does not match the email." }, statusCode: StatusCodes.Status400BadRequest);
    }

    if (user.ActivationExpires is null || user.ActivationExpires < DateTime.UtcNow || string.IsNullOrWhiteSpace(user.ActivationCodeHash))
    {
        return Results.Json(new { ok = false, message = "That code has expired. Request a new one." }, statusCode: StatusCodes.Status400BadRequest);
    }

    if (!PasswordHasher.Verify(code, user.ActivationCodeHash))
    {
        user.ActivationAttempts += 1;
        if (user.ActivationAttempts >= 3)
        {
            user.ActivationCodeHash = null;
            user.ActivationExpires = null;
        }

        await db.SaveChangesAsync(cancellationToken);
        var message = user.ActivationCodeHash == null
            ? "Too many incorrect codes. Request a new one."
            : "That code does not match the email. Try again.";
        return Results.Json(new { ok = false, message }, statusCode: StatusCodes.Status400BadRequest);
    }

    user.PasswordHash = PasswordHasher.Hash(password);
    user.ActivationCodeHash = null;
    user.ActivationExpires = null;
    user.ActivationAttempts = 0;
    user.FailedAttempts = 0;
    user.Locked = false;
    await db.SaveChangesAsync(cancellationToken);
    await RecordAudit(db, user.Name, user.Email, "password_reset", "accounts", user.Email, null, cancellationToken);

    return Results.Ok(new { ok = true, message = "Your password has been updated. Sign in with the new password." });
});


// ------------------------------------------------------------
// POST: /api/accounts
// ------------------------------------------------------------
// Saves a new person in the shared database and emails an
// activation code. The account cannot sign in until they
// choose a password.
app.MapGet("/api/audit", async (
    string? category,
    PortalDbContext db,
    CancellationToken cancellationToken) =>
{
    var query = db.AuditEvents.AsNoTracking().AsQueryable();
    if (category is "signins" or "accounts")
    {
        query = query.Where(item => item.Category == category);
    }

    var events = await query
        .OrderByDescending(item => item.CreatedAt)
        .Take(100)
        .ToListAsync(cancellationToken);

    return Results.Ok(events.Select(item => new
    {
        id = item.Id,
        at = DateTime.SpecifyKind(item.CreatedAt, DateTimeKind.Utc),
        actor = item.ActorName,
        email = item.ActorEmail,
        type = item.EventType,
        category = item.Category,
        target = item.Target,
        detail = item.Detail
    }));
}).RequireAuthorization(policy => policy.RequireRole("administrator"));


app.MapPost("/api/accounts", async (
    CreateAccountRequest request,
    ClaimsPrincipal principal,
    PortalDbContext db,
    PortalMailer mailer,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    var name = request.Name?.Trim() ?? "";
    var email = request.Email?.Trim().ToLowerInvariant() ?? "";
    var role = request.Role?.Trim().ToLowerInvariant() ?? "";
    var roles = new[] { "administrator", "manager", "developer", "client" };
    if (name.Length < 2 || !email.Contains('@') || !roles.Contains(role))
    {
        return Results.BadRequest(new { ok = false, message = "Name, a valid email, and a role are required." });
    }

    var company = request.Company?.Trim() ?? "";
    if (role == "client" && company.Length == 0)
    {
        return Results.BadRequest(new { ok = false, message = "A client account needs a company name." });
    }

    var taken = await db.Users.AnyAsync(item => item.Email.ToLower() == email, cancellationToken);
    if (taken)
    {
        return Results.Json(new { ok = false, message = "Another user already has this email." }, statusCode: StatusCodes.Status409Conflict);
    }

    string? clientId = null;
    if (role == "client")
    {
        clientId = NewId("client");
        db.Clients.Add(new ClientAccount
        {
            Id = clientId,
            Name = company,
            Contact = name,
            Email = email,
        });
    }

    var userId = NewId("user");
    var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
    var user = new PortalUser
    {
        Id = userId,
        Name = name,
        Email = email,
        PasswordHash = "",
        Role = role,
        ClientId = clientId,
        MemberId = role == "developer" ? userId : null,
        Title = role == "client" ? company : RoleTitle(role),
        Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
        Active = true,
        Activated = false,
        ActivationCodeHash = PasswordHasher.Hash(code),
        ActivationExpires = DateTime.UtcNow.AddHours(24),
        ActivationAttempts = 0,
    };
    db.Users.Add(user);
    await db.SaveChangesAsync(cancellationToken);
    await RecordAudit(
        db,
        principal.FindFirstValue(ClaimTypes.Name) ?? "Administrator",
        principal.FindFirstValue(ClaimTypes.Email),
        "user_added",
        "accounts",
        name,
        role,
        cancellationToken);

    var emailed = false;
    var message = "";
    if (mailer.IsConfigured)
    {
        try
        {
            await mailer.SendCodeAsync(email, name, code, "welcome", ActivationLink(configuration, request.Link), cancellationToken);
            emailed = true;
        }
        catch (Exception)
        {
            message = "The account was saved, but Gmail did not send the code.";
        }
    }
    else
    {
        message = "Gmail is not connected, so the code was not emailed.";
    }

    return Results.Ok(new
    {
        ok = true,
        emailed,
        previewCode = emailed ? null : code,
        message,
        user = new { user.Id, user.Name, user.Email, user.Role, user.ClientId, user.MemberId, user.Title, user.Phone }
    });
})
.RequireAuthorization(policy => policy.RequireRole("administrator"));


// ------------------------------------------------------------
// POST: /api/accounts/activate
// ------------------------------------------------------------
app.MapPost("/api/accounts/activate", async (
    ActivateAccountRequest request,
    PortalDbContext db,
    CancellationToken cancellationToken) =>
{
    var email = request.Email?.Trim().ToLowerInvariant() ?? "";
    var code = request.Code?.Trim() ?? "";
    var password = request.Password ?? "";
    if (!email.Contains('@') || code.Length != 6 || password.Length < 8)
    {
        return Results.BadRequest(new { ok = false, message = "Enter the email, the 6-digit code, and a password of at least 8 characters." });
    }

    var user = await db.Users.FirstOrDefaultAsync(item => item.Email.ToLower() == email, cancellationToken);
    if (user == null)
    {
        return Results.Json(
            new { ok = false, message = "No account was found for that email. Ask an administrator to add it again, then use the new email." },
            statusCode: StatusCodes.Status404NotFound);
    }

    if (!user.Active)
    {
        return Results.Json(new { ok = false, message = "This account has been deactivated. Contact an administrator." }, statusCode: StatusCodes.Status403Forbidden);
    }

    if (user.Activated)
    {
        return Results.Json(new { ok = false, message = "This account already has a password. Sign in instead." }, statusCode: StatusCodes.Status409Conflict);
    }

    if (user.ActivationExpires is null || user.ActivationExpires < DateTime.UtcNow || string.IsNullOrWhiteSpace(user.ActivationCodeHash))
    {
        return Results.Json(new { ok = false, message = "That code has expired. Ask an administrator to add the account again." }, statusCode: StatusCodes.Status400BadRequest);
    }

    if (!PasswordHasher.Verify(code, user.ActivationCodeHash))
    {
        user.ActivationAttempts += 1;
        if (user.ActivationAttempts >= 3)
        {
            user.ActivationCodeHash = null;
            user.ActivationExpires = null;
        }
        await db.SaveChangesAsync(cancellationToken);
        return Results.Json(
            new { ok = false, message = user.ActivationCodeHash == null ? "Too many incorrect codes. Ask an administrator to add the account again." : "That code does not match the email. Try again." },
            statusCode: StatusCodes.Status400BadRequest);
    }

    user.PasswordHash = PasswordHasher.Hash(password);
    user.Activated = true;
    user.ActivationCodeHash = null;
    user.ActivationExpires = null;
    user.ActivationAttempts = 0;
    user.FailedAttempts = 0;
    user.Locked = false;
    await db.SaveChangesAsync(cancellationToken);
    await RecordAudit(db, user.Name, user.Email, "account_ready", "accounts", user.Email, null, cancellationToken);

    return Results.Ok(new
    {
        ok = true,
        user = new { user.Id, user.Name, user.Email, user.Role, user.ClientId, user.MemberId, user.Title, user.Phone }
    });
});


// ============================================================
// DATABASE MIGRATIONS AND SEEDING
// ============================================================

// Create a dependency injection scope so PortalDbContext
// can be accessed during application startup.
await using (var scope =
    app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider
        .GetRequiredService<PortalDbContext>();


    // Apply pending Entity Framework Core migrations.
    await db.Database.MigrateAsync();


    // Add initial/seed data when required.
    PortalDbSeeder.Seed(db);
}


// ============================================================
// START APPLICATION
// ============================================================

app.Run();

static string CreateJwtToken(
    PortalUser user,
    string jwtKey,
    string issuer,
    string audience,
    DateTime expiresAt)
{
    var claims = new List<Claim>
    {
        new(JwtRegisteredClaimNames.Sub, user.Id),
        new(JwtRegisteredClaimNames.Email, user.Email),
        new(ClaimTypes.NameIdentifier, user.Id),
        new(ClaimTypes.Name, user.Name),
        new(ClaimTypes.Email, user.Email),
        new(ClaimTypes.Role, user.Role)
    };

    if (!string.IsNullOrWhiteSpace(user.ClientId))
    {
        claims.Add(new Claim("clientId", user.ClientId));
    }

    if (!string.IsNullOrWhiteSpace(user.MemberId))
    {
        claims.Add(new Claim("memberId", user.MemberId));
    }

    var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(jwtKey));

    var credentials = new SigningCredentials(
        key,
        SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: issuer,
        audience: audience,
        claims: claims,
        notBefore: DateTime.UtcNow,
        expires: expiresAt,
        signingCredentials: credentials);

    return new JwtSecurityTokenHandler().WriteToken(token);
}

static string NewId(string prefix) => $"{prefix}-{Guid.NewGuid().ToString("N")[..10]}";

static async Task RecordAudit(
    PortalDbContext db,
    string actorName,
    string? actorEmail,
    string eventType,
    string category,
    string target,
    string? detail,
    CancellationToken cancellationToken)
{
    db.AuditEvents.Add(new AuditEvent
    {
        Id = NewId("audit"),
        ActorName = actorName,
        ActorEmail = actorEmail,
        EventType = eventType,
        Category = category,
        Target = target,
        Detail = detail,
        CreatedAt = DateTime.UtcNow,
    });
    await db.SaveChangesAsync(cancellationToken);
}

static string ActivationLink(IConfiguration configuration, string? link)
{
    var hosted = (configuration["Portal:PublicUrl"] ?? "https://client-project-portal-a28c.onrender.com").TrimEnd('/');
    if (string.IsNullOrWhiteSpace(link) ||
        link.Contains("localhost", StringComparison.OrdinalIgnoreCase) ||
        link.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        return $"{hosted}/activate";
    }

    return link;
}

static string ResetLink(IConfiguration configuration)
{
    var hosted = (configuration["Portal:PublicUrl"] ?? "https://client-project-portal-a28c.onrender.com").TrimEnd('/');
    return $"{hosted}/forgot-password";
}

static string RoleTitle(string role) => role switch
{
    "administrator" => "Administrator",
    "manager" => "Project Manager",
    "developer" => "Developer",
    _ => "Client",
};

static string ShortDate(DateTime date) => date.ToString("dd MMM", CultureInfo.InvariantCulture);

static string PersonInitials(string name)
{
    var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
    return string.Concat(parts.Take(2).Select(part => char.ToUpperInvariant(part[0])));
}

static int WorkProgress(IEnumerable<WorkItem> tasks)
{
    var list = tasks.ToList();
    if (list.Count == 0) return 0;
    double total = 0;
    foreach (var task in list)
    {
        total += task.Status switch
        {
            "backlog" => 0.08,
            "in_progress" => 0.55,
            "in_review" => 0.82,
            "done" => 1,
            _ => 0
        };
    }

    return (int)Math.Round(total / list.Count * 100);
}

static async Task<IResult> ProjectWorkspace(PortalDbContext db, string id)
{
    var project = await db.Projects
        .AsNoTracking()
        .Include(item => item.Client)
        .Include(item => item.Milestones)
        .Include(item => item.Tasks)
        .Include(item => item.Files)
        .Include(item => item.Comments)
        .Include(item => item.Members)
        .ThenInclude(item => item.Member)
        .FirstOrDefaultAsync(item => item.Id == id);

    if (project == null) return Results.NotFound(new { message = "Project not found." });

    var developers = await db.Users
        .AsNoTracking()
        .Where(user => user.Role == "developer" && user.Active)
        .OrderBy(user => user.Name)
        .Select(user => new { user.Id, user.Name, user.MemberId })
        .ToListAsync();

    var invoices = await db.Invoices
        .AsNoTracking()
        .Include(item => item.Lines)
        .Where(item => item.ProjectId == id)
        .ToListAsync();

    var changes = await db.ChangeRequests
        .AsNoTracking()
        .Where(item => item.ProjectId == id)
        .OrderByDescending(item => item.CreatedAt)
        .ToListAsync();

    var requirements = await db.Requirements
        .AsNoTracking()
        .Where(item => item.ProjectId == id)
        .ToListAsync();

    return Results.Ok(new
    {
        project.Id,
        project.ClientId,
        ClientName = project.Client != null ? project.Client.Name : "",
        project.Name,
        project.Service,
        project.Description,
        project.Status,
        project.Stage,
        project.StartedLabel,
        project.DueLabel,
        project.DueThisWeek,
        project.Progress,
        Milestones = project.Milestones.Select(item => new { item.Id, item.Name, item.TargetLabel, item.Status }),
        Tasks = project.Tasks.Select(item => new { item.Id, item.Title, item.Description, item.Type, item.Status, item.AssigneeId, item.DueLabel, item.Overdue }),
        Files = project.Files.OrderByDescending(item => item.CreatedAt).Select(item => new { item.Id, item.Name, item.Kind, item.UploadedBy, item.CreatedAt, item.Approval }),
        Comments = project.Comments.OrderBy(item => item.CreatedAt).Select(item => new { item.Id, item.AuthorName, item.Initials, item.Role, item.Body, item.CreatedAt }),
        Invoices = invoices.Select(item => new
        {
            item.Id,
            item.Number,
            item.Title,
            item.Status,
            item.IssuedLabel,
            item.DueLabel,
            Total = item.Lines.Sum(line => line.Amount)
        }),
        ChangeRequests = changes.Select(item => new { item.Id, item.Description, item.Status }),
        Requirements = requirements.Select(item => new { item.Id, item.Text, item.Status }),
        Members = project.Members
            .Where(item => item.Member != null)
            .Select(item => new { item.Member!.Id, item.Member.Name, item.Member.ShortName, item.Member.Role, item.Member.Initials }),
        Developers = developers
    });
}

// ============================================================
// REQUEST MODELS
// ============================================================


// ------------------------------------------------------------
// CREATE PROJECT REQUEST
// ------------------------------------------------------------
//
// Represents the JSON that the React website/mobile app
// sends when creating a project through:
//
// POST /api/projects
//
// The project ID is intentionally NOT supplied by the client.
// The API generates it.
// ------------------------------------------------------------

public record CreateProjectRequest(
    string ClientId,
    string Name,
    string Service,
    string Description,
    string Status,
    string Stage,
    string StartedLabel,
    string DueLabel,
    bool DueThisWeek,
    int Progress,
    string[]? MemberIds = null
);

public record AssignTaskRequest(string? AssigneeId);
public record NewTaskRequest(string? Title);
public record NewCommentRequest(string? Body);
public record NewFileRequest(string? Name);
public record NewRequirementRequest(string? Text);
public record DecideRequest(string? Status);
public record NewMilestoneRequest(string? Name, string? TargetLabel);
public record NewInvoiceRequest(string? Title, decimal Amount, string? DueLabel);


// ------------------------------------------------------------
// LOGIN REQUEST
// ------------------------------------------------------------
//
// Represents the JSON sent by Flutter or React when a
// user attempts to sign in through:
//
// POST /api/auth/login
// ------------------------------------------------------------

public record LoginRequest(
    string Email,
    string Password
);

public record PaymentReminderRequest(
    string Email,
    string? Name,
    string InvoiceNumber,
    string? ProjectName,
    string? Amount,
    string? DueLabel,
    string? Link
);

public record EmailCodeRequest(
    string Email,
    string? Name,
    string Code,
    string? Purpose,
    string? Link
);

public record CreateAccountRequest(
    string Name,
    string Email,
    string Role,
    string? Phone,
    string? Company,
    string? Link
);

public record ActivateAccountRequest(
    string Email,
    string Code,
    string Password
);

public record ForgotPasswordRequest(
    string Email
);

public record ResetPasswordRequest(
    string Email,
    string Code,
    string Password
);