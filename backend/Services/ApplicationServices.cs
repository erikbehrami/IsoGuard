using System.Security.Cryptography;
using System.Text.Json;
using IsoGuard.Api.DTOs;
using IsoGuard.Api.Entities;
using IsoGuard.Api.Exceptions;
using IsoGuard.Api.Repositories;

namespace IsoGuard.Api.Services;

internal static class ApplicationRules
{
    public static (int Page, int PageSize) Page(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    public static int TotalPages(int total, int pageSize) =>
        Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
}

internal static class DtoMapper
{
    public static ProfileDto Profile(Profile p, string email, bool twoFactorEnabled = false) =>
        new(p.Id, p.AuthUserId, p.FullName, email, p.Role, p.Status, twoFactorEnabled,
            p.Accounts.Count, p.CreatedAt);

    public static AccountDto Account(Account x) =>
        new(x.Id, x.AccountNumber, x.OwnerId, x.Owner.FullName, x.Balance,
            x.Currency, x.Status, x.CreatedAt);

    public static InvitationDto Invitation(Invitation x) =>
        new(x.Id, x.Email, x.InvitedRole, x.InvitedBy.FullName, x.Status,
            x.CreatedAt, x.ExpiresAt);

    public static TransactionDto Transaction(
        FinancialTransaction x, bool includeDestinationBalances = true) =>
        new(x.Id, x.ReferenceNumber, x.SourceAccountId, x.SourceAccount.AccountNumber,
            x.DestinationAccountId, x.DestinationAccount?.AccountNumber,
            x.PerformedBy.FullName, x.PerformedById, x.Type, x.Amount,
            x.SourceAccount.Currency, x.Status, x.Description ?? "", x.CreatedAt,
            x.SourceBalanceBefore, x.SourceBalanceAfter,
            includeDestinationBalances ? x.DestinationBalanceBefore : null,
            includeDestinationBalances ? x.DestinationBalanceAfter : null,
            x.AnomalyResult?.NormalizedAnomalyScore,
            x.AnomalyResult?.ReviewStatus);

    public static AnomalyDto Anomaly(AnomalyResult x) =>
        new(x.TransactionId, x.Transaction.ReferenceNumber, x.Transaction.PerformedBy.FullName,
            x.Transaction.SourceAccountId, x.Transaction.SourceAccount.AccountNumber,
            x.Transaction.Type, x.Transaction.Amount,
            x.Transaction.SourceAccount.Currency, x.Transaction.CreatedAt, x.IsSuspicious,
            x.RawModelScore, x.NormalizedAnomalyScore, x.ModelName, x.ModelVersion, x.AnalyzedAt,
            x.ReviewStatus, x.ReviewedAt);
}

public interface IAuditService
{
    void Record(Guid? actorId, string action, string entityType, Guid? entityId,
        object? metadata = null);
}

public sealed class AuditService(IAuditRepository repository) : IAuditService
{
    public void Record(Guid? actorId, string action, string entityType, Guid? entityId,
        object? metadata = null)
    {
        repository.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = actorId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Metadata = JsonSerializer.SerializeToDocument(metadata ?? new { })
        });
    }
}

public interface IProfileService
{
    Task<ProfileDto> GetAsync(Guid authId, string email, CancellationToken ct);
    Task<ProfileDto> UpdateAsync(
        Guid authId, string email, UpdateProfileRequest request, CancellationToken ct);
    Task<ProfileDto> CompleteAsync(
        Guid authId, string email, CompleteProfileRequest request, CancellationToken ct);
}

