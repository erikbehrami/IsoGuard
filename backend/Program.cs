using System.Text.Json.Serialization;
using IsoGuard.Api.Data;
using IsoGuard.Api.Middleware;
using IsoGuard.Api.Repositories;
using IsoGuard.Api.Services;
using IsoGuard.Api.Security;
using IsoGuard.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseDefaultServiceProvider(options =>
{
    options.ValidateScopes = true;
    options.ValidateOnBuild = true;
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
builder.Services.AddDbContext<IsoGuardDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsAssembly(typeof(IsoGuardDbContext).Assembly.FullName))
        .UseSnakeCaseNamingConvention());

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Jwt:Authority"];
        options.Audience = builder.Configuration["Jwt:Audience"] ?? "authenticated";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new ActiveProfileRequirement(UserRole.ADMIN)));
    options.AddPolicy("ActiveUser", policy =>
        policy.RequireAuthenticatedUser().AddRequirements(new ActiveProfileRequirement()));
});
builder.Services.AddScoped<IAuthorizationHandler, ActiveProfileHandler>();

builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>();
builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IAccountRequestRepository, AccountRequestRepository>();
builder.Services.AddScoped<IInvitationRepository, InvitationRepository>();
builder.Services.AddScoped<ITransactionRepository, TransactionRepository>();
builder.Services.AddScoped<IAnomalyRepository, AnomalyRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IAuditRepository, AuditRepository>();

builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IAccountRequestService, AccountRequestService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IAnomalyService, AnomalyService>();
builder.Services.AddScoped<ITransactionQueryService, TransactionQueryService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<IAuthEmailService, AuthEmailService>();
builder.Services.AddHttpClient<IAnomalyClient, AnomalyClient>(client =>
{
    client.BaseAddress = new Uri(
        builder.Configuration["MlService:BaseUrl"] ?? "http://localhost:8000");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddHttpClient<ISupabaseAdminClient, SupabaseAdminClient>(client =>
{
    var supabaseUrl = builder.Configuration["Supabase:Url"]
        ?? throw new InvalidOperationException("Supabase:Url is required.");
    client.BaseAddress = new Uri($"{supabaseUrl.TrimEnd('/')}/");
});
if (string.Equals(
        builder.Configuration["Email:Provider"], "Smtp",
        StringComparison.OrdinalIgnoreCase))
{
    foreach (var key in new[]
             {
                 "Email:SmtpHost",
                 "Email:SmtpUsername",
                 "Email:SmtpPassword",
                 "Email:FromAddress"
             })
    {
        if (string.IsNullOrWhiteSpace(builder.Configuration[key]))
            throw new InvalidOperationException(
                $"{key} is required when Email:Provider is Smtp.");
    }
    builder.Services.AddScoped<ITransactionalEmailSender, SmtpEmailSender>();
}
else
{
    builder.Services.AddHttpClient<ITransactionalEmailSender, ResendEmailSender>(client =>
    {
        client.BaseAddress = new Uri("https://api.resend.com/");
        client.DefaultRequestHeaders.UserAgent.ParseAdd("IsoGuard/1.0");
        client.Timeout = TimeSpan.FromSeconds(15);
    });
}
builder.Services.AddHostedService<InitialAdminSeeder>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("PasswordRecovery", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
    policy.WithOrigins(builder.Configuration["Frontend:Origin"] ?? "http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
app.UseMiddleware<ExceptionHandlingMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "isoguard-api" }))
    .AllowAnonymous();
app.Run();

public partial class Program { }
