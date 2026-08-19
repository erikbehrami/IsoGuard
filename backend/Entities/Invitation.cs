namespace IsoGuard.Api.Entities;

public sealed class Invitation
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public Guid InvitedById { get; set; }
    public Profile InvitedBy { get; set; } = null!;
    public UserRole InvitedRole { get; set; }
    public InvitationStatus Status { get; set; }
    public Guid? SupabaseUserId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? AcceptedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
