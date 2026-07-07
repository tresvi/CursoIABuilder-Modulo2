using ECGViewer.Api.Filters;

namespace ECGViewer.Tests;

public class EcgFilterTests
{
    private const double SampleRate = 250.0; // Hz

    /// <summary>Genera una onda seno de una frecuencia dada.</summary>
    private static double[] Sine(double freqHz, double sampleRate, int samples, double amplitude = 1.0)
    {
        var signal = new double[samples];
        for (int i = 0; i < samples; i++)
            signal[i] = amplitude * Math.Sin(2 * Math.PI * freqHz * i / sampleRate);
        return signal;
    }

    private static double[] Add(double[] a, double[] b)
    {
        var r = new double[a.Length];
        for (int i = 0; i < a.Length; i++) r[i] = a[i] + b[i];
        return r;
    }

    private static double Rms(double[] x)
    {
        double sum = 0;
        foreach (var v in x) sum += v * v;
        return Math.Sqrt(sum / x.Length);
    }

    /// <summary>RMS de la componente a una frecuencia, vía correlación con seno/coseno.</summary>
    private static double ComponentRms(double[] signal, double freqHz, double sampleRate)
    {
        double re = 0, im = 0;
        int n = signal.Length;
        for (int i = 0; i < n; i++)
        {
            double ang = 2 * Math.PI * freqHz * i / sampleRate;
            re += signal[i] * Math.Cos(ang);
            im += signal[i] * Math.Sin(ang);
        }
        double amplitude = 2.0 * Math.Sqrt(re * re + im * im) / n;
        return amplitude / Math.Sqrt(2);
    }

    [Fact]
    public void LowPass_atenua_la_componente_de_alta_frecuencia()
    {
        // 5 Hz (baja) + 60 Hz (alta). Pasa bajo a 15 Hz debe quitar la de 60.
        int n = 1024;
        var signal = Add(Sine(5, SampleRate, n), Sine(60, SampleRate, n));

        var filtered = EcgFilter.Apply(signal, SampleRate, FilterType.LowPass, null, 15);

        Assert.True(ComponentRms(filtered, 60, SampleRate) < 0.1, "la componente de 60 Hz debería estar muy atenuada");
        Assert.True(ComponentRms(filtered, 5, SampleRate) > 0.6, "la componente de 5 Hz debería conservarse");
    }

    [Fact]
    public void HighPass_atenua_la_componente_de_baja_frecuencia()
    {
        int n = 1024;
        var signal = Add(Sine(2, SampleRate, n), Sine(50, SampleRate, n));

        var filtered = EcgFilter.Apply(signal, SampleRate, FilterType.HighPass, 20, null);

        Assert.True(ComponentRms(filtered, 2, SampleRate) < 0.1, "la componente de 2 Hz debería estar muy atenuada");
        Assert.True(ComponentRms(filtered, 50, SampleRate) > 0.6, "la componente de 50 Hz debería conservarse");
    }

    [Fact]
    public void BandPass_conserva_la_banda_y_atenua_afuera()
    {
        int n = 1024;
        // 1 Hz (fuera) + 20 Hz (dentro) + 90 Hz (fuera).
        var signal = Add(Add(Sine(1, SampleRate, n), Sine(20, SampleRate, n)), Sine(90, SampleRate, n));

        var filtered = EcgFilter.Apply(signal, SampleRate, FilterType.BandPass, 10, 30);

        Assert.True(ComponentRms(filtered, 20, SampleRate) > 0.6, "la componente de 20 Hz debería conservarse");
        Assert.True(ComponentRms(filtered, 1, SampleRate) < 0.1, "la componente de 1 Hz debería atenuarse");
        Assert.True(ComponentRms(filtered, 90, SampleRate) < 0.1, "la componente de 90 Hz debería atenuarse");
    }

    [Fact]
    public void Notch_elimina_50Hz_y_conserva_el_resto()
    {
        int n = 1024;
        // Señal útil de 8 Hz + interferencia de línea de 50 Hz.
        var signal = Add(Sine(8, SampleRate, n), Sine(50, SampleRate, n));

        var filtered = EcgFilter.Apply(signal, SampleRate, FilterType.Notch, 48, 52);

        Assert.True(ComponentRms(filtered, 50, SampleRate) < 0.1, "la interferencia de 50 Hz debería eliminarse");
        Assert.True(ComponentRms(filtered, 8, SampleRate) > 0.6, "la señal de 8 Hz debería conservarse");
    }

    [Fact]
    public void Apply_no_modifica_la_senal_de_entrada()
    {
        var signal = Sine(10, SampleRate, 256);
        var copy = (double[])signal.Clone();

        _ = EcgFilter.Apply(signal, SampleRate, FilterType.LowPass, null, 20);

        Assert.Equal(copy, signal); // el arreglo original no cambia (no destructivo)
    }

    [Theory]
    [InlineData(FilterType.LowPass, null, 200.0)]   // corte por encima de Nyquist (125 Hz)
    [InlineData(FilterType.HighPass, 0.0, null)]    // corte no positivo
    [InlineData(FilterType.BandPass, 30.0, 10.0)]   // inferior >= superior
    [InlineData(FilterType.Notch, null, 60.0)]      // falta el corte inferior
    public void Validate_rechaza_parametros_invalidos(FilterType type, double? low, double? high)
    {
        var signal = Sine(10, SampleRate, 256);
        var error = EcgFilter.Validate(signal, SampleRate, type, low, high);
        Assert.NotNull(error);
    }

    [Fact]
    public void Validate_acepta_parametros_correctos()
    {
        var signal = Sine(10, SampleRate, 256);
        var error = EcgFilter.Validate(signal, SampleRate, FilterType.BandPass, 5, 40);
        Assert.Null(error);
    }
}
