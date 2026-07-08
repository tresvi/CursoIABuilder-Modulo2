import type { EcgSignal } from './types';

/** Herramienta activa del gráfico (RF-03). */
export type ChartTool = 'navigate' | 'marker' | 'ruler' | 'crop';

/** Punto elegido sobre el trazo (para regla y recorte). */
export interface PickedPoint {
  time: number;
  value: number;
}

/** Resultado de la regla: diferencias de tiempo y amplitud (AC-07). */
export interface RulerMeasure {
  /** Δtiempo en segundos (absoluto). */
  dt: number;
  /** Δamplitud en mV (absoluto). */
  damp: number;
}

export function measure(a: PickedPoint, b: PickedPoint): RulerMeasure {
  return { dt: Math.abs(b.time - a.time), damp: Math.abs(b.value - a.value) };
}

/**
 * Genera una nueva señal acotada al rango [from, to] (AC-08), sin mutar la
 * original. Acepta los límites en cualquier orden. Respeta el orden del archivo.
 */
export function sliceSignal(signal: EcgSignal, from: number, to: number): EcgSignal {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const time: number[] = [];
  const value: number[] = [];
  for (let i = 0; i < signal.time.length; i++) {
    if (signal.time[i] >= lo && signal.time[i] <= hi) {
      time.push(signal.time[i]);
      value.push(signal.value[i]);
    }
  }
  return { ...signal, time, value };
}

/** Devuelve el valor de la muestra más cercana a un instante dado. */
export function sampleValueAt(signal: EcgSignal, time: number): number {
  const times = signal.time;
  if (times.length === 0) return NaN;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(times[i] - time);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return signal.value[bestIdx];
}
