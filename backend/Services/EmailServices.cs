using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using System.Text.Encodings.Web;
using IsoGuard.Api.Exceptions;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Repositories;

namespace IsoGuard.Api.Services;

public interface ITransactionalEmailSender
{
    Task SendAsync(
        string to, string subject, string html, string text,
        string idempotencyKey, CancellationToken ct);
}

public sealed class ResendEmailSender(
    HttpClient http,
    IConfiguration configuration,
    ILogger<ResendEmailSender> logger) : ITransactionalEmailSender
{
    public async Task SendAsync(
        string to, string subject, string html, string text,
        string idempotencyKey, CancellationToken ct)
    {
        var apiKey = configuration["Email:ApiKey"]
            ?? throw new InvalidOperationException("Email:ApiKey is required.");
        var fromAddress = configuration["Email:FromAddress"]
            ?? throw new InvalidOperationException("Email:FromAddress is required.");
        var fromName = configuration["Email:FromName"] ?? "IsoGuard";

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.TryAddWithoutValidation("Idempotency-Key", idempotencyKey);
        request.Content = JsonContent.Create(new
        {
            from = $"{fromName} <{fromAddress}>",
            to = new[] { to },
            subject,
            html,
            text
        });
        using var response = await http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (response.IsSuccessStatusCode) return;

        logger.LogError("Resend delivery failed with {StatusCode}: {Response}",
            (int)response.StatusCode, body);
        throw new DependencyException("Transactional email delivery failed.");
    }
}

public sealed class SmtpEmailSender(
    IConfiguration configuration,
    ILogger<SmtpEmailSender> logger) : ITransactionalEmailSender
{
    public async Task SendAsync(
        string to, string subject, string html, string text,
        string idempotencyKey, CancellationToken ct)
    {
        var host = Required("Email:SmtpHost");
        var username = Required("Email:SmtpUsername");
        var password = Required("Email:SmtpPassword").Replace(" ", "");
        var fromAddress = configuration["Email:FromAddress"] ?? username;
        var fromName = configuration["Email:FromName"] ?? "IsoGuard";
        var port = configuration.GetValue("Email:SmtpPort", 587);
        var enableSsl = configuration.GetValue("Email:SmtpEnableSsl", true);

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = subject
        };
        message.To.Add(new MailAddress(to));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            text,
            Encoding.UTF8,
            MediaTypeNames.Text.Plain));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            html,
            Encoding.UTF8,
            MediaTypeNames.Text.Html));
        message.Headers.Add("X-IsoGuard-Operation", idempotencyKey);

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(username, password),
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        try
        {
            await client.SendMailAsync(message, ct);
        }
        catch (SmtpException exception)
        {
            logger.LogError(
                exception,
                "SMTP delivery to {Recipient} failed with status {StatusCode}.",
                to,
                exception.StatusCode);
            throw new DependencyException("Transactional email delivery failed.");
        }
    }

    private string Required(string key)
    {
        var value = configuration[key];
        return !string.IsNullOrWhiteSpace(value)
            ? value
            : throw new InvalidOperationException($"{key} is required.");
    }
}

public interface IAuthEmailService
{
    Task<Guid?> SendInvitationAsync(
        string email,
        string role,
        string redirectTo,
        Guid operationId,
        bool deleteUserOnFailure,
        CancellationToken ct);
    Task SendPasswordRecoveryAsync(
        string email,
        string recoveryRedirectTo,
        string invitationRedirectTo,
        CancellationToken ct);
}

