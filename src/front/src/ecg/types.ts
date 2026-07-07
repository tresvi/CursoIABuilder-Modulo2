/** Señal ECG de un solo canal, con arreglos paralelos tiempo/valor. */
export interface EcgSignal {
  /** Tiempo en segundos (eje X). */
  time: number[];
  /** Amplitud en mV (eje Y). */
  value: number[];
  /** Etiquetas de las columnas leídas del encabezado del archivo. */
  label: { time: string; value: string };
}

/** Resultado del parseo de un archivo CSV de ECG. */
export type ParseResult =
  | { ok: true; signal: EcgSignal }
  | { ok: false; error: string };
