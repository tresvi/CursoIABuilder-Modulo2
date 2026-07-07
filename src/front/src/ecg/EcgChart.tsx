import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { EcgSignal } from './types';
import type { TimeRange } from './metrics';

interface EcgChartProps {
  signal: EcgSignal;
  height?: number;
  /** Se llama cuando cambia la ventana visible (zoom/reset). */
  onVisibleRangeChange?: (range: TimeRange) => void;
}

/**
 * Gráfico de la señal ECG basado en uPlot (Canvas), elegido por rendimiento:
 * render <0.1 s y sin parpadeos para señales largas (RNF-01, RNF-02).
 * Eje X en segundos, eje Y en mV (AC-01).
 *
 * Zoom: arrastrar sobre el gráfico hace zoom en X (uPlot nativo). El botón
 * "Restablecer zoom" vuelve al rango completo (AC-06). Cada cambio de rango se
 * informa hacia arriba para recalcular las métricas de la ventana visible.
 */
export function EcgChart({ signal, height = 380, onVisibleRangeChange }: EcgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  // Mantiene el callback actualizado sin recrear el gráfico en cada render.
  const onRangeRef = useRef(onVisibleRangeChange);
  onRangeRef.current = onVisibleRangeChange;

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
      },
    };

    const plot = new uPlot(opts, data, container);
    plotRef.current = plot;

    const resizeObserver = new ResizeObserver(() => {
      plot.setSize({ width: container.clientWidth || 800, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [signal, height]);

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
        <span className="ecg-chart__hint">Arrastrá sobre el gráfico para hacer zoom</span>
      </div>
      <div ref={containerRef} className="ecg-chart__canvas" />
    </div>
  );
}
