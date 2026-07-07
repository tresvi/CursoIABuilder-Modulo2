import type { ParseResult } from './types';

type Delimiter = ',' | ';' | '\t';

/** Detecta el delimitador más frecuente en el encabezado (coma, punto y coma o tab). */
function detectDelimiter(headerLine: string): Delimiter {
  const candidates: Delimiter[] = [',', ';', '\t'];
  let best: Delimiter = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function splitLine(line: string, delimiter: Delimiter): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

/**
 * Convierte una celda a número. Cuando el delimitador no es la coma, se admite
 * la coma como separador decimal (formato regional habitual en Excel/ES).
 * Devuelve NaN si la celda está vacía o no es numérica.
 */
function toNumber(raw: string, decimalComma: boolean): number {
  const normalized = decimalComma ? raw.replace(',', '.') : raw;
  if (normalized === '') return NaN;
  return Number(normalized);
}

/**
 * Parsea un CSV de ECG de un canal (RF-01).
 *
 * Reglas:
 * - Primera línea = encabezado con exactamente 2 columnas (tiempo, valor). AC-01
 * - Encabezado numérico o faltante, valores no numéricos o columnas
 *   faltantes => formato inválido, no se dibuja. AC-02
 * - Más de 2 columnas => se asume multicanal, no se procesa. AC-03
 *
 * No reordena ni valida monotonía del tiempo: respeta el orden del archivo (AC-01).
 */
export function parseEcgCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { ok: false, error: 'El archivo está vacío.' };
  }

  const delimiter = detectDelimiter(lines[0]);
  // Si el delimitador es la coma, el decimal no puede ser coma (colisión).
  const decimalComma = delimiter !== ',';
  const headerCols = splitLine(lines[0], delimiter);

  if (headerCols.length < 2) {
    return {
      ok: false,
      error:
        'Formato inválido: el encabezado debe tener dos columnas (tiempo y valor).',
    };
  }
  if (headerCols.length > 2) {
    return {
      ok: false,
      error: `El archivo parece multicanal (${headerCols.length} columnas). ECGViewer solo admite señales de un canal.`,
    };
  }

  // El encabezado debe ser una fila de títulos, no datos numéricos.
  const headerIsNumeric = headerCols.every(
    (cell) => !Number.isNaN(toNumber(cell, decimalComma)),
  );
  if (headerIsNumeric) {
    return {
      ok: false,
      error:
        'Encabezado inválido: la primera línea debe ser un encabezado (por ej. "tiempo,valor"), no datos numéricos.',
    };
  }

  if (lines.length < 2) {
    return {
      ok: false,
      error: 'El archivo no contiene datos: solo se encontró el encabezado.',
    };
  }

  const time: number[] = [];
  const value: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter);

    if (cols.length > 2) {
      return {
        ok: false,
        error: `El archivo parece multicanal (la fila ${i + 1} tiene ${cols.length} columnas). ECGViewer solo admite un canal.`,
      };
    }
    if (cols.length < 2) {
      return {
        ok: false,
        error: `Formato inválido en la fila ${i + 1}: se esperaban 2 columnas y se encontraron ${cols.length}.`,
      };
    }

    const t = toNumber(cols[0], decimalComma);
    const v = toNumber(cols[1], decimalComma);
    if (Number.isNaN(t) || Number.isNaN(v)) {
      return {
        ok: false,
        error: `Valor no numérico en la fila ${i + 1}: "${lines[i]}".`,
      };
    }

    time.push(t);
    value.push(v);
  }

  return {
    ok: true,
    signal: {
      time,
      value,
      label: { time: headerCols[0], value: headerCols[1] },
    },
  };
}
