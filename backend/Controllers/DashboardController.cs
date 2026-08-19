using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api"), Authorize(Policy = "ActiveUser")]
public sealed class DashboardController(IDashboardService service) : ControllerBase
{
    [HttpGet("admin/dashboard"), Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Admin(CancellationToken ct) =>
        Ok(await service.GetAdminAsync(ct));

    [HttpGet("user/dashboard")]
    public async Task<IActionResult> UserDashboard(CancellationToken ct) =>
        Ok(await service.GetUserAsync(User.AuthUserId(), ct));
}
