import { sortedByTime, type EcgMarker } from '../ecg/markers';

interface MarkersPanelProps {
  markers: EcgMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export function MarkersPanel({
  markers,
  selectedId,
  onSelect,
  onUpdateLabel,
  onDelete,
}: MarkersPanelProps) {
  return (
    <section className="markers" aria-label="Marcadores de eventos">
      <h2>Marcadores ({markers.length})</h2>

      {markers.length === 0 ? (
        <p className="markers__hint">
          Hacé clic sobre el gráfico para agregar un marcador de evento.
        </p>
      ) : (
        <ul className="markers__list">
          {sortedByTime(markers).map((m) => {
            const selected = m.id === selectedId;
            return (
              <li
                key={m.id}
                className={selected ? 'marker marker--selected' : 'marker'}
              >
                <button
                  type="button"
                  className="marker__time"
                  onClick={() => onSelect(selected ? null : m.id)}
                >
                  {m.time.toFixed(3)} s
                </button>

                {selected ? (
                  <>
                    <input
                      type="text"
                      className="marker__label"
                      placeholder="Etiqueta / comentario"
                      value={m.label}
                      autoFocus
                      onChange={(e) => onUpdateLabel(m.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="marker__delete"
                      onClick={() => onDelete(m.id)}
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <span className="marker__label-text">
                    {m.label || <em>sin etiqueta</em>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
