import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { EcgSignal } from './types';
import type { TimeRange } from './metrics';
import type { EcgMarker } from './markers';
import { sampleValueAt, type ChartTool, type PickedPoint } from './tools';

interface EcgChartProps {
  signal: EcgSignal;
  height?: number;
  /** Se llama cuando cambia la ventana visible (zoom/reset). */
  onVisibleRangeChange?: (range: TimeRange) => void;
  markers?: EcgMarker[];
  selectedMarkerId?: string | null;
  /** Clic en zona vacía en modo "marcar" → crear marcador (AC-04). */
  onCreateMarker?: (time: number) => void;
  /** Clic cerca de un marcador en modo "marcar" → seleccionarlo (AC-05). */
  onSelectMarker?: (id: string) => void;
  tool: ChartTool;
  showGrid: boolean;
  onToolChange: (tool: ChartTool) => void;
  onToggleGrid: (show: boolean) => void;
  /** Puntos elegidos para regla/recorte (se dibujan sobre el trazo). */
  picks?: PickedPoint[];
  /** Clic en modo regla/recorte → elegir un punto del trazo. */
  onPickPoint?: (time: number, value: number) => void;
}

const CLICK_MOVE_TOLERANCE_PX = 4;
const MARKER_HIT_TOLERANCE_PX = 6;

const TOOLS: { value: ChartTool; label: string }[] = [
  { value: 'navigate', label: 'Navegar' },
  { value: 'marker', label: 'Marcar' },
  { value: 'ruler', label: 'Regla' },
  { value: 'crop', label: 'Recortar' },
];

const HINTS: Record<ChartTool, string> = {
  navigate: 'Arrastrá para hacer zoom · doble clic para restablecer',
  marker: 'Clic para marcar un evento; clic sobre un marcador para editarlo',
  ruler: 'Clic en dos puntos del trazo para medir Δtiempo y Δamplitud',
  crop: 'Clic en el inicio y el fin del rango a recortar',
};

/**
 * Gráfico de la señal ECG con uPlot (Canvas), por rendimiento (RNF-01/02).
 * Eje X en segundos, eje Y en mV (AC-01).
 *
 * Herramientas (RF-03): navegar (zoom por arrastre), marcar eventos (RF-02),
 * regla (AC-07) y recorte (AC-08). La rejilla ECG se dibuja detrás del trazo.
 * El arrastre siempre hace zoom; el clic simple depende de la herramienta.
 */
