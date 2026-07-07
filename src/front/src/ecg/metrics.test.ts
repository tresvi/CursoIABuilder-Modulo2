import { describe, it, expect } from 'vitest';
import { detectRPeaks, hrvFromPeakTimes, computeMetrics } from './metrics';

/** Genera una señal sintética con un pico gaussiano en cada segundo entero + 0.5. */
function gaussianPeaks(fs: number, durSec: number): { time: number[]; value: number[] } {
  const time: number[] = [];
  const value: number[] = [];
  const centers: number[] = [];
  for (let k = 0; k < durSec; k++) centers.push(k + 0.5);
  for (let i = 0; i < fs * durSec; i++) {
    const t = i / fs;
    let v = 0;
    for (const c of centers) v += Math.exp(-((t - c) ** 2) / (2 * 0.01 ** 2));
    time.push(t);
    value.push(v);
  }
  return { time, value };
}

describe('hrvFromPeakTimes', () => {
  it('BPM con RR constante de 1 s = 60 bpm, sin variabilidad', () => {
    const m = hrvFromPeakTimes([0, 1, 2, 3, 4]);
    expect(m.bpm).toBeCloseTo(60, 6);
    expect(m.sdnn).toBeCloseTo(0, 6);
    expect(m.rmssd).toBeCloseTo(0, 6);
    expect(m.pnn50).toBeCloseTo(0, 6);
    expect(m.beats).toBe(5);
  });

  it('devuelve todo null con menos de 2 picos', () => {
    const m = hrvFromPeakTimes([1]);
    expect(m.bpm).toBeNull();
    expect(m.sdnn).toBeNull();
    expect(m.beats).toBe(1);
  });

  it('calcula SDNN/RMSSD/pNN50 con intervalos conocidos', () => {
    // Picos en 0, 0.8, 1.7 s => RR = [800, 900] ms.
    const m = hrvFromPeakTimes([0, 0.8, 1.7]);
    expect(m.bpm).toBeCloseTo(60000 / 850, 4); // ~70.59
    // SDNN poblacional de [800, 900]: media 850, var 2500 -> 50 ms.
    expect(m.sdnn).toBeCloseTo(50, 6);
    // diffs = [100] -> RMSSD = 100 ms.
    expect(m.rmssd).toBeCloseTo(100, 6);
    // |100| > 50 -> pNN50 = 100 %.
    expect(m.pnn50).toBeCloseTo(100, 6);
  });
});

describe('detectRPeaks', () => {
  it('detecta un pico por segundo en una señal sintética', () => {
    const { time, value } = gaussianPeaks(200, 5);
    expect(detectRPeaks(time, value).length).toBe(5);
  });

  it('no detecta picos en señal plana', () => {
    const time = Array.from({ length: 100 }, (_, i) => i / 100);
    const value = new Array(100).fill(0);
    expect(detectRPeaks(time, value)).toEqual([]);
  });
});

describe('computeMetrics', () => {
  it('respeta la ventana visible: menos latidos en un subrango (AC-13/AC-14)', () => {
    const { time, value } = gaussianPeaks(200, 5); // picos en 0.5,1.5,2.5,3.5,4.5
    const full = computeMetrics(time, value);
    const win = computeMetrics(time, value, { from: 0, to: 2.9 });
    expect(full.beats).toBe(5);
    expect(win.beats).toBe(3);
    expect(full.bpm).toBeCloseTo(60, 4); // RR de 1 s
  });
});
