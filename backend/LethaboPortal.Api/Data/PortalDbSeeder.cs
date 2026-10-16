namespace LethaboPortal.Api.Data;

public static class PortalDbSeeder
{
    public static void Seed(PortalDbContext db)
    {
        // Accounts, clients, and developers are created by an administrator.
        // Demo people are not inserted, so they cannot hide the database records.
    }
}