export function EcgChart({
  signal,
  height = 380,
  onVisibleRangeChange,
  markers = [],
  selectedMarkerId = null,
  onCreateMarker,
  onSelectMarker,
  tool,
  showGrid,
  onToolChange,
  onToggleGrid,
  picks = [],
  onPickPoint,
}: EcgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  // Refs para leer estado dentro de los callbacks de uPlot sin recrear el plot.
  const onRangeRef = useRef(onVisibleRangeChange);
  onRangeRef.current = onVisibleRangeChange;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const selectedRef = useRef(selectedMarkerId);
  selectedRef.current = selectedMarkerId;
  const onCreateRef = useRef(onCreateMarker);
  onCreateRef.current = onCreateMarker;
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const showGridRef = useRef(showGrid);
  showGridRef.current = showGrid;
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const onPickRef = useRef(onPickPoint);
  onPickRef.current = onPickPoint;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const data: uPlot.AlignedData = [signal.time, signal.value];

    function drawGrid(u: uPlot) {
      const ctx = u.ctx;
      const { left, top, width, height: h } = u.bbox;
      const xmin = u.scales.x.min!;
      const xmax = u.scales.x.max!;
      const ymin = u.scales.y.min!;
      const ymax = u.scales.y.max!;

      const line = (stepX: number, stepY: number, color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        // Verticales cada stepX segundos (si no quedan demasiado juntas).
        if (Math.abs(u.valToPos(xmin + stepX, 'x', true) - u.valToPos(xmin, 'x', true)) >= 3) {
          for (let x = Math.ceil(xmin / stepX) * stepX; x <= xmax; x += stepX) {
            const px = u.valToPos(x, 'x', true);
            ctx.moveTo(px, top);
            ctx.lineTo(px, top + h);
          }
        }
        // Horizontales cada stepY mV.
        if (Math.abs(u.valToPos(ymin + stepY, 'y', true) - u.valToPos(ymin, 'y', true)) >= 3) {
          for (let y = Math.ceil(ymin / stepY) * stepY; y <= ymax; y += stepY) {
            const py = u.valToPos(y, 'y', true);
            ctx.moveTo(left, py);
            ctx.lineTo(left + width, py);
          }
        }
        ctx.stroke();
      };

      ctx.save();
      ctx.rect(left, top, width, h);
      ctx.clip();
      line(0.04, 0.1, '#f6dcdc'); // rejilla menor (1 mm)
      line(0.2, 0.5, '#eab3b3'); // rejilla mayor (5 mm)
      ctx.restore();
    }

    function drawOverlays(u: uPlot) {
      const ctx = u.ctx;
      const { left, top, width, height: h } = u.bbox;
      const currentTool = toolRef.current;

      // Marcadores (RF-02).
      for (const m of markersRef.current) {
        const x = u.valToPos(m.time, 'x', true);
        if (x < left || x > left + width) continue;
        const isSelected = m.id === selectedRef.current;
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#1f6feb' : '#e08a1e';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.setLineDash(isSelected ? [] : [4, 3]);
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const currentPicks = picksRef.current;

      // Recorte: sombrea el rango entre los dos puntos (AC-08).
      if (currentTool === 'crop' && currentPicks.length === 2) {
        const x1 = u.valToPos(currentPicks[0].time, 'x', true);
        const x2 = u.valToPos(currentPicks[1].time, 'x', true);
        ctx.save();
        ctx.fillStyle = 'rgba(31, 111, 235, 0.12)';
        ctx.fillRect(Math.min(x1, x2), top, Math.abs(x2 - x1), h);
        ctx.strokeStyle = '#1f6feb';
        ctx.lineWidth = 1;
        for (const px of [x1, x2]) {
          ctx.beginPath();
          ctx.moveTo(px, top);
          ctx.lineTo(px, top + h);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Regla: puntos + línea entre ellos (AC-07).
      if (currentTool === 'ruler') {
        ctx.save();
        ctx.strokeStyle = '#1f6feb';
        ctx.fillStyle = '#1f6feb';
        ctx.lineWidth = 1;
        const pts = currentPicks.map((p) => ({
          x: u.valToPos(p.time, 'x', true),
          y: u.valToPos(p.value, 'y', true),
        }));
        if (pts.length === 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        }
        for (const p of pts) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    const opts: uPlot.Options = {
      width: container.clientWidth || 800,
      height,
      scales: { x: { time: false } },
      series: [
        { label: 'Tiempo (s)' },
        { label: 'Amplitud (mV)', stroke: '#c0392b', width: 1, points: { show: false } },
      ],
      // Se desactiva la rejilla nativa de uPlot; usamos la rejilla ECG propia.
      axes: [
        { label: 'Tiempo (s)', grid: { show: false } },
        { label: 'Amplitud (mV)', grid: { show: false } },
      ],
      hooks: {
        setScale: [
          (u, key) => {
            if (key !== 'x') return;
            const { min, max } = u.scales.x;
            if (min != null && max != null) onRangeRef.current?.({ from: min, to: max });
          },
        ],
        // La rejilla se dibuja al limpiar el canvas → queda detrás del trazo.
        drawClear: [(u) => showGridRef.current && drawGrid(u)],
        // Marcadores/regla/recorte se dibujan encima del trazo.
        draw: [(u) => drawOverlays(u)],
      },
    };

    const plot = new uPlot(opts, data, container);
    plotRef.current = plot;

    let downX: number | null = null;
    const onDown = (e: MouseEvent) => {
      downX = e.offsetX;
    };
    const onUp = (e: MouseEvent) => {
      if (downX === null) return;
      const moved = Math.abs(e.offsetX - downX);
      downX = null;
      if (moved > CLICK_MOVE_TOLERANCE_PX) return; // arrastre = zoom

      const left = e.offsetX;
      const time = plot.posToVal(left, 'x');
      const activeTool = toolRef.current;

      if (activeTool === 'marker') {
        let hitId: string | null = null;
        let hitDist = MARKER_HIT_TOLERANCE_PX;
        for (const m of markersRef.current) {
          const dist = Math.abs(plot.valToPos(m.time, 'x') - left);
          if (dist <= hitDist) {
            hitDist = dist;
            hitId = m.id;
          }
        }
        if (hitId !== null) onSelectRef.current?.(hitId);
        else onCreateRef.current?.(time);
      } else if (activeTool === 'ruler' || activeTool === 'crop') {
        onPickRef.current?.(time, sampleValueAt(signal, time));
      }
    };
    plot.over.addEventListener('mousedown', onDown);
    plot.over.addEventListener('mouseup', onUp);

    const resizeObserver = new ResizeObserver(() => {
      plot.setSize({ width: container.clientWidth || 800, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      plot.over.removeEventListener('mousedown', onDown);
      plot.over.removeEventListener('mouseup', onUp);
      plot.destroy();
      plotRef.current = null;
    };
  }, [signal, height]);

  // Redibuja al cambiar marcadores, selección, herramienta, picks o rejilla.
  useEffect(() => {
    plotRef.current?.redraw();
  }, [markers, selectedMarkerId, tool, picks, showGrid]);

  function resetZoom() {
    const plot = plotRef.current;
    if (!plot) return;
    plot.setScale('x', {
      min: signal.time[0],
      max: signal.time[signal.time.length - 1],
    });
  }

  return (
    <div className="ecg-chart">
      <div className="ecg-chart__toolbar">
        <div className="ecg-chart__tools" role="group" aria-label="Herramienta">
          {TOOLS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={tool === t.value ? 'tool tool--active' : 'tool'}
              onClick={() => onToolChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ecg-chart__grid-toggle">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => onToggleGrid(e.target.checked)}
          />
          Rejilla ECG
        </label>
        <button type="button" onClick={resetZoom}>
          Restablecer zoom
        </button>
      </div>
      <p className="ecg-chart__hint">{HINTS[tool]}</p>
      <div ref={containerRef} className="ecg-chart__canvas" />
    </div>
  );
}
