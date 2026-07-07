import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { EcgSignal } from './types';
import type { TimeRange } from './metrics';
import type { EcgMarker } from './markers';

interface EcgChartProps {
  signal: EcgSignal;
  height?: number;
  /** Se llama cuando cambia la ventana visible (zoom/reset). */
  onVisibleRangeChange?: (range: TimeRange) => void;
  markers?: EcgMarker[];
  selectedMarkerId?: string | null;
  /** Clic en una zona sin marcadores → crear uno en ese instante (AC-04). */
  onCreateMarker?: (time: number) => void;
  /** Clic cerca de un marcador existente → seleccionarlo (AC-05). */
  onSelectMarker?: (id: string) => void;
}

// Tolerancia en píxeles para: (1) distinguir clic de arrastre, (2) acertar a un
// marcador existente al hacer clic.
const CLICK_MOVE_TOLERANCE_PX = 4;
const MARKER_HIT_TOLERANCE_PX = 6;

/**
 * Gráfico de la señal ECG basado en uPlot (Canvas), elegido por rendimiento:
 * render <0.1 s y sin parpadeos para señales largas (RNF-01, RNF-02).
 * Eje X en segundos, eje Y en mV (AC-01).
 *
 * Zoom: arrastrar hace zoom en X (uPlot nativo); "Restablecer zoom" vuelve al
 * rango completo (AC-06). Marcadores (RF-02): un clic simple crea un marcador
 * en ese instante, o selecciona el que esté cerca; se dibujan como líneas
 * verticales.
 */
export function EcgChart({
  signal,
  height = 380,
  onVisibleRangeChange,
  markers = [],
  selectedMarkerId = null,
  onCreateMarker,
  onSelectMarker,
}: EcgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  // Refs para leer el estado actual dentro de los callbacks de uPlot sin
  // recrear el gráfico (que reiniciaría el zoom) en cada render.
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const data: uPlot.AlignedData = [signal.time, signal.value];

    const opts: uPlot.Options = {
      width: container.clientWidth || 800,
      height,
      // El eje X es tiempo relativo en segundos, no una fecha unix.
      scales: { x: { time: false } },
      series: [
        { label: 'Tiempo (s)' },
        {
          label: 'Amplitud (mV)',
          stroke: '#c0392b',
          width: 1,
          points: { show: false },
        },
      ],
      axes: [{ label: 'Tiempo (s)' }, { label: 'Amplitud (mV)' }],
      hooks: {
        setScale: [
          (u, key) => {
            if (key !== 'x') return;
            const { min, max } = u.scales.x;
            if (min != null && max != null) {
              onRangeRef.current?.({ from: min, to: max });
            }
          },
        ],
        // Dibuja los marcadores como líneas verticales sobre el trazo.
        draw: [
          (u) => {
            const ctx = u.ctx;
            const { left, top, width, height: h } = u.bbox;
            ctx.save();
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
            ctx.restore();
          },
        ],
      },
    };

    const plot = new uPlot(opts, data, container);
    plotRef.current = plot;

    // Clic simple (no arrastre) sobre el área del gráfico: crear/seleccionar
    // marcador. Se distingue del arrastre (zoom) por el desplazamiento.
    let downX: number | null = null;
    const onDown = (e: MouseEvent) => {
      downX = e.offsetX;
    };
    const onUp = (e: MouseEvent) => {
      if (downX === null) return;
      const moved = Math.abs(e.offsetX - downX);
      downX = null;
      if (moved > CLICK_MOVE_TOLERANCE_PX) return; // fue un arrastre (zoom)

      const left = e.offsetX;
      // ¿Hay un marcador cerca? Si sí, se selecciona; si no, se crea.
      let hitId: string | null = null;
      let hitDist = MARKER_HIT_TOLERANCE_PX;
      for (const m of markersRef.current) {
        const mx = plot.valToPos(m.time, 'x');
        const dist = Math.abs(mx - left);
        if (dist <= hitDist) {
          hitDist = dist;
          hitId = m.id;
        }
      }
      if (hitId !== null) {
        onSelectRef.current?.(hitId);
      } else {
        onCreateRef.current?.(plot.posToVal(left, 'x'));
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

  // Redibuja cuando cambian los marcadores o la selección (sin recrear el plot).
  useEffect(() => {
    plotRef.current?.redraw();
  }, [markers, selectedMarkerId]);

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
        <button type="button" onClick={resetZoom}>
          Restablecer zoom
        </button>
        <span className="ecg-chart__hint">
          Arrastrá para hacer zoom · clic para marcar un evento
        </span>
      </div>
      <div ref={containerRef} className="ecg-chart__canvas" />
    </div>
  );
}
