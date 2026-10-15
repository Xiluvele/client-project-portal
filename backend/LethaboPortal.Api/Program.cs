using LethaboPortal.Api.Data;
using LethaboPortal.Api.Security;
using Microsoft.EntityFrameworkCore;

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
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});


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

    // For now, return the user's basic information.
    //
    // IMPORTANT:
    // We will add proper authentication tokens (JWT)
    // before using this as the final production
    // authentication implementation.
    return Results.Ok(new
    {
        message = "Login successful.",

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
    int Progress
);


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

public record EmailCodeRequest(
    string Email,
    string? Name,
    string Code,
    string? Purpose,
    string? Link
);