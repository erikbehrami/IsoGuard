using IsoGuard.Api.Entities;

namespace IsoGuard.Api.DTOs;

public sealed record TransactionDto(
    Guid Id,
    string ReferenceNumber,
    Guid SourceAccountId,
    string SourceAccountNumber,
    Guid? DestinationAccountId,
    string? DestinationAccountNumber,
    string PerformedBy,
    Guid PerformedById,
    TransactionType Type,
    decimal Amount,
    string Currency,
    TransactionStatus Status,
    string Description,
    DateTimeOffset CreatedAt,
    decimal SourceBalanceBefore,
    decimal SourceBalanceAfter,
    decimal? DestinationBalanceBefore,
    decimal? DestinationBalanceAfter,
    double? NormalizedAnomalyScore,
    AnomalyReviewStatus? AnomalyReviewStatus);

public sealed record AnomalyDto(
    Guid TransactionId,
    string ReferenceNumber,
    string UserName,
    Guid AccountId,
    string AccountNumber,
    TransactionType Type,
    decimal Amount,
    string Currency,
    DateTimeOffset TransactionDate,
    bool IsSuspicious,
    double RawModelScore,
    double NormalizedAnomalyScore,
    string ModelName,
    string ModelVersion,
    DateTimeOffset AnalyzedAt,
    AnomalyReviewStatus ReviewStatus,
    DateTimeOffset? ReviewedAt);

public sealed record ReviewAnomalyRequest(AnomalyReviewStatus Decision);
