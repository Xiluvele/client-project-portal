using LethaboPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<PortalDbContext>(options =>
    options.UseSqlServer(PortalConnectionString.From(builder.Configuration), sql => sql.EnableRetryOnFailure()));

var app = builder.Build();

var connectionString = PortalConnectionString.From(app.Configuration);
if (!PortalConnectionString.HasPassword(connectionString))
{
    throw new InvalidOperationException(
        "The Azure SQL password is not configured. From backend/LethaboPortal.Api run: dotnet user-secrets set \"PortalDb:Password\" \"<password>\"");
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseHttpsRedirection();

app.MapGet("/api/health", async (PortalDbContext db, CancellationToken cancellationToken) =>
{
    try
    {
        var connected = await db.Database.CanConnectAsync(cancellationToken);
        return connected
            ? Results.Ok(new { status = "ok", database = "CientPortal" })
            : Results.Json(new { status = "unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (Exception exception)
    {
        app.Logger.LogWarning(exception, "Database health check failed.");
        return Results.Json(new { status = "unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PortalDbContext>();
    await db.Database.MigrateAsync();
    PortalDbSeeder.Seed(db);
}

app.Run();
