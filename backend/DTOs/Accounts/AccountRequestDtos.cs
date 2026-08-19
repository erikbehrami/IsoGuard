using System.ComponentModel.DataAnnotations;
using IsoGuard.Api.Entities;

namespace IsoGuard.Api.DTOs;

public sealed record SubmitAccountRequest(
    [RegularExpression("^(EUR|USD|GBP)$")] string Currency = "EUR");

public sealed record DecideAccountRequest(
    AccountRequestStatus Decision,
    [MaxLength(500)] string? Note = null);

public sealed record AccountRequestDto(
    Guid Id,
    Guid RequestedById,
    string RequestedBy,
    string Email,
    string Currency,
    AccountRequestStatus Status,
    string? DecidedBy,
    string? DecisionNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset? DecidedAt);
