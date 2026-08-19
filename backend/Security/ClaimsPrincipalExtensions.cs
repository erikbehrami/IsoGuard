using System.Security.Claims;
using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Security;

public static class ClaimsPrincipalExtensions
{
    public static Guid AuthUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(value, out var id)
            ? id
            : throw new UnauthorizedAccessException("JWT subject is missing.");
    }

    public static string Email(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email") ?? "";

    public static async Task<Profile> ActiveProfileAsync(
        this ClaimsPrincipal user, IsoGuardDbContext db, CancellationToken ct) =>
        await db.Profiles.SingleOrDefaultAsync(
            x => x.AuthUserId == user.AuthUserId() && x.Status == ProfileStatus.ACTIVE, ct)
        ?? throw new UnauthorizedAccessException("No active application profile was found.");
}