public sealed class ProfileService(
    IProfileRepository profiles,
    IInvitationRepository invitations,
    IUnitOfWork unitOfWork,
    IAuditService audit) : IProfileService
{
    public async Task<ProfileDto> GetAsync(Guid authId, string email, CancellationToken ct)
    {
        var profile = await profiles.GetByAuthIdAsync(authId, true, ct)
            ?? throw new AuthenticationException("No application profile was found.");
        if (profile.Status == ProfileStatus.BLOCKED)
            throw new ForbiddenException(
                "Your account has been blocked. Contact an administrator for assistance.");
        if (profile.Status != ProfileStatus.ACTIVE)
            throw new ForbiddenException(
                "Your account is not active. Contact an administrator for assistance.");
        return DtoMapper.Profile(profile, email);
    }

    public async Task<ProfileDto> UpdateAsync(
        Guid authId, string email, UpdateProfileRequest request, CancellationToken ct)
    {
        var profile = await profiles.GetActiveByAuthIdAsync(authId, true, ct)
            ?? throw new AuthenticationException("No active application profile was found.");
        profile.FullName = NormalizeName(request.FullName);
        audit.Record(profile.Id, "PROFILE_UPDATED", nameof(Profile), profile.Id);
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Profile(profile, email);
    }

    public async Task<ProfileDto> CompleteAsync(
        Guid authId, string email, CompleteProfileRequest request, CancellationToken ct)
    {
        var profile = await profiles.GetByAuthIdAsync(authId, false, ct);
        if (profile is null)
        {
            var invitation = await invitations.GetPendingByAuthIdAsync(authId, ct)
                ?? throw new AuthenticationException("A valid invitation was not found.");
            if (invitation.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                invitation.Status = InvitationStatus.EXPIRED;
                await unitOfWork.SaveChangesAsync(ct);
                throw new AuthenticationException("The invitation has expired.");
            }
            profile = new Profile
            {
                Id = Guid.NewGuid(),
                AuthUserId = authId,
                FullName = NormalizeName(request.FullName),
                Role = invitation.InvitedRole,
                Status = ProfileStatus.ACTIVE
            };
            invitation.Status = InvitationStatus.ACCEPTED;
            invitation.AcceptedAt = DateTimeOffset.UtcNow;
            profiles.Add(profile);
        }
        else
        {
            profile.FullName = NormalizeName(request.FullName);
            profile.Status = ProfileStatus.ACTIVE;
        }
        audit.Record(profile.Id, "PROFILE_COMPLETED", nameof(Profile), profile.Id);
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Profile(profile, email);
    }

    private static string NormalizeName(string value)
    {
        var name = value.Trim();
        if (name.Length == 0) throw new BadRequestException("Full name is required.");
        return name;
    }
}

public interface IUserService
{
    Task<PageDto<ProfileDto>> ListAsync(
        int page, int pageSize, string? search, UserRole? role,
        ProfileStatus? status, CancellationToken ct);
    Task<ProfileDto> GetAsync(Guid id, CancellationToken ct);
    Task<ProfileDto> UpdateStatusAsync(
        Guid actorId, Guid id, UpdateUserStatusRequest request, CancellationToken ct);
}

public sealed class UserService(
    IProfileRepository profiles,
    IInvitationRepository invitations,
    ISupabaseAdminClient supabase,
    IUnitOfWork unitOfWork,
    IAuditService audit) : IUserService
{
    public async Task<PageDto<ProfileDto>> ListAsync(
        int page, int pageSize, string? search, UserRole? role,
        ProfileStatus? status, CancellationToken ct)
    {
        (page, pageSize) = ApplicationRules.Page(page, pageSize);
        var (rows, total) = await profiles.ListAsync(
            new ProfileQuery(page, pageSize, search, role, status), ct);
        var authUsers = await supabase.GetUsersAsync(rows.Select(x => x.AuthUserId), ct);
        var emails = await invitations.GetEmailsAsync(rows.Select(x => x.AuthUserId), ct);
        return new PageDto<ProfileDto>(
            rows.Select(x =>
            {
                authUsers.TryGetValue(x.AuthUserId, out var authUser);
                return DtoMapper.Profile(
                    x,
                    authUser?.Email ?? emails.GetValueOrDefault(x.AuthUserId, ""),
                    authUser?.TwoFactorEnabled ?? false);
            }).ToList(),
            page, pageSize, total, ApplicationRules.TotalPages(total, pageSize));
    }

    public async Task<ProfileDto> GetAsync(Guid id, CancellationToken ct)
    {
        var row = await profiles.GetByIdAsync(id, true, ct)
            ?? throw new NotFoundException("User not found.");
        var authUsers = await supabase.GetUsersAsync([row.AuthUserId], ct);
        var emails = await invitations.GetEmailsAsync([row.AuthUserId], ct);
        authUsers.TryGetValue(row.AuthUserId, out var authUser);
        return DtoMapper.Profile(
            row,
            authUser?.Email ?? emails.GetValueOrDefault(row.AuthUserId, ""),
            authUser?.TwoFactorEnabled ?? false);
    }

    public async Task<ProfileDto> UpdateStatusAsync(
        Guid actorAuthId, Guid id, UpdateUserStatusRequest request, CancellationToken ct)
    {
        var actor = await profiles.GetActiveByAuthIdAsync(actorAuthId, false, ct)
            ?? throw new AuthenticationException("No active application profile was found.");
        if (request.Status == ProfileStatus.INACTIVE)
            throw new BadRequestException("Administrators may activate or block users.");
        if (actor.Id == id && request.Status == ProfileStatus.BLOCKED)
            throw new BadRequestException("Administrators cannot block their own account.");
        var row = await profiles.GetByIdAsync(id, true, ct)
            ?? throw new NotFoundException("User not found.");
        row.Status = request.Status;
        audit.Record(actor.Id, "USER_STATUS_CHANGED", nameof(Profile), row.Id,
            new { status = request.Status.ToString() });
        await unitOfWork.SaveChangesAsync(ct);
        var authUsers = await supabase.GetUsersAsync([row.AuthUserId], ct);
        var emails = await invitations.GetEmailsAsync([row.AuthUserId], ct);
        authUsers.TryGetValue(row.AuthUserId, out var authUser);
        return DtoMapper.Profile(
            row,
            authUser?.Email ?? emails.GetValueOrDefault(row.AuthUserId, ""),
            authUser?.TwoFactorEnabled ?? false);
    }
}

