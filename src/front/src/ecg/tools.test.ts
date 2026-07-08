import { describe, it, expect } from 'vitest';
import { measure, sliceSignal, sampleValueAt } from './tools';
import type { EcgSignal } from './types';

const signal: EcgSignal = {
  time: [0, 1, 2, 3, 4],
  value: [10, 11, 12, 13, 14],
  label: { time: 'tiempo', value: 'valor' },
};

describe('measure', () => {
  it('calcula Δtiempo y Δamplitud en valor absoluto (AC-07)', () => {
    const m = measure({ time: 1, value: 0.2 }, { time: 3.5, value: 0.5 });
    expect(m.dt).toBeCloseTo(2.5, 6);
    expect(m.damp).toBeCloseTo(0.3, 6);
  });

  it('es simétrica en el orden de los puntos', () => {
    const a = measure({ time: 3, value: 1 }, { time: 1, value: 0 });
    expect(a.dt).toBeCloseTo(2, 6);
    expect(a.damp).toBeCloseTo(1, 6);
  });
});

describe('sliceSignal', () => {
  it('acota la señal al rango, inclusive en los bordes (AC-08)', () => {
    const s = sliceSignal(signal, 1, 3);
    expect(s.time).toEqual([1, 2, 3]);
    expect(s.value).toEqual([11, 12, 13]);
  });

  it('acepta los límites en cualquier orden', () => {
    const s = sliceSignal(signal, 3, 1);
    expect(s.time).toEqual([1, 2, 3]);
  });

  it('no muta la señal original', () => {
    sliceSignal(signal, 1, 2);
    expect(signal.time).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('sampleValueAt', () => {
  it('devuelve el valor de la muestra más cercana', () => {
    expect(sampleValueAt(signal, 2.1)).toBe(12);
    expect(sampleValueAt(signal, 3.9)).toBe(14);
  });
});
