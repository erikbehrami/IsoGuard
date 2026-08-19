using System.Net;

namespace IsoGuard.Api.Exceptions;

public abstract class ApiException(
    HttpStatusCode statusCode,
    string message,
    string errorCode) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public string ErrorCode { get; } = errorCode;
}

public sealed class BadRequestException(string message)
    : ApiException(HttpStatusCode.BadRequest, message, "bad_request");

public sealed class ConflictException(string message)
    : ApiException(HttpStatusCode.Conflict, message, "conflict");

public sealed class NotFoundException(string message)
    : ApiException(HttpStatusCode.NotFound, message, "not_found");

public sealed class ForbiddenException(string message)
    : ApiException(HttpStatusCode.Forbidden, message, "forbidden");

public sealed class AuthenticationException(string message)
    : ApiException(HttpStatusCode.Unauthorized, message, "unauthorized");

public sealed class DependencyException(string message)
    : ApiException(HttpStatusCode.BadGateway, message, "dependency_failure");
