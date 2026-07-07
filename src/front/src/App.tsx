import { useMemo, useState } from 'react';
import { parseEcgCsv } from './ecg/parseEcgCsv';
import type { EcgSignal } from './ecg/types';
import { EcgChart } from './ecg/EcgChart';
import { computeMetrics, type TimeRange } from './ecg/metrics';
import { FileLoader } from './components/FileLoader';
import { MetricsPanel } from './components/MetricsPanel';
import './App.css';

export default function App() {
  const [signal, setSignal] = useState<EcgSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const result = parseEcgCsv(text);
    if (result.ok) {
      setSignal(result.signal);
      setError(null);
      // El gráfico re-emite el rango completo al montarse.
      setRange(null);
    } else {
      // AC-02: ante formato inválido no se dibuja ningún gráfico.
      setSignal(null);
      setError(result.error);
      setRange(null);
    }
  }

  // Las métricas se recalculan cuando cambia la señal o la ventana visible (AC-14).
  const metrics = useMemo(() => {
    if (!signal) return null;
    return computeMetrics(signal.time, signal.value, range ?? undefined);
  }, [signal, range]);

  const duration =
    signal && signal.time.length > 0
      ? signal.time[signal.time.length - 1] - signal.time[0]
      : 0;

  return (
    <div className="app">
      <header className="app__header">
        <h1>ECGViewer</h1>
        <p>Cargá un archivo CSV de un canal (columnas tiempo, valor) para visualizar la señal.</p>
      </header>

      <FileLoader onFile={handleFile} />

      {fileName && <p className="app__file">Archivo: {fileName}</p>}

      {error && (
        <div className="app__error" role="alert">
          {error}
        </div>
      )}

      {signal && metrics && (
        <>
          <section className="app__chart" aria-label="Gráfico ECG">
            <p className="app__meta">
              {signal.value.length.toLocaleString('es')} muestras · {duration.toFixed(2)} s
            </p>
            <EcgChart signal={signal} onVisibleRangeChange={setRange} />
          </section>
          <MetricsPanel metrics={metrics} range={range} />
        </>
      )}
    </div>
  );
}