public interface IAccountService
{
    Task<PageDto<AccountDto>> ListAsync(
        Guid authId, int page, int pageSize, AccountStatus? status,
        string? search, Guid? ownerId, CancellationToken ct);
    Task<AccountDto> GetAsync(Guid authId, Guid id, CancellationToken ct);
    Task<object> LookupAsync(Guid authId, string accountNumber, CancellationToken ct);
    Task<AccountDto> CreateAsync(
        Guid authId, CreateAccountRequest request, CancellationToken ct);
    Task<AccountDto> UpdateStatusAsync(
        Guid authId, Guid id, UpdateAccountStatusRequest request, CancellationToken ct);
}

public sealed class AccountService(
    IAccountRepository accounts,
    IProfileRepository profiles,
    IUnitOfWork unitOfWork,
    IAuditService audit) : IAccountService
{
    public async Task<PageDto<AccountDto>> ListAsync(
        Guid authId, int page, int pageSize, AccountStatus? status,
        string? search, Guid? ownerId, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        (page, pageSize) = ApplicationRules.Page(page, pageSize);
        var (rows, total) = await accounts.ListAsync(
            new AccountQuery(page, pageSize, status, search, ownerId),
            actor.Role == UserRole.ADMIN ? null : actor.Id, ct);
        return new PageDto<AccountDto>(rows.Select(DtoMapper.Account).ToList(),
            page, pageSize, total, ApplicationRules.TotalPages(total, pageSize));
    }

    public async Task<AccountDto> GetAsync(Guid authId, Guid id, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        var row = await accounts.GetByIdAsync(id, false, ct)
            ?? throw new NotFoundException("Account not found.");
        if (actor.Role != UserRole.ADMIN && row.OwnerId != actor.Id)
            throw new ForbiddenException("You cannot access this account.");
        return DtoMapper.Account(row);
    }

    public async Task<object> LookupAsync(
        Guid authId, string accountNumber, CancellationToken ct)
    {
        _ = await ActiveActor(authId, ct);
        var row = await accounts.FindActiveByNumberAsync(accountNumber.Trim(), ct)
            ?? throw new NotFoundException("Account not found.");
        return new { row.Id, row.AccountNumber };
    }

    public async Task<AccountDto> CreateAsync(
        Guid authId, CreateAccountRequest request, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        var currency = request.Currency.Trim().ToUpperInvariant();
        var owner = await profiles.GetByIdAsync(request.OwnerId, false, ct)
            ?? throw new NotFoundException("Owner not found.");
        if (owner.Role != UserRole.USER)
            throw new BadRequestException("Financial accounts can only be assigned to regular users.");
        if (owner.Status != ProfileStatus.ACTIVE)
            throw new ConflictException("Accounts can only be created for active users.");
        if (await accounts.HasOpenCurrencyAsync(owner.Id, currency, ct))
            throw new ConflictException(
                $"The user already has a non-closed {currency} account.");
        var row = new Account
        {
            Id = Guid.NewGuid(),
            AccountNumber = GenerateAccountNumber(),
            OwnerId = owner.Id,
            Owner = owner,
            CreatedById = actor.Id,
            Currency = currency,
            Balance = 0,
            Status = AccountStatus.ACTIVE
        };
        accounts.Add(row);
        audit.Record(actor.Id, "ACCOUNT_CREATED", nameof(Account), row.Id,
            new { row.OwnerId, row.Currency });
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Account(row);
    }

    public async Task<AccountDto> UpdateStatusAsync(
        Guid authId, Guid id, UpdateAccountStatusRequest request, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        var row = await accounts.GetByIdAsync(id, true, ct)
            ?? throw new NotFoundException("Account not found.");
        if (row.Status == AccountStatus.CLOSED &&
            request.Status != AccountStatus.CLOSED &&
            await accounts.HasOpenCurrencyAsync(
                row.OwnerId, row.Currency, ct, row.Id))
            throw new ConflictException(
                $"The user already has a non-closed {row.Currency} account.");
        row.Status = request.Status;
        audit.Record(actor.Id, "ACCOUNT_STATUS_CHANGED", nameof(Account), row.Id,
            new { status = request.Status.ToString() });
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Account(row);
    }

    private async Task<Profile> ActiveActor(Guid authId, CancellationToken ct) =>
        await profiles.GetActiveByAuthIdAsync(authId, false, ct)
        ?? throw new AuthenticationException("No active application profile was found.");

    private static string GenerateAccountNumber()
    {
        var suffix = RandomNumberGenerator.GetInt32(100_000_000, 999_999_999);
        return $"IG{DateTime.UtcNow:yyMMdd}{suffix:D9}";
    }
}

