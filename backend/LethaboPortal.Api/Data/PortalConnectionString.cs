using Microsoft.Data.SqlClient;

namespace LethaboPortal.Api.Data;

public static class PortalConnectionString
{
    public const string Name = "Portal";

    public static string From(IConfiguration configuration)
    {
        var configured = configuration.GetConnectionString(Name);
        if (string.IsNullOrWhiteSpace(configured))
            throw new InvalidOperationException("Connection string 'Portal' is missing.");

        if (configured.Contains("Password=", StringComparison.OrdinalIgnoreCase))
            return configured;

        var password = configuration["PortalDb:Password"];
        if (string.IsNullOrWhiteSpace(password))
            return configured;

        var builder = new SqlConnectionStringBuilder(configured) { Password = password };
        return builder.ConnectionString;
    }

    public static bool HasPassword(string connectionString) =>
        connectionString.Contains("Password=", StringComparison.OrdinalIgnoreCase);
}
