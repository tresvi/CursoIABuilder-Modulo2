import type { ChartTool, RulerMeasure } from '../ecg/tools';
import type { TimeRange } from '../ecg/metrics';

interface MeasurePanelProps {
  tool: ChartTool;
  rulerMeasure: RulerMeasure | null;
  cropRange: TimeRange | null;
  isCropped: boolean;
  onConfirmCrop: () => void;
  onClearPicks: () => void;
  onUndoCrop: () => void;
}

/** Muestra la lectura de la regla (AC-07) y los controles de recorte (AC-08). */
export function MeasurePanel({
  tool,
  rulerMeasure,
  cropRange,
  isCropped,
  onConfirmCrop,
  onClearPicks,
  onUndoCrop,
}: MeasurePanelProps) {
  if (tool !== 'ruler' && tool !== 'crop' && !isCropped) return null;

  return (
    <section className="measure" aria-label="Medición y recorte">
      {tool === 'ruler' && rulerMeasure && (
        <p className="measure__row">
          Δtiempo = <strong>{rulerMeasure.dt.toFixed(3)} s</strong>{' '}
          ({(rulerMeasure.dt * 1000).toFixed(0)} ms) · Δamplitud ={' '}
          <strong>{rulerMeasure.damp.toFixed(3)} mV</strong>
        </p>
      )}

      {tool === 'crop' && cropRange && (
        <p className="measure__row">
          Recortar a{' '}
          <strong>
            {cropRange.from.toFixed(3)}–{cropRange.to.toFixed(3)} s
          </strong>
          <button type="button" onClick={onConfirmCrop}>
            Recortar
          </button>
          <button type="button" onClick={onClearPicks}>
            Cancelar
          </button>
        </p>
      )}

      {isCropped && (
        <p className="measure__row">
          Mostrando señal <strong>recortada</strong>.
          <button type="button" onClick={onUndoCrop}>
            Deshacer recorte
          </button>
        </p>
      )}
    </section>
  );
}
