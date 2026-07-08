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
import {
  measure,
  sliceSignal,
  type ChartTool,
  type PickedPoint,
} from './ecg/tools';
import { FileLoader } from './components/FileLoader';
import { MetricsPanel } from './components/MetricsPanel';
import { FilterPanel } from './components/FilterPanel';
import { MarkersPanel } from './components/MarkersPanel';
import { MeasurePanel } from './components/MeasurePanel';
import './App.css';

export default function App() {
  // Señal original cargada; `filtered` es su versión filtrada; `cropped` es el
  // recorte de lo mostrado. La original nunca se muta (RF-04, AC-08).
  const [signal, setSignal] = useState<EcgSignal | null>(null);
  const [filtered, setFiltered] = useState<EcgSignal | null>(null);
  const [cropped, setCropped] = useState<EcgSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange | null>(null);
  const [busy, setBusy] = useState(false);
  const [markers, setMarkers] = useState<EcgMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  // Herramienta activa, rejilla y puntos elegidos para regla/recorte (RF-03).
  const [tool, setTool] = useState<ChartTool>('navigate');
  const [showGrid, setShowGrid] = useState(true);
  const [picks, setPicks] = useState<PickedPoint[]>([]);

  const displayed = cropped ?? filtered ?? signal;

  function resetDerived() {
    setFiltered(null);
    setCropped(null);
    setFilterError(null);
    setRange(null);
    setMarkers([]);
    setSelectedMarkerId(null);
    setPicks([]);
    setTool('navigate');
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const result = parseEcgCsv(text);
    if (result.ok) {
      setSignal(result.signal);
      setError(null);
      resetDerived();
    } else {
      // AC-02: ante formato inválido no se dibuja ningún gráfico.
      setSignal(null);
      setError(result.error);
      resetDerived();
    }
  }

  // Los filtros se aplican sobre la original y descartan cualquier recorte
  // previo (cambia la base); revertir vuelve a la original (AC-10).
  async function applyFilter(params: FilterParams) {
    if (!signal) return;
    setBusy(true);
    setFilterError(null);
    try {
      const result = await filterSignal(signal, params);
      setFiltered(result);
      setCropped(null);
      setPicks([]);
    } catch (e) {
      setFilterError(e instanceof Error ? e.message : 'Error al filtrar la señal.');
    } finally {
      setBusy(false);
    }
  }

  function revertFilter() {
    setFiltered(null);
    setCropped(null);
    setFilterError(null);
    setPicks([]);
  }

  // Marcadores (RF-02).
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

  // Herramientas de gráfico (RF-03).
  function selectTool(next: ChartTool) {
    setTool(next);
    setPicks([]); // cambiar de herramienta descarta la selección en curso
  }

  function handlePickPoint(time: number, value: number) {
    // Hasta 2 puntos; un tercer clic reinicia la selección.
    setPicks((prev) => (prev.length >= 2 ? [{ time, value }] : [...prev, { time, value }]));
  }

  const rulerMeasure =
    tool === 'ruler' && picks.length === 2 ? measure(picks[0], picks[1]) : null;

  const cropRange: TimeRange | null =
    tool === 'crop' && picks.length === 2
      ? { from: Math.min(picks[0].time, picks[1].time), to: Math.max(picks[0].time, picks[1].time) }
      : null;

  function confirmCrop() {
    if (!cropRange || !displayed) return;
    setCropped(sliceSignal(displayed, cropRange.from, cropRange.to));
    setPicks([]);
    setTool('navigate');
  }

  function undoCrop() {
    setCropped(null);
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
              {cropped && ' · recortada'}
            </p>
            <EcgChart
              signal={displayed}
              onVisibleRangeChange={setRange}
              markers={markers}
              selectedMarkerId={selectedMarkerId}
              onCreateMarker={handleCreateMarker}
              onSelectMarker={setSelectedMarkerId}
              tool={tool}
              showGrid={showGrid}
              onToolChange={selectTool}
              onToggleGrid={setShowGrid}
              picks={picks}
              onPickPoint={handlePickPoint}
            />
          </section>

          <MeasurePanel
            tool={tool}
            rulerMeasure={rulerMeasure}
            cropRange={cropRange}
            isCropped={cropped !== null}
            onConfirmCrop={confirmCrop}
            onClearPicks={() => setPicks([])}
            onUndoCrop={undoCrop}
          />

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
