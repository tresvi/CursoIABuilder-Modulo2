import { useMemo, useState } from 'react';
import { parseEcgCsv } from './ecg/parseEcgCsv';
import type { EcgSignal } from './ecg/types';
import { EcgChart } from './ecg/EcgChart';
import { computeMetrics, type TimeRange } from './ecg/metrics';
import { filterSignal, type FilterParams } from './ecg/filterApi';
import {
  createMarker,
  updateLabel,
  removeMarker,
  type EcgMarker,
} from './ecg/markers';
import { FileLoader } from './components/FileLoader';
import { MetricsPanel } from './components/MetricsPanel';
import { FilterPanel } from './components/FilterPanel';
import { MarkersPanel } from './components/MarkersPanel';
import './App.css';

export default function App() {
  // `signal` es siempre la señal original cargada; `filtered` es la versión
  // filtrada (null = mostrando la original). Nunca se muta la original (RF-04).
  const [signal, setSignal] = useState<EcgSignal | null>(null);
  const [filtered, setFiltered] = useState<EcgSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange | null>(null);
  const [busy, setBusy] = useState(false);
  // Marcadores de evento (RF-02). Viven en memoria durante la sesión.
  const [markers, setMarkers] = useState<EcgMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const displayed = filtered ?? signal;

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const result = parseEcgCsv(text);
    if (result.ok) {
      setSignal(result.signal);
      setError(null);
      // Nuevo archivo: se limpian filtro, zoom, marcadores y errores previos.
      setFiltered(null);
      setFilterError(null);
      setRange(null);
      setMarkers([]);
      setSelectedMarkerId(null);
    } else {
      // AC-02: ante formato inválido no se dibuja ningún gráfico.
      setSignal(null);
      setFiltered(null);
      setError(result.error);
      setFilterError(null);
      setRange(null);
      setMarkers([]);
      setSelectedMarkerId(null);
    }
  }

  // Marcadores (RF-02): crear en un instante, seleccionar, editar y borrar.
  function handleCreateMarker(time: number) {
    const marker = createMarker(time);
    setMarkers((prev) => [...prev, marker]);
    setSelectedMarkerId(marker.id);
  }

  function handleUpdateMarkerLabel(id: string, label: string) {
    setMarkers((prev) => updateLabel(prev, id, label));
  }

  function handleDeleteMarker(id: string) {
    setMarkers((prev) => removeMarker(prev, id));
    setSelectedMarkerId((current) => (current === id ? null : current));
  }

  // Siempre se filtra la señal ORIGINAL (los filtros no se acumulan); revertir
  // vuelve a la original (AC-10). No modifica destructivamente la señal.
  async function applyFilter(params: FilterParams) {
    if (!signal) return;
    setBusy(true);
    setFilterError(null);
    try {
      const result = await filterSignal(signal, params);
      setFiltered(result);
    } catch (e) {
      setFilterError(e instanceof Error ? e.message : 'Error al filtrar la señal.');
    } finally {
      setBusy(false);
    }
  }

  function revertFilter() {
    setFiltered(null);
    setFilterError(null);
  }

  // Métricas sobre la señal mostrada y la ventana visible (AC-13/AC-14).
  const metrics = useMemo(() => {
    if (!displayed) return null;
    return computeMetrics(displayed.time, displayed.value, range ?? undefined);
  }, [displayed, range]);

  const duration =
    displayed && displayed.time.length > 0
      ? displayed.time[displayed.time.length - 1] - displayed.time[0]
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

      {displayed && metrics && (
        <>
          <section className="app__chart" aria-label="Gráfico ECG">
            <p className="app__meta">
              {displayed.value.length.toLocaleString('es')} muestras · {duration.toFixed(2)} s
              {filtered && ' · filtrada'}
            </p>
            <EcgChart
              signal={displayed}
              onVisibleRangeChange={setRange}
              markers={markers}
              selectedMarkerId={selectedMarkerId}
              onCreateMarker={handleCreateMarker}
              onSelectMarker={setSelectedMarkerId}
            />
          </section>

          <MarkersPanel
            markers={markers}
            selectedId={selectedMarkerId}
            onSelect={setSelectedMarkerId}
            onUpdateLabel={handleUpdateMarkerLabel}
            onDelete={handleDeleteMarker}
          />

          <FilterPanel
            onApply={applyFilter}
            onRevert={revertFilter}
            isFiltered={filtered !== null}
            busy={busy}
          />
          {filterError && (
            <div className="app__error" role="alert">
              {filterError}
            </div>
          )}

          <MetricsPanel metrics={metrics} range={range} />
        </>
      )}
    </div>
  );
}
