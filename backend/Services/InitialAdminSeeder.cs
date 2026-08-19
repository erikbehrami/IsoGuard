using IsoGuard.Api.Data;
using IsoGuard.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace IsoGuard.Api.Services;

public sealed class InitialAdminSeeder(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<InitialAdminSeeder> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!configuration.GetValue("SeedAdmin:Enabled", false)) return;

        var email = configuration["SeedAdmin:Email"]?.Trim().ToLowerInvariant();
        var fullName = configuration["SeedAdmin:FullName"]?.Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(fullName))
            throw new InvalidOperationException(
                "SeedAdmin:Email and SeedAdmin:FullName are required when admin seeding is enabled.");

        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var supabase = scope.ServiceProvider.GetRequiredService<ISupabaseAdminClient>();
            var authEmail = scope.ServiceProvider.GetRequiredService<IAuthEmailService>();
            var db = scope.ServiceProvider.GetRequiredService<IsoGuardDbContext>();

            var authUserId = await supabase.FindUserIdByEmailAsync(email, cancellationToken);
            if (authUserId is null)
            {
                var frontendOrigin = configuration["Frontend:Origin"] ?? "http://localhost:5173";
                authUserId = await authEmail.SendInvitationAsync(
                    email, UserRole.ADMIN.ToString(),
                    $"{frontendOrigin.TrimEnd('/')}/accept-invite",
                    Guid.NewGuid(), true, cancellationToken);
                logger.LogInformation("Invited initial administrator {Email} through Supabase Auth.",
                    email);
            }

            if (authUserId is null)
                throw new InvalidOperationException(
                    "Supabase did not return an ID for the initial administrator.");

            var profile = await db.Profiles.SingleOrDefaultAsync(
                x => x.AuthUserId == authUserId.Value, cancellationToken);
            if (profile is null)
            {
                profile = new Profile
                {
                    Id = Guid.NewGuid(),
                    AuthUserId = authUserId.Value,
                    FullName = fullName,
                    Role = UserRole.ADMIN,
                    Status = ProfileStatus.ACTIVE
                };
                db.Profiles.Add(profile);
            }
            else
            {
                profile.FullName = fullName;
                profile.Role = UserRole.ADMIN;
                profile.Status = ProfileStatus.ACTIVE;
            }

            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation(
                "Initial administrator {Email} is synchronized as an active local ADMIN.", email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Initial administrator synchronization failed.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
