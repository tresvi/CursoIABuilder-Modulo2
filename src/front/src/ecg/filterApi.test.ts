import { describe, it, expect } from 'vitest';
import { estimateSampleRate } from './filterApi';

describe('estimateSampleRate', () => {
  it('estima 250 Hz para Δt = 0.004 s', () => {
    const time = Array.from({ length: 10 }, (_, i) => i * 0.004);
    expect(estimateSampleRate(time)).toBeCloseTo(250, 6);
  });

  it('usa la mediana y tolera un Δt atípico', () => {
    // Δt regulares de 0.01 s con un salto grande en el medio.
    const time = [0, 0.01, 0.02, 0.03, 5, 5.01, 5.02];
    expect(estimateSampleRate(time)).toBeCloseTo(100, 6);
  });

  it('devuelve 0 con menos de 2 muestras', () => {
    expect(estimateSampleRate([1])).toBe(0);
  });
});
