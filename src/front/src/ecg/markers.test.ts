import { describe, it, expect } from 'vitest';
import {
  createMarker,
  sortedByTime,
  updateLabel,
  removeMarker,
} from './markers';

describe('markers', () => {
  it('crea un marcador con id único y etiqueta vacía por defecto', () => {
    const a = createMarker(1.5);
    const b = createMarker(1.5);
    expect(a.time).toBe(1.5);
    expect(a.label).toBe('');
    expect(a.id).not.toBe(b.id);
  });

  it('ordena por tiempo sin mutar el original', () => {
    const ms = [createMarker(3), createMarker(1), createMarker(2)];
    const sorted = sortedByTime(ms);
    expect(sorted.map((m) => m.time)).toEqual([1, 2, 3]);
    expect(ms.map((m) => m.time)).toEqual([3, 1, 2]); // intacto
  });

  it('actualiza la etiqueta de un marcador (AC-05)', () => {
    const m = createMarker(2);
    const updated = updateLabel([m], m.id, 'arritmia');
    expect(updated[0].label).toBe('arritmia');
    expect(m.label).toBe(''); // no muta el original
  });

  it('elimina un marcador (AC-05)', () => {
    const a = createMarker(1);
    const b = createMarker(2);
    const result = removeMarker([a, b], a.id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(b.id);
  });
});
