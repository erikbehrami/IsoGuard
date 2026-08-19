using System.ComponentModel.DataAnnotations;

namespace IsoGuard.Api.DTOs;

public sealed record ForgotPasswordRequest(
    [Required, EmailAddress, MaxLength(320)] string Email);
