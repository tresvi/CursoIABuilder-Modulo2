import { useState } from 'react';
import type { FilterType, FilterParams } from '../ecg/filterApi';

interface FilterPanelProps {
  onApply: (params: FilterParams) => void;
  onRevert: () => void;
  isFiltered: boolean;
  busy: boolean;
}

const TYPES: { value: FilterType; label: string }[] = [
  { value: 'LowPass', label: 'Pasa bajo' },
  { value: 'HighPass', label: 'Pasa alto' },
  { value: 'BandPass', label: 'Pasa banda' },
  { value: 'Notch', label: 'Notch (rechaza banda)' },
];

export function FilterPanel({ onApply, onRevert, isFiltered, busy }: FilterPanelProps) {
  const [type, setType] = useState<FilterType>('LowPass');
  const [low, setLow] = useState('0.5');
  const [high, setHigh] = useState('40');

  const needsLow = type === 'HighPass' || type === 'BandPass' || type === 'Notch';
  const needsHigh = type === 'LowPass' || type === 'BandPass' || type === 'Notch';

  function handleApply() {
    onApply({
      type,
      lowCutoff: needsLow ? Number(low) : undefined,
      highCutoff: needsHigh ? Number(high) : undefined,
    });
  }

  return (
    <section className="filters" aria-label="Filtros digitales">
      <h2>Filtros</h2>
      <div className="filters__row">
        <label className="filters__field">
          <span>Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FilterType)}
            disabled={busy}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {needsLow && (
          <label className="filters__field">
            <span>Corte inferior (Hz)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={low}
              onChange={(e) => setLow(e.target.value)}
              disabled={busy}
            />
          </label>
        )}

        {needsHigh && (
          <label className="filters__field">
            <span>Corte superior (Hz)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={high}
              onChange={(e) => setHigh(e.target.value)}
              disabled={busy}
            />
          </label>
        )}

        <button type="button" onClick={handleApply} disabled={busy}>
          {busy ? 'Aplicando…' : 'Aplicar filtro'}
        </button>
        <button type="button" onClick={onRevert} disabled={busy || !isFiltered}>
          Revertir a original
        </button>
      </div>

      {isFiltered && (
        <p className="filters__status">
          Mostrando la señal <strong>filtrada</strong>. «Revertir» vuelve a la
          original sin alterarla.
        </p>
      )}
    </section>
  );
}
