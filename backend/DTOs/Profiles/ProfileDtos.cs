using System.ComponentModel.DataAnnotations;
using IsoGuard.Api.Entities;

namespace IsoGuard.Api.DTOs;

public sealed record ProfileDto(
    Guid Id,
    Guid AuthUserId,
    string FullName,
    string Email,
    UserRole Role,
    ProfileStatus Status,
    bool TwoFactorEnabled,
    int AccountCount,
    DateTimeOffset CreatedAt);

public sealed record UpdateProfileRequest(
    [Required, MaxLength(150)] string FullName);

public sealed record CompleteProfileRequest(
    [Required, MaxLength(150)] string FullName);

public sealed record UpdateUserStatusRequest(ProfileStatus Status);