public interface IInvitationService
{
    Task<PageDto<InvitationDto>> ListAsync(int page, int pageSize, CancellationToken ct);
    Task<InvitationDto> InviteAsync(
        Guid authId, CreateInvitationRequest request, CancellationToken ct);
    Task<InvitationDto> ResendAsync(Guid authId, Guid id, CancellationToken ct);
    Task<InvitationDto> RevokeAsync(Guid authId, Guid id, CancellationToken ct);
}

public sealed class InvitationService(
    IInvitationRepository invitations,
    IProfileRepository profiles,
    ISupabaseAdminClient supabase,
    IAuthEmailService authEmail,
    IConfiguration configuration,
    IUnitOfWork unitOfWork,
    IAuditService audit) : IInvitationService
{
    public async Task<PageDto<InvitationDto>> ListAsync(
        int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = ApplicationRules.Page(page, pageSize);
        var (rows, total) = await invitations.ListAsync(page, pageSize, ct);
        return new PageDto<InvitationDto>(rows.Select(DtoMapper.Invitation).ToList(),
            page, pageSize, total, ApplicationRules.TotalPages(total, pageSize));
    }

    public async Task<InvitationDto> InviteAsync(
        Guid authId, CreateInvitationRequest request, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        if (request.Role != UserRole.USER)
            throw new BadRequestException(
                "Only regular users can be invited. The administrator account is fixed.");
        var email = NormalizeEmail(request.Email);
        if (await invitations.HasPendingAsync(email, ct))
            throw new ConflictException("A pending invitation already exists.");
        if (await supabase.FindUserIdByEmailAsync(email, ct) is not null)
            throw new ConflictException("A Supabase authentication user already exists.");

        var invitationId = Guid.NewGuid();
        var authUserId = await SendAsync(email, request.Role, invitationId, true, ct)
            ?? throw new ConflictException("Supabase did not return an invited user ID.");
        var row = new Invitation
        {
            Id = invitationId,
            Email = email,
            InvitedById = actor.Id,
            InvitedBy = actor,
            InvitedRole = request.Role,
            Status = InvitationStatus.PENDING,
            SupabaseUserId = authUserId,
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(24)
        };
        invitations.Add(row);
        audit.Record(actor.Id, "USER_INVITED", nameof(Invitation), row.Id,
            new { email, role = request.Role.ToString() });
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch
        {
            // The Auth user and email link were created outside the database transaction.
            // Remove that orphan so the administrator can safely retry the invitation.
            await supabase.DeleteUserAsync(authUserId, CancellationToken.None);
            throw;
        }
        return DtoMapper.Invitation(row);
    }

    public async Task<InvitationDto> ResendAsync(
        Guid authId, Guid id, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        var row = await GetAsync(id, ct);
        if (row.Status is not (
                InvitationStatus.PENDING or
                InvitationStatus.EXPIRED or
                InvitationStatus.REVOKED))
            throw new ConflictException(
                "Pending, expired or revoked invitations can be resent.");
        row.SupabaseUserId = await SendAsync(
            row.Email, row.InvitedRole, Guid.NewGuid(), false, ct);
        row.Status = InvitationStatus.PENDING;
        row.ExpiresAt = DateTimeOffset.UtcNow.AddHours(24);
        row.RevokedAt = null;
        audit.Record(actor.Id, "INVITATION_RESENT", nameof(Invitation), row.Id);
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Invitation(row);
    }

    public async Task<InvitationDto> RevokeAsync(
        Guid authId, Guid id, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        var row = await GetAsync(id, ct);
        if (row.Status != InvitationStatus.PENDING)
            throw new ConflictException("Only pending invitations can be revoked.");
        row.Status = InvitationStatus.REVOKED;
        row.RevokedAt = DateTimeOffset.UtcNow;
        audit.Record(actor.Id, "INVITATION_REVOKED", nameof(Invitation), row.Id);
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Invitation(row);
    }

    private async Task<Profile> ActiveActor(Guid authId, CancellationToken ct) =>
        await profiles.GetActiveByAuthIdAsync(authId, false, ct)
        ?? throw new AuthenticationException("No active application profile was found.");

    private async Task<Invitation> GetAsync(Guid id, CancellationToken ct) =>
        await invitations.GetByIdAsync(id, ct)
        ?? throw new NotFoundException("Invitation not found.");

    private Task<Guid?> SendAsync(
        string email,
        UserRole role,
        Guid operationId,
        bool deleteUserOnFailure,
        CancellationToken ct)
    {
        var origin = configuration["Frontend:Origin"] ?? "http://localhost:5173";
        return authEmail.SendInvitationAsync(email, role.ToString(),
            $"{origin.TrimEnd('/')}/accept-invite",
            operationId,
            deleteUserOnFailure,
            ct);
    }

    private static string NormalizeEmail(string value) => value.Trim().ToLowerInvariant();
}

