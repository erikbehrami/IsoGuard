using System.ComponentModel.DataAnnotations;
using IsoGuard.Api.Entities;

namespace IsoGuard.Api.DTOs;

public sealed record CreateAccountRequest(
    Guid OwnerId,
    [RegularExpression("^(EUR|USD|GBP)$")] string Currency = "EUR");

public sealed record UpdateAccountStatusRequest(AccountStatus Status);

public sealed record AccountDto(
    Guid Id,
    string AccountNumber,
    Guid OwnerId,
    string OwnerName,
    decimal Balance,
    string Currency,
    AccountStatus Status,
    DateTimeOffset CreatedAt);
