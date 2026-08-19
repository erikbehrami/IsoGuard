using IsoGuard.Api.DTOs;
using IsoGuard.Api.DTOs.Transactions;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Security;
using IsoGuard.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Controllers;

[ApiController, Route("api/transactions"), Authorize(Policy = "ActiveUser")]
public sealed class TransactionsController(
    TransactionService commands,
    ITransactionQueryService queries) : ControllerBase
{
    [HttpPost("deposit")]
    public async Task<ActionResult<TransactionResponse>> Deposit(
        DepositRequest request, CancellationToken ct) =>
        Ok(Map(await commands.DepositAsync(request, User.AuthUserId(), ct)));

    [HttpPost("withdrawal")]
    public async Task<ActionResult<TransactionResponse>> Withdrawal(
        WithdrawalRequest request, CancellationToken ct) =>
        Ok(Map(await commands.WithdrawAsync(request, User.AuthUserId(), ct)));

    [HttpPost("transfer")]
    public async Task<ActionResult<TransactionResponse>> Transfer(
        TransferRequest request, CancellationToken ct) =>
        Ok(Map(await commands.TransferAsync(request, User.AuthUserId(), ct)));

    [HttpGet]
    public async Task<ActionResult<PageDto<TransactionDto>>> List(
        int page = 1, int pageSize = 10, TransactionType? type = null,
        TransactionStatus? status = null, Guid? accountId = null, Guid? userId = null,
        string? search = null, DateTimeOffset? dateFrom = null, DateTimeOffset? dateTo = null,
        bool suspiciousOnly = false, CancellationToken ct = default) =>
        Ok(await queries.ListAsync(User.AuthUserId(), page, pageSize, type, status,
            accountId, userId, search, dateFrom, dateTo, suspiciousOnly, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await queries.GetAsync(User.AuthUserId(), id, ct));

    private static TransactionResponse Map(FinancialTransaction value) =>
        new(value.Id, value.ReferenceNumber, value.Type.ToString(), value.Amount,
            value.Status.ToString(), value.CreatedAt);
}
