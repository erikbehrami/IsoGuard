using IsoGuard.Api.DTOs;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/accounts"), Authorize(Policy = "ActiveUser")]
public sealed class AccountsController(IAccountService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageDto<AccountDto>>> List(
        int page = 1, int pageSize = 10, AccountStatus? status = null,
        string? search = null, Guid? ownerId = null,
        CancellationToken ct = default) =>
        Ok(await service.ListAsync(User.AuthUserId(), page, pageSize, status,
            search, ownerId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AccountDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await service.GetAsync(User.AuthUserId(), id, ct));

    [HttpGet("lookup/{accountNumber}")]
    public async Task<IActionResult> Lookup(string accountNumber, CancellationToken ct) =>
        Ok(await service.LookupAsync(User.AuthUserId(), accountNumber, ct));

    [HttpPost, Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<AccountDto>> Create(
        CreateAccountRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(User.AuthUserId(), request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/status"), Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<AccountDto>> Status(
        Guid id, UpdateAccountStatusRequest request, CancellationToken ct) =>
        Ok(await service.UpdateStatusAsync(User.AuthUserId(), id, request, ct));
}
