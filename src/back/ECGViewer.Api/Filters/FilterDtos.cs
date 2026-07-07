namespace ECGViewer.Api.Filters;

/// <summary>Tipo de filtro digital soportado (RF-04).</summary>
public enum FilterType
{
    LowPass,
    HighPass,
    BandPass,
    Notch,
}

/// <summary>
/// Pedido de filtrado. La señal se envía como valores (mV) más su frecuencia
/// de muestreo; los timestamps no cambian con el filtrado, así que no viajan.
/// </summary>
/// <param name="SampleRate">Frecuencia de muestreo en Hz.</param>
/// <param name="Values">Muestras de la señal (mV).</param>
/// <param name="Type">Tipo de filtro.</param>
/// <param name="LowCutoff">Corte inferior en Hz (pasa alto / banda / notch).</param>
/// <param name="HighCutoff">Corte superior en Hz (pasa bajo / banda / notch).</param>
public record FilterRequest(
    double SampleRate,
    double[] Values,
    FilterType Type,
    double? LowCutoff,
    double? HighCutoff);

/// <summary>Señal filtrada.</summary>
public record FilterResponse(double[] Values);
