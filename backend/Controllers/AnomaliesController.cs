using IsoGuard.Api.DTOs;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/anomalies"), Authorize(Policy = "AdminOnly")]
public sealed class AnomaliesController(IAnomalyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AnomalyDto>>> GetAll(CancellationToken ct) =>
        Ok(await service.ListAsync(ct));

    [HttpGet("{transactionId:guid}")]
    public async Task<ActionResult<AnomalyDto>> Get(
        Guid transactionId, CancellationToken ct) =>
        Ok(await service.GetAsync(transactionId, ct));

    [HttpPatch("{transactionId:guid}/review")]
    public async Task<ActionResult<AnomalyDto>> Review(
        Guid transactionId, ReviewAnomalyRequest request, CancellationToken ct) =>
        Ok(await service.ReviewAsync(User.AuthUserId(), transactionId, request, ct));
}
