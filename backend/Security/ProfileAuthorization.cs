using System.Security.Claims;
using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Security;

public sealed class ActiveProfileRequirement(UserRole? role = null) : IAuthorizationRequirement
{
    public UserRole? Role { get; } = role;
}

public sealed class ActiveProfileHandler(IsoGuardDbContext db)
    : AuthorizationHandler<ActiveProfileRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ActiveProfileRequirement requirement)
    {
        var subject = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub");
        if (!Guid.TryParse(subject, out var authId)) return;
        if (requirement.Role == UserRole.ADMIN &&
            context.User.FindFirstValue("aal") != "aal2") return;
        var allowed = await db.Profiles.AsNoTracking().AnyAsync(x =>
            x.AuthUserId == authId && x.Status == ProfileStatus.ACTIVE &&
            (requirement.Role == null || x.Role == requirement.Role));
        if (allowed) context.Succeed(requirement);
    }
}