public sealed class AuthEmailService(
    ISupabaseAdminClient supabase,
    ITransactionalEmailSender emailSender,
    IInvitationRepository invitations,
    IUnitOfWork unitOfWork,
    ILogger<AuthEmailService> logger) : IAuthEmailService
{
    public async Task<Guid?> SendInvitationAsync(
        string email,
        string role,
        string redirectTo,
        Guid operationId,
        bool deleteUserOnFailure,
        CancellationToken ct)
    {
        var link = await supabase.GenerateActionLinkAsync(
            "invite", email, redirectTo, role, ct);
        try
        {
            await emailSender.SendAsync(
                email,
                "You have been invited to IsoGuard",
                Template(
                    "You have been invited",
                    "An IsoGuard administrator created an account invitation for you.",
                    "Accept invitation",
                    link.Url),
                $"You have been invited to IsoGuard. Accept your invitation: {link.Url}",
                $"invite-{operationId:N}",
                ct);
        }
        catch
        {
            if (deleteUserOnFailure && link.UserId is { } userId)
            {
                try
                {
                    await supabase.DeleteUserAsync(userId, CancellationToken.None);
                }
                catch (Exception cleanupError)
                {
                    logger.LogError(
                        cleanupError,
                        "Failed to remove Supabase user {UserId} after invitation delivery failure.",
                        userId);
                }
            }
            throw;
        }
        return link.UserId;
    }

    public async Task SendPasswordRecoveryAsync(
        string email,
        string recoveryRedirectTo,
        string invitationRedirectTo,
        CancellationToken ct)
    {
        var userId = await supabase.FindUserIdByEmailAsync(email, ct);
        if (userId is null) return;

        var invitation = await invitations.GetPendingByAuthIdAsync(userId.Value, ct);
        if (invitation is not null)
        {
            invitation.SupabaseUserId = await SendInvitationAsync(
                email,
                invitation.InvitedRole.ToString(),
                invitationRedirectTo,
                Guid.NewGuid(),
                false,
                ct);
            invitation.Status = InvitationStatus.PENDING;
            invitation.ExpiresAt = DateTimeOffset.UtcNow.AddHours(24);
            invitation.RevokedAt = null;
            await unitOfWork.SaveChangesAsync(ct);
            return;
        }

        var link = await supabase.GenerateActionLinkAsync(
            "recovery", email, recoveryRedirectTo, null, ct);
        await emailSender.SendAsync(
            email,
            "Reset your IsoGuard password",
            Template(
                "Reset your password",
                "We received a request to reset your IsoGuard password.",
                "Reset password",
                link.Url),
            $"Reset your IsoGuard password: {link.Url}",
            $"recovery-{Guid.NewGuid():N}",
            ct);
    }

    private static string Template(
        string heading, string message, string action, string url)
    {
        var encodedUrl = HtmlEncoder.Default.Encode(url);
        var encodedHeading = HtmlEncoder.Default.Encode(heading);
        var encodedMessage = HtmlEncoder.Default.Encode(message);
        var encodedAction = HtmlEncoder.Default.Encode(action);
        return $"""
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <meta name="color-scheme" content="light">
                <title>{encodedHeading}</title>
              </head>
              <body style="margin:0;padding:0;background:#f3f7fc;color:#172033;font-family:Arial,Helvetica,sans-serif">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f7fc">
                  <tr>
                    <td align="center" style="padding:40px 16px">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px">
                        <tr>
                          <td align="center" style="padding:0 0 24px">
                            <div style="font-size:27px;font-weight:700;letter-spacing:-0.7px;color:#172033">
                              Iso<span style="color:#087dd1">Guard</span>
                            </div>
                            <div style="padding-top:7px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#7183a4">
                              Transaction Monitoring
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="overflow:hidden;border:1px solid #dbe5f1;border-radius:14px;background:#ffffff;box-shadow:0 10px 30px rgba(28,54,83,0.08)">
                            <div style="height:5px;background:#087dd1"></div>
                            <div style="padding:36px 36px 32px">
                              <h1 style="margin:0 0 14px;font-size:25px;line-height:1.25;color:#172033">
                                {encodedHeading}
                              </h1>
                              <p style="margin:0 0 28px;font-size:16px;line-height:1.65;color:#52627a">
                                {encodedMessage}
                              </p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                  <td style="border-radius:8px;background:#087dd1">
                                    <a href="{encodedUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">
                                      {encodedAction}
                                    </a>
                                  </td>
                                </tr>
                              </table>
                              <div style="margin:30px 0 22px;border-top:1px solid #e7edf5"></div>
                              <p style="margin:0 0 8px;font-size:12px;line-height:1.55;color:#7183a4">
                                If the button does not work, copy and paste this link into your browser:
                              </p>
                              <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.55">
                                <a href="{encodedUrl}" style="color:#087dd1;text-decoration:underline">{encodedUrl}</a>
                              </p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:22px 20px 0;font-size:12px;line-height:1.6;color:#7d8da6">
                            This is an automated security message from IsoGuard.<br>
                            If you did not expect it, you can safely ignore this email.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """;
    }
}
