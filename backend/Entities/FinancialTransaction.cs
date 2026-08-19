namespace IsoGuard.Api.Entities;

public sealed class FinancialTransaction
{
    public Guid Id { get; set; }
    public required string ReferenceNumber { get; set; }
    public Guid SourceAccountId { get; set; }
    public Account SourceAccount { get; set; } = null!;
    public Guid? DestinationAccountId { get; set; }
    public Account? DestinationAccount { get; set; }
    public Guid PerformedById { get; set; }
    public Profile PerformedBy { get; set; } = null!;
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal SourceBalanceBefore { get; set; }
    public decimal SourceBalanceAfter { get; set; }
    public decimal? DestinationBalanceBefore { get; set; }
    public decimal? DestinationBalanceAfter { get; set; }
    public TransactionStatus Status { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public AnomalyResult? AnomalyResult { get; set; }
}
