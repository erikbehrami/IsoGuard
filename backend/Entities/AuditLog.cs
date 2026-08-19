using System.Text.Json;
using System.Net;

namespace IsoGuard.Api.Entities;

public sealed class AuditLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Profile? User { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public IPAddress? IpAddress { get; set; }
    public JsonDocument Metadata { get; set; } = JsonDocument.Parse("{}");
    public DateTimeOffset CreatedAt { get; set; }
}
