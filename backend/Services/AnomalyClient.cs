using System.Net.Http.Json;
using IsoGuard.Api.DTOs.Anomalies;
using IsoGuard.Api.Exceptions;

namespace IsoGuard.Api.Services;

public interface IAnomalyClient
{
    Task<PredictionResponse> PredictAsync(
        PredictionRequest request,
        CancellationToken cancellationToken);
}

public sealed class AnomalyClient(HttpClient httpClient) : IAnomalyClient
{
    public async Task<PredictionResponse> PredictAsync(
        PredictionRequest request,
        CancellationToken cancellationToken)
    {
        using var response = await httpClient.PostAsJsonAsync(
            "/predict", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new DependencyException("Anomaly detection service request failed.");
        return await response.Content.ReadFromJsonAsync<PredictionResponse>(
            cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("ML service returned an empty response.");
    }
}
