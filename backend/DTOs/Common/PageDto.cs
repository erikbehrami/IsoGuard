namespace IsoGuard.Api.DTOs;

public sealed record PageDto<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);