public interface IDashboardService
{
    Task<object> GetAdminAsync(CancellationToken ct);
    Task<object> GetUserAsync(Guid authId, CancellationToken ct);
}

public sealed class DashboardService(
    IDashboardRepository dashboard,
    IProfileRepository profiles,
    IAccountRepository accounts) : IDashboardService
{
    public async Task<object> GetAdminAsync(CancellationToken ct)
    {
        var x = await dashboard.GetAdminSnapshotAsync(ct);
        return new
        {
            totalUsers = x.TotalUsers,
            activeUsers = x.ActiveUsers,
            blockedUsers = x.BlockedUsers,
            pendingInvitations = x.PendingInvitations,
            usersWithoutAccounts = x.UsersWithoutAccounts,
            totalAccounts = x.TotalAccounts,
            activeAccounts = x.ActiveAccounts,
            totalTransactions = x.TotalTransactions,
            suspiciousTransactions = x.SuspiciousTransactions
        };
    }

    public async Task<object> GetUserAsync(Guid authId, CancellationToken ct)
    {
        var actor = await profiles.GetActiveByAuthIdAsync(authId, false, ct)
            ?? throw new AuthenticationException("No active application profile was found.");
        var rows = await accounts.ListByOwnerAsync(actor.Id, ct);
        return new
        {
            fullName = actor.FullName,
            totalBalance = rows.Where(x => x.Status == AccountStatus.ACTIVE).Sum(x => x.Balance),
            currency = rows.FirstOrDefault()?.Currency ?? "EUR",
            accounts = rows.Select(x => new
                { x.Id, x.AccountNumber, x.Balance, x.Currency, x.Status })
        };
    }
}

public interface IAnomalyService
{
    Task<IReadOnlyList<AnomalyDto>> ListAsync(CancellationToken ct);
    Task<AnomalyDto> GetAsync(Guid transactionId, CancellationToken ct);
    Task<AnomalyDto> ReviewAsync(
        Guid authId, Guid transactionId, ReviewAnomalyRequest request, CancellationToken ct);
}

