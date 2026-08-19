using IsoGuard.Api.DTOs;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/account-requests"), Authorize(Policy = "ActiveUser")]
public sealed class AccountRequestsController(IAccountRequestService service)
    : ControllerBase
{
    [HttpGet("mine")]
    public async Task<ActionResult<PageDto<AccountRequestDto>>> Mine(
        int page = 1, int pageSize = 10, CancellationToken ct = default) =>
        Ok(await service.ListMineAsync(User.AuthUserId(), page, pageSize, ct));

    [HttpPost]
    public async Task<ActionResult<AccountRequestDto>> Submit(
        SubmitAccountRequest request, CancellationToken ct)
    {
        var result = await service.SubmitAsync(User.AuthUserId(), request, ct);
        return CreatedAtAction(nameof(Mine), result);
    }

    [HttpGet, Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<PageDto<AccountRequestDto>>> List(
        int page = 1, int pageSize = 10, AccountRequestStatus? status = null,
        string? search = null,
        CancellationToken ct = default) =>
        Ok(await service.ListAdminAsync(page, pageSize, status, search, ct));

    [HttpPatch("{id:guid}/decision"), Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<AccountRequestDto>> Decide(
        Guid id, DecideAccountRequest request, CancellationToken ct) =>
        Ok(await service.DecideAsync(User.AuthUserId(), id, request, ct));
}
