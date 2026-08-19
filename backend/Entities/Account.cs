namespace IsoGuard.Api.Entities;

public sealed class Account
{
    public Guid Id { get; set; }
    public required string AccountNumber { get; set; }
    public Guid OwnerId { get; set; }
    public Profile Owner { get; set; } = null!;
    public Guid CreatedById { get; set; }
    public Profile CreatedBy { get; set; } = null!;
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "EUR";
    public AccountStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
