using IsoGuard.Api.DTOs;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/users"), Authorize(Policy = "AdminOnly")]
public sealed class UsersController(IUserService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageDto<ProfileDto>>> List(
        int page = 1, int pageSize = 10, string? search = null,
        UserRole? role = null, ProfileStatus? status = null,
        CancellationToken ct = default) =>
        Ok(await service.ListAsync(page, pageSize, search, role, status, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProfileDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await service.GetAsync(id, ct));

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ProfileDto>> Status(
        Guid id, UpdateUserStatusRequest request, CancellationToken ct) =>
        Ok(await service.UpdateStatusAsync(User.AuthUserId(), id, request, ct));
}
