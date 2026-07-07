import type { EcgMetrics, TimeRange } from '../ecg/metrics';

interface MetricsPanelProps {
  metrics: EcgMetrics;
  range: TimeRange | null;
}

function fmt(value: number | null, digits: number, unit: string): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}${unit}`;
}

export function MetricsPanel({ metrics, range }: MetricsPanelProps) {
  return (
    <section className="metrics" aria-label="Métricas cardíacas">
      <div className="metrics__head">
        <h2>Métricas (ventana visible)</h2>
        {range && (
          <span className="metrics__range">
            {range.from.toFixed(2)}–{range.to.toFixed(2)} s · {metrics.beats} latidos
          </span>
        )}
      </div>

      <div className="metrics__grid">
        <Metric
          label="BPM"
          value={metrics.bpm === null ? '—' : Math.round(metrics.bpm).toString()}
        />
        <Metric label="SDNN" value={fmt(metrics.sdnn, 1, ' ms')} />
        <Metric label="RMSSD" value={fmt(metrics.rmssd, 1, ' ms')} />
        <Metric label="pNN50" value={fmt(metrics.pnn50, 1, ' %')} />
      </div>

      {metrics.beats < 3 && (
        <p className="metrics__hint">
          Se necesitan al menos 3 latidos en la ventana visible para calcular la
          variabilidad (SDNN, RMSSD, pNN50).
        </p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value">{value}</div>
    </div>
  );
}