public sealed class AnomalyService(
    IAnomalyRepository anomalies,
    IProfileRepository profiles,
    IUnitOfWork unitOfWork,
    IAuditService audit) : IAnomalyService
{
    public async Task<IReadOnlyList<AnomalyDto>> ListAsync(CancellationToken ct) =>
        (await anomalies.ListSuspiciousAsync(ct)).Select(DtoMapper.Anomaly).ToList();

    public async Task<AnomalyDto> GetAsync(Guid transactionId, CancellationToken ct)
    {
        var row = await anomalies.GetByTransactionIdAsync(transactionId, ct)
            ?? throw new NotFoundException("Anomaly result not found.");
        return DtoMapper.Anomaly(row);
    }

    public async Task<AnomalyDto> ReviewAsync(
        Guid authId, Guid transactionId, ReviewAnomalyRequest request, CancellationToken ct)
    {
        if (request.Decision == AnomalyReviewStatus.PENDING)
            throw new BadRequestException("A final review decision is required.");

        var actor = await profiles.GetActiveByAuthIdAsync(authId, false, ct)
            ?? throw new AuthenticationException("No active administrator profile was found.");
        var row = await anomalies.GetByTransactionIdAsync(transactionId, true, ct)
            ?? throw new NotFoundException("Anomaly result not found.");

        row.ReviewStatus = request.Decision;
        row.ReviewedById = actor.Id;
        row.ReviewedAt = DateTimeOffset.UtcNow;
        row.IsSuspicious = request.Decision == AnomalyReviewStatus.CONFIRMED_SUSPICIOUS;

        if (row.IsSuspicious && row.Transaction.SourceAccount.Status != AccountStatus.CLOSED)
            row.Transaction.SourceAccount.Status = AccountStatus.BLOCKED;

        audit.Record(actor.Id, "ANOMALY_REVIEWED", nameof(AnomalyResult), row.Id,
            new { decision = request.Decision.ToString(), row.Transaction.SourceAccountId });
        await unitOfWork.SaveChangesAsync(ct);
        return DtoMapper.Anomaly(row);
    }
}

public interface ITransactionQueryService
{
    Task<PageDto<TransactionDto>> ListAsync(
        Guid authId, int page, int pageSize, TransactionType? type,
        TransactionStatus? status, Guid? accountId, Guid? userId, string? search,
        DateTimeOffset? dateFrom, DateTimeOffset? dateTo, bool suspiciousOnly,
        CancellationToken ct);
    Task<TransactionDto> GetAsync(Guid authId, Guid id, CancellationToken ct);
}

public sealed class TransactionQueryService(
    ITransactionRepository transactions,
    IProfileRepository profiles) : ITransactionQueryService
{
    public async Task<PageDto<TransactionDto>> ListAsync(
        Guid authId, int page, int pageSize, TransactionType? type,
        TransactionStatus? status, Guid? accountId, Guid? userId, string? search,
        DateTimeOffset? dateFrom, DateTimeOffset? dateTo, bool suspiciousOnly,
        CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        (page, pageSize) = ApplicationRules.Page(page, pageSize);
        var query = new TransactionQuery(page, pageSize, type, status, accountId,
            userId, search, dateFrom, dateTo, suspiciousOnly);
        var (rows, total) = await transactions.ListAsync(
            query, actor.Role == UserRole.ADMIN ? null : actor.Id, ct);
        var includeDestinationBalances = actor.Role == UserRole.ADMIN;
        return new PageDto<TransactionDto>(
            rows.Select(row => DtoMapper.Transaction(row, includeDestinationBalances)).ToList(),
            page, pageSize, total, ApplicationRules.TotalPages(total, pageSize));
    }

    public async Task<TransactionDto> GetAsync(
        Guid authId, Guid id, CancellationToken ct)
    {
        var actor = await ActiveActor(authId, ct);
        var row = await transactions.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Transaction not found.");
        if (actor.Role != UserRole.ADMIN && row.PerformedById != actor.Id)
            throw new ForbiddenException("You cannot access this transaction.");
        return DtoMapper.Transaction(row, actor.Role == UserRole.ADMIN);
    }

    private async Task<Profile> ActiveActor(Guid authId, CancellationToken ct) =>
        await profiles.GetActiveByAuthIdAsync(authId, false, ct)
        ?? throw new AuthenticationException("No active application profile was found.");
}
