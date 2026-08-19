using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using IsoGuard.Api.Exceptions;

namespace IsoGuard.Api.Services;

public interface ISupabaseAdminClient
{
    Task<Guid?> FindUserIdByEmailAsync(string email, CancellationToken ct);
    Task<IReadOnlyDictionary<Guid, SupabaseAuthUser>> GetUsersAsync(
        IEnumerable<Guid> userIds, CancellationToken ct);
    Task<SupabaseActionLink> GenerateActionLinkAsync(
        string type, string email, string redirectTo, string? role, CancellationToken ct);
    Task DeleteUserAsync(Guid userId, CancellationToken ct);
}

public sealed record SupabaseActionLink(Guid? UserId, string Url);
public sealed record SupabaseAuthUser(Guid Id, string Email, bool TwoFactorEnabled);

public sealed class SupabaseAdminClient(
    HttpClient http,
    IConfiguration configuration,
    ILogger<SupabaseAdminClient> logger)
    : ISupabaseAdminClient
{
    public async Task<IReadOnlyDictionary<Guid, SupabaseAuthUser>> GetUsersAsync(
        IEnumerable<Guid> userIds, CancellationToken ct)
    {
        var requestedIds = userIds.Distinct().ToHashSet();
        if (requestedIds.Count == 0)
            return new Dictionary<Guid, SupabaseAuthUser>();

        using var request = new HttpRequestMessage(
            HttpMethod.Get, "auth/v1/admin/users?page=1&per_page=1000");
        AddAdminHeaders(request);
        using var response = await http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Supabase user lookup failed with {StatusCode}: {Response}",
                (int)response.StatusCode, body);
            throw new DependencyException("Authentication provider user lookup failed.");
        }

        using var json = JsonDocument.Parse(body);
        if (!json.RootElement.TryGetProperty("users", out var users))
            return new Dictionary<Guid, SupabaseAuthUser>();

        var authUsers = users.EnumerateArray()
            .Select(user => new
            {
                Id = user.TryGetProperty("id", out var id) &&
                     Guid.TryParse(id.GetString(), out var parsed) ? parsed : Guid.Empty,
                Email = user.TryGetProperty("email", out var email) ? email.GetString() ?? "" : ""
            })
            .Where(user => requestedIds.Contains(user.Id))
            .ToList();

        var factorTasks = authUsers.ToDictionary(
            user => user.Id,
            user => HasVerifiedFactorAsync(user.Id, ct));
        await Task.WhenAll(factorTasks.Values);

        return authUsers.ToDictionary(
            user => user.Id,
            user => new SupabaseAuthUser(
                user.Id, user.Email, factorTasks[user.Id].Result));
    }

    public async Task<Guid?> FindUserIdByEmailAsync(string email, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get, "auth/v1/admin/users?page=1&per_page=1000");
        AddAdminHeaders(request);
        using var response = await http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Supabase user lookup failed with {StatusCode}: {Response}",
                (int)response.StatusCode, body);
            throw new DependencyException("Authentication provider user lookup failed.");
        }

        using var json = JsonDocument.Parse(body);
        if (!json.RootElement.TryGetProperty("users", out var users)) return null;
        foreach (var user in users.EnumerateArray())
        {
            if (!user.TryGetProperty("email", out var userEmail) ||
                !string.Equals(userEmail.GetString(), email, StringComparison.OrdinalIgnoreCase))
                continue;
            return user.TryGetProperty("id", out var id) &&
                   Guid.TryParse(id.GetString(), out var value) ? value : null;
        }
        return null;
    }

    public async Task<SupabaseActionLink> GenerateActionLinkAsync(
        string type, string email, string redirectTo, string? role, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "auth/v1/admin/generate_link");
        AddAdminHeaders(request);
        request.Content = JsonContent.Create(new
        {
            type,
            email,
            data = role is null ? null : new { role },
            redirect_to = redirectTo
        });
        using var response = await http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Supabase {ActionType} link generation failed with {StatusCode}: {Response}",
                type, (int)response.StatusCode, body);
            throw new DependencyException("Authentication provider link generation failed.");
        }
        using var json = JsonDocument.Parse(body);
        var root = json.RootElement;
        var url = root.TryGetProperty("action_link", out var actionLink)
            ? actionLink.GetString()
            : null;
        if (string.IsNullOrWhiteSpace(url))
            throw new DependencyException("Authentication provider returned an invalid action link.");

        Guid? userId = null;
        if (root.TryGetProperty("id", out var rootId) &&
            Guid.TryParse(rootId.GetString(), out var directParsed))
        {
            userId = directParsed;
        }
        else if (root.TryGetProperty("user_id", out var rootUserId) &&
            Guid.TryParse(rootUserId.GetString(), out var rootParsed))
        {
            userId = rootParsed;
        }
        else if (root.TryGetProperty("user", out var user) &&
            user.TryGetProperty("id", out var id) &&
            Guid.TryParse(id.GetString(), out var parsed))
        {
            userId = parsed;
        }
        userId ??= await FindUserIdByEmailAsync(email, ct);

        return new SupabaseActionLink(userId, url);
    }

    public async Task DeleteUserAsync(Guid userId, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Delete, $"auth/v1/admin/users/{userId}");
        AddAdminHeaders(request);
        using var response = await http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode) return;

        var body = await response.Content.ReadAsStringAsync(ct);
        logger.LogError(
            "Supabase user cleanup failed with {StatusCode}: {Response}",
            (int)response.StatusCode,
            body);
        throw new DependencyException("Authentication provider user cleanup failed.");
    }

    private async Task<bool> HasVerifiedFactorAsync(Guid userId, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get, $"auth/v1/admin/users/{userId}/factors");
        AddAdminHeaders(request);
        using var response = await http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError(
                "Supabase MFA factor lookup failed with {StatusCode}: {Response}",
                (int)response.StatusCode, body);
            throw new DependencyException("Authentication provider MFA lookup failed.");
        }

        using var json = JsonDocument.Parse(body);
        return json.RootElement.ValueKind == JsonValueKind.Array &&
               json.RootElement.EnumerateArray().Any(factor =>
                   factor.TryGetProperty("status", out var status) &&
                   string.Equals(status.GetString(), "verified",
                       StringComparison.OrdinalIgnoreCase));
    }

    private void AddAdminHeaders(HttpRequestMessage request)
    {
        var key = configuration["Supabase:ServiceRoleKey"]
            ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is required.");
        request.Headers.Add("apikey", key);
        if (!key.StartsWith("sb_secret_", StringComparison.Ordinal))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}
