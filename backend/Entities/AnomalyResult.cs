namespace IsoGuard.Api.Entities;

public sealed class AnomalyResult
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public FinancialTransaction Transaction { get; set; } = null!;
    public bool IsSuspicious { get; set; }
    public double RawModelScore { get; set; }
    public double NormalizedAnomalyScore { get; set; }
    public required string ModelName { get; set; }
    public required string ModelVersion { get; set; }
    public DateTimeOffset AnalyzedAt { get; set; }
    public AnomalyReviewStatus ReviewStatus { get; set; } = AnomalyReviewStatus.PENDING;
    public Guid? ReviewedById { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
}
