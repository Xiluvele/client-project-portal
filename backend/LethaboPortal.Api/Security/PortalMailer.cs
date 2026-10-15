using System.Net;
using System.Net.Mail;

namespace LethaboPortal.Api.Security;

public sealed class PortalMailer(IConfiguration configuration, ILogger<PortalMailer> logger)
{
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(configuration["Email:User"]) &&
        !string.IsNullOrWhiteSpace(configuration["Email:AppPassword"]);

    public async Task SendCodeAsync(string to, string name, string code, string purpose, string? link, CancellationToken cancellationToken)
    {
        var host = configuration["Email:Host"] ?? "smtp.gmail.com";
        var port = int.TryParse(configuration["Email:Port"], out var parsed) ? parsed : 587;
        var user = configuration["Email:User"] ?? "";
        var password = configuration["Email:AppPassword"] ?? "";
        var fromName = configuration["Email:FromName"] ?? "Lethabo M Connect";
        var greeting = string.IsNullOrWhiteSpace(name) ? "Hello" : $"Hello {name}";
        var welcome = purpose == "welcome";
        var page = string.IsNullOrWhiteSpace(link) ? "the Activate account page on the portal" : link;
        var body = welcome
            ? $"{greeting},\n\nYour Lethabo M Connect account is ready.\nOpen this page and choose your password:\n{page}\n\nActivation code: {code}\nThe code expires in 24 hours.\n\nLethabo M Solutions\n"
            : $"{greeting},\n\nYour 6-digit sign-in code is {code}.\nIt expires in 10 minutes.\n\nLethabo M Solutions\n";

        using var message = new MailMessage
        {
            From = new MailAddress(user, fromName),
            Subject = welcome ? "Activate your Lethabo M Connect account" : "Your Lethabo M Connect sign-in code",
            Body = body,
        };
        message.To.Add(to);

#pragma warning disable SYSLIB0014
        using var client = new SmtpClient(host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(user, password),
        };
#pragma warning restore SYSLIB0014

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not email a sign-in code to {Email}.", to);
            throw;
        }
    }
}
