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
        var greeting = string.IsNullOrWhiteSpace(name) ? "Hello" : $"Hello {name}";
        var page = string.IsNullOrWhiteSpace(link) ? "the portal" : link;
        var (subject, body) = purpose switch
        {
            "welcome" => (
                "Activate your Lethabo M Connect account",
                $"{greeting},\n\nYour Lethabo M Connect account is ready.\nOpen this page and choose your password:\n{page}\n\nActivation code: {code}\nThe code expires in 24 hours.\n\nLethabo M Solutions\n"),
            "reset" => (
                "Reset your Lethabo M Connect password",
                $"{greeting},\n\nA password reset was requested for your account.\nOpen this page and enter the code:\n{page}\n\nReset code: {code}\nThe code expires in 15 minutes.\nIf you did not ask for this, you can ignore the email.\n\nLethabo M Solutions\n"),
            _ => (
                "Your Lethabo M Connect sign-in code",
                $"{greeting},\n\nYour 6-digit sign-in code is {code}.\nIt expires in 10 minutes.\n\nLethabo M Solutions\n"),
        };

        await SendAsync(to, subject, body, cancellationToken);
    }

    public Task SendPaymentReminderAsync(
        string to,
        string name,
        string invoiceNumber,
        string projectName,
        string amount,
        string dueLabel,
        string? link,
        CancellationToken cancellationToken)
    {
        var greeting = string.IsNullOrWhiteSpace(name) ? "Hello" : $"Hello {name}";
        var work = string.IsNullOrWhiteSpace(projectName) ? "" : $" for {projectName}";
        var page = string.IsNullOrWhiteSpace(link) ? "the portal" : link;
        var body =
            $"{greeting},\n\n" +
            $"Invoice {invoiceNumber}{work} is waiting for payment.\n" +
            $"Amount: {amount}\n" +
            $"Due: {dueLabel}\n\n" +
            $"Please sign in and complete the payment:\n{page}\n\n" +
            "Lethabo M Solutions\n";
        return SendAsync(to, $"Payment due for invoice {invoiceNumber}", body, cancellationToken);
    }

    private async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        var host = configuration["Email:Host"] ?? "smtp.gmail.com";
        var port = int.TryParse(configuration["Email:Port"], out var parsed) ? parsed : 587;
        var user = configuration["Email:User"] ?? "";
        var password = configuration["Email:AppPassword"] ?? "";
        var fromName = configuration["Email:FromName"] ?? "Lethabo M Connect";

        using var message = new MailMessage
        {
            From = new MailAddress(user, fromName),
            Subject = subject,
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
            logger.LogWarning(ex, "Could not send portal email to {Email}.", to);
            throw;
        }
    }
}
