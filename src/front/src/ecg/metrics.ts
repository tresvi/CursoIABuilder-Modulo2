/** Métricas cardíacas calculadas sobre una ventana de señal (RF-07). */
export interface EcgMetrics {
  /** Frecuencia cardíaca (latidos por minuto). */
  bpm: number | null;
  /** Desviación estándar de los intervalos NN (ms). */
  sdnn: number | null;
  /** Raíz de la media de las diferencias sucesivas al cuadrado (ms). */
  rmssd: number | null;
  /** % de pares NN consecutivos cuya diferencia supera 50 ms. */
  pnn50: number | null;
  /** Cantidad de picos R detectados en la ventana. */
  beats: number;
}

export interface TimeRange {
  from: number;
  to: number;
}

const EMPTY_METRICS: EcgMetrics = {
  bpm: null,
  sdnn: null,
  rmssd: null,
  pnn50: null,
  beats: 0,
};

function mean(xs: number[]): number {
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/**
 * Detección simple de picos R por umbral + período refractario.
 * Umbral = 50% del rango de amplitud de la ventana; período refractario de
 * 250 ms (descarta dobles detecciones, tope fisiológico ~240 bpm).
 *
 * Es un detector de primera pasada: sobre señal ruidosa conviene filtrar antes
 * (RF-04). Recorre la señal una sola vez → O(n), holgado para RNF-03.
 */
export function detectRPeaks(time: number[], value: number[]): number[] {
  const n = value.length;
  if (n < 3) return [];

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    if (value[i] < min) min = value[i];
    if (value[i] > max) max = value[i];
  }
  if (!(max > min)) return [];

  const threshold = min + 0.5 * (max - min);
  const refractorySec = 0.25;
  const peaks: number[] = [];

  let i = 0;
  while (i < n) {
    if (value[i] > threshold) {
      // Recorre la región contigua por encima del umbral y toma su máximo.
      let j = i;
      let localMax = i;
      while (j < n && value[j] > threshold) {
        if (value[j] > value[localMax]) localMax = j;
        j++;
      }
      const last = peaks[peaks.length - 1];
      if (last === undefined || time[localMax] - time[last] > refractorySec) {
        peaks.push(localMax);
      } else if (value[localMax] > value[last]) {
        // Dentro del período refractario nos quedamos con el pico más alto.
        peaks[peaks.length - 1] = localMax;
      }
      i = j;
    } else {
      i++;
    }
  }

  return peaks;
}

/**
 * Calcula BPM, SDNN, RMSSD y pNN50 a partir de los instantes (en segundos) de
 * los picos R. SDNN usa desviación estándar poblacional (÷N).
 */
export function hrvFromPeakTimes(peakTimesSec: number[]): EcgMetrics {
  const beats = peakTimesSec.length;
  if (beats < 2) return { ...EMPTY_METRICS, beats };

  // Intervalos RR en milisegundos.
  const rr: number[] = [];
  for (let i = 1; i < peakTimesSec.length; i++) {
    rr.push((peakTimesSec[i] - peakTimesSec[i - 1]) * 1000);
  }

  const meanRR = mean(rr);
  const bpm = meanRR > 0 ? 60000 / meanRR : null;

  let sdnn: number | null = null;
  let rmssd: number | null = null;
  let pnn50: number | null = null;

  if (rr.length >= 2) {
    sdnn = Math.sqrt(mean(rr.map((x) => (x - meanRR) ** 2)));

    const diffs: number[] = [];
    for (let i = 1; i < rr.length; i++) diffs.push(rr[i] - rr[i - 1]);
    rmssd = Math.sqrt(mean(diffs.map((d) => d * d)));

    const nn50 = diffs.filter((d) => Math.abs(d) > 50).length;
    pnn50 = (nn50 / diffs.length) * 100;
  }

  return { bpm, sdnn, rmssd, pnn50, beats };
}

/**
 * Calcula las métricas sobre la ventana visible [range.from, range.to] (AC-13).
 * Si no se pasa rango, usa toda la señal. Respeta el orden del archivo.
 */
export function computeMetrics(
  time: number[],
  value: number[],
  range?: TimeRange,
): EcgMetrics {
  const t: number[] = [];
  const v: number[] = [];
  for (let i = 0; i < time.length; i++) {
    if (!range || (time[i] >= range.from && time[i] <= range.to)) {
      t.push(time[i]);
      v.push(value[i]);
    }
  }

  const peaks = detectRPeaks(t, v);
  const peakTimes = peaks.map((idx) => t[idx]);
  return hrvFromPeakTimes(peakTimes);
}
