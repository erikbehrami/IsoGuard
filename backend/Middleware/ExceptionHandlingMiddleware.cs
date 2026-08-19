using System.Net;
using IsoGuard.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace IsoGuard.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var (status, code) = ex switch
            {
                ApiException api => (api.StatusCode, api.ErrorCode),
                ArgumentException => (HttpStatusCode.BadRequest, "bad_request"),
                InvalidOperationException => (HttpStatusCode.Conflict, "conflict"),
                KeyNotFoundException => (HttpStatusCode.NotFound, "not_found"),
                UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "unauthorized"),
                _ => (HttpStatusCode.InternalServerError, "internal_error")
            };
            if (status == HttpStatusCode.InternalServerError)
                logger.LogError(ex, "Unhandled request error. Trace ID: {TraceId}",
                    context.TraceIdentifier);
            else
                logger.LogWarning(ex, "Request rejected with {StatusCode}. Trace ID: {TraceId}",
                    (int)status, context.TraceIdentifier);

            if (context.Response.HasStarted) throw;
            context.Response.StatusCode = (int)status;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = (int)status,
                Title = status == HttpStatusCode.InternalServerError
                    ? "An unexpected error occurred."
                    : ex.Message,
                Type = $"https://httpstatuses.com/{(int)status}",
                Extensions =
                {
                    ["code"] = code,
                    ["error"] = status == HttpStatusCode.InternalServerError
                        ? "An unexpected error occurred."
                        : ex.Message,
                    ["traceId"] = context.TraceIdentifier
                }
            }, cancellationToken: context.RequestAborted);
        }
    }
}
