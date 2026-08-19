using IsoGuard.Api.DTOs;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/invitations"), Authorize(Policy = "AdminOnly")]
public sealed class InvitationsController(IInvitationService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageDto<InvitationDto>>> List(
        int page = 1, int pageSize = 10, CancellationToken ct = default) =>
        Ok(await service.ListAsync(page, pageSize, ct));

    [HttpPost]
    public async Task<ActionResult<InvitationDto>> Invite(
        CreateInvitationRequest request, CancellationToken ct) =>
        Ok(await service.InviteAsync(User.AuthUserId(), request, ct));

    [HttpPost("{id:guid}/resend")]
    public async Task<ActionResult<InvitationDto>> Resend(
        Guid id, CancellationToken ct) =>
        Ok(await service.ResendAsync(User.AuthUserId(), id, ct));

    [HttpPost("{id:guid}/revoke")]
    public async Task<ActionResult<InvitationDto>> Revoke(
        Guid id, CancellationToken ct) =>
        Ok(await service.RevokeAsync(User.AuthUserId(), id, ct));
}
