namespace IsoGuard.Api.DTOs.Anomalies;

public sealed record PredictionRequest(
    Guid TransactionId,
    decimal Amount,
    int TransactionType,
    int TransactionHour,
    int DayOfWeek,
    decimal TypicalAccountAmount,
    int ConfirmedNormalTransactionCount,
    int RecentTransactionCount,
    decimal DebitBalanceRatio);

public sealed record PredictionResponse(
    Guid TransactionId,
    bool IsSuspicious,
    double RawModelScore,
    double NormalizedAnomalyScore,
    string ModelName,
    string ModelVersion);
