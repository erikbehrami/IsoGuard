namespace IsoGuard.Api.Entities;

public sealed class Profile
{
    public Guid Id { get; set; }
    public Guid AuthUserId { get; set; }
    public required string FullName { get; set; }
    public UserRole Role { get; set; }
    public ProfileStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<Account> Accounts { get; set; } = [];
}
