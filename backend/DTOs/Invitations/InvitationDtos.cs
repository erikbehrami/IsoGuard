using System.ComponentModel.DataAnnotations;
using IsoGuard.Api.Entities;

namespace IsoGuard.Api.DTOs;

public sealed record CreateInvitationRequest(
    [Required, EmailAddress] string Email,
    UserRole Role);

public sealed record InvitationDto(
    Guid Id,
    string Email,
    UserRole InvitedRole,
    string InvitedBy,
    InvitationStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt);
