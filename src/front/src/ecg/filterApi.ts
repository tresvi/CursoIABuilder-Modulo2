import type { EcgSignal } from './types';

export type FilterType = 'LowPass' | 'HighPass' | 'BandPass' | 'Notch';

export interface FilterParams {
  type: FilterType;
  /** Corte inferior en Hz (pasa alto / banda / notch). */
  lowCutoff?: number;
  /** Corte superior en Hz (pasa bajo / banda / notch). */
  highCutoff?: number;
}

/**
 * Estima la frecuencia de muestreo (Hz) a partir de los timestamps, usando la
 * mediana de los Δt (robusta ante irregularidades puntuales).
 */
export function estimateSampleRate(time: number[]): number {
  if (time.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < time.length; i++) diffs.push(time[i] - time[i - 1]);
  diffs.sort((a, b) => a - b);
  const mid = Math.floor(diffs.length / 2);
  const medianDt =
    diffs.length % 2 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2;
  return medianDt > 0 ? 1 / medianDt : 0;
}

/**
 * Envía la señal al backend para filtrarla (RF-04) y devuelve una nueva señal
 * con los mismos timestamps y los valores filtrados. No muta la señal original.
 */
export async function filterSignal(
  signal: EcgSignal,
  params: FilterParams,
): Promise<EcgSignal> {
  const sampleRate = estimateSampleRate(signal.time);

  const response = await fetch('/api/filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sampleRate,
      values: signal.value,
      type: params.type,
      lowCutoff: params.lowCutoff ?? null,
      highCutoff: params.highCutoff ?? null,
    }),
  });

  if (!response.ok) {
    let message = `Error ${response.status} al filtrar la señal.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // respuesta sin cuerpo JSON: se usa el mensaje por defecto
    }
    throw new Error(message);
  }

  const data = (await response.json()) as { values: number[] };
  return { ...signal, value: data.values };
}
