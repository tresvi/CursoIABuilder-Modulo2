namespace ECGViewer.Api.Filters;

/// <summary>
/// Filtrado digital de la señal ECG (RF-04) usando FftSharp (filtrado por FFT).
/// Los cuatro tipos: pasa bajo, pasa alto, pasa banda y notch (rechaza banda).
///
/// El notch se deriva como (señal − pasa banda) sobre la banda a rechazar, que
/// para un filtro lineal por FFT equivale exactamente al rechaza-banda.
/// </summary>
public static class EcgFilter
{
    /// <summary>
    /// Valida los parámetros del filtro. Devuelve un mensaje de error si son
    /// inválidos, o <c>null</c> si están OK.
    /// </summary>
    public static string? Validate(
        double[]? values,
        double sampleRate,
        FilterType type,
        double? lowCutoff,
        double? highCutoff)
    {
        if (values is null || values.Length < 4)
            return "La señal es demasiado corta para filtrar.";
        if (sampleRate <= 0)
            return "La frecuencia de muestreo debe ser positiva.";

        double nyquist = sampleRate / 2.0;

        switch (type)
        {
            case FilterType.LowPass:
                if (highCutoff is null)
                    return "El filtro pasa bajo requiere una frecuencia de corte superior.";
                if (highCutoff <= 0 || highCutoff >= nyquist)
                    return $"La frecuencia de corte debe estar entre 0 y {nyquist:0.##} Hz (Nyquist).";
                break;

            case FilterType.HighPass:
                if (lowCutoff is null)
                    return "El filtro pasa alto requiere una frecuencia de corte inferior.";
                if (lowCutoff <= 0 || lowCutoff >= nyquist)
                    return $"La frecuencia de corte debe estar entre 0 y {nyquist:0.##} Hz (Nyquist).";
                break;

            case FilterType.BandPass:
            case FilterType.Notch:
                if (lowCutoff is null || highCutoff is null)
                    return "El filtro requiere frecuencias de corte inferior y superior.";
                if (lowCutoff <= 0 || highCutoff >= nyquist || lowCutoff >= highCutoff)
                    return $"Frecuencias inválidas: debe cumplirse 0 < inferior < superior < {nyquist:0.##} Hz (Nyquist).";
                break;

            default:
                return "Tipo de filtro no soportado.";
        }

        return null;
    }

    /// <summary>
    /// Aplica el filtro. Asume que los parámetros ya fueron validados con
    /// <see cref="Validate"/>. No modifica el arreglo de entrada.
    /// </summary>
    public static double[] Apply(
        double[] values,
        double sampleRate,
        FilterType type,
        double? lowCutoff,
        double? highCutoff)
    {
        return type switch
        {
            FilterType.LowPass =>
                FftSharp.Filter.LowPass(values, sampleRate, maxFrequency: highCutoff!.Value),

            FilterType.HighPass =>
                FftSharp.Filter.HighPass(values, sampleRate, minFrequency: lowCutoff!.Value),

            FilterType.BandPass =>
                FftSharp.Filter.BandPass(values, sampleRate, lowCutoff!.Value, highCutoff!.Value),

            FilterType.Notch =>
                Subtract(values, FftSharp.Filter.BandPass(values, sampleRate, lowCutoff!.Value, highCutoff!.Value)),

            _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Tipo de filtro no soportado."),
        };
    }

    private static double[] Subtract(double[] a, double[] b)
    {
        var result = new double[a.Length];
        for (int i = 0; i < a.Length; i++)
            result[i] = a[i] - b[i];
        return result;
    }
}
