using System.ComponentModel.DataAnnotations;

namespace IsoGuard.Api.DTOs.Transactions;

public sealed record DepositRequest(
    Guid AccountId,
    [Range(typeof(decimal), "0.01", "9999999999999.99")] decimal Amount,
    [MaxLength(500)] string? Description);

public sealed record WithdrawalRequest(
    Guid AccountId,
    [Range(typeof(decimal), "0.01", "9999999999999.99")] decimal Amount,
    [MaxLength(500)] string? Description);

public sealed record TransferRequest(
    Guid SourceAccountId,
    Guid DestinationAccountId,
    [Range(typeof(decimal), "0.01", "9999999999999.99")] decimal Amount,        
    [MaxLength(500)] string? Description);

public sealed record TransactionResponse(
    Guid Id,
    string ReferenceNumber,
    string Type,
    decimal Amount,
    string Status,
    DateTimeOffset CreatedAt);
