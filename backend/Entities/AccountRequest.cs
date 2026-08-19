namespace IsoGuard.Api.Entities;

public sealed class AccountRequest
{
    public Guid Id { get; set; }
    public Guid RequestedById { get; set; }
    public Profile RequestedBy { get; set; } = null!;
    public string Currency { get; set; } = "EUR";
    public AccountRequestStatus Status { get; set; } = AccountRequestStatus.PENDING;
    public Guid? DecidedById { get; set; }
    public Profile? DecidedBy { get; set; }
    public string? DecisionNote { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
}
