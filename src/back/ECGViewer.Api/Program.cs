using System.Text.Json.Serialization;
using ECGViewer.Api.Filters;

namespace ECGViewer.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Enums como strings en el JSON (p. ej. "LowPass") y case-insensitive.
        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

        // CORS para el frontend de desarrollo (Vite).
        const string DevCors = "dev-frontend";
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(DevCors, policy =>
                policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
                      .AllowAnyHeader()
                      .AllowAnyMethod());
        });

        // Puerto fijo en desarrollo para que el proxy del frontend lo encuentre.
        builder.WebHost.UseUrls("http://localhost:5183");

        var app = builder.Build();

        app.UseCors(DevCors);

        // RF-04: aplica un filtro digital a la señal y devuelve la señal filtrada.
        app.MapPost("/api/filter", (FilterRequest request) =>
        {
            var error = EcgFilter.Validate(
                request.Values, request.SampleRate, request.Type,
                request.LowCutoff, request.HighCutoff);

            if (error is not null)
                return Results.BadRequest(new { error });

            var filtered = EcgFilter.Apply(
                request.Values, request.SampleRate, request.Type,
                request.LowCutoff, request.HighCutoff);

            return Results.Ok(new FilterResponse(filtered));
        });

        app.Run();
    }
}
