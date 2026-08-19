using IsoGuard.Api.DTOs;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api"), Authorize]
public sealed class ProfileController(IProfileService service) : ControllerBase
{
    [HttpGet("auth/me")]
    public async Task<ActionResult<ProfileDto>> Me(CancellationToken ct) =>
        Ok(await service.GetAsync(User.AuthUserId(), User.Email(), ct));

    [HttpGet("profile")]
    public async Task<ActionResult<ProfileDto>> Profile(CancellationToken ct) =>
        Ok(await service.GetAsync(User.AuthUserId(), User.Email(), ct));

    [HttpPatch("profile")]
    public async Task<ActionResult<ProfileDto>> Update(
        UpdateProfileRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAsync(User.AuthUserId(), User.Email(), request, ct));

    [HttpPost("profile/complete")]
    public async Task<ActionResult<ProfileDto>> Complete(
        CompleteProfileRequest request, CancellationToken ct) =>
        Ok(await service.CompleteAsync(User.AuthUserId(), User.Email(), request, ct));
}
