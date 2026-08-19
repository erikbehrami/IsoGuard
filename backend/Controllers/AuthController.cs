using IsoGuard.Api.DTOs;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/auth")]
public sealed class AuthController(
    IAuthEmailService authEmail,
    IConfiguration configuration,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("forgot-password"), AllowAnonymous, EnableRateLimiting("PasswordRecovery")]
    public async Task<IActionResult> ForgotPassword(
        ForgotPasswordRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var origin = configuration["Frontend:Origin"] ?? "http://localhost:5173";
        try
        {
            await authEmail.SendPasswordRecoveryAsync(
                email,
                $"{origin.TrimEnd('/')}/reset-password",
                $"{origin.TrimEnd('/')}/accept-invite",
                ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Password recovery delivery failed.");
        }

        return Accepted(new
        {
            message = "If an account exists for that email address, a reset link has been sent."
        });
    }
}
