import { describe, it, expect } from 'vitest';
import { parseEcgCsv } from './parseEcgCsv';

describe('parseEcgCsv', () => {
  it('parsea un CSV válido de un canal (AC-01)', () => {
    const csv = 'tiempo,valor\n0,0.1\n0.004,0.2\n0.008,-0.1';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.signal.time).toEqual([0, 0.004, 0.008]);
      expect(r.signal.value).toEqual([0.1, 0.2, -0.1]);
      expect(r.signal.label).toEqual({ time: 'tiempo', value: 'valor' });
    }
  });

  it('respeta el orden temporal del archivo, sin reordenar (AC-01)', () => {
    const csv = 'tiempo,valor\n2,1\n1,2\n3,3';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.signal.time).toEqual([2, 1, 3]);
  });

  it('rechaza valores no numéricos con mensaje específico (AC-02)', () => {
    const csv = 'tiempo,valor\n0,0.1\n0.004,abc';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no numérico/i);
  });

  it('rechaza un encabezado numérico / faltante (AC-02)', () => {
    const csv = '0,0.1\n0.004,0.2';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/encabezado/i);
  });

  it('rechaza filas con columnas faltantes (AC-02)', () => {
    const csv = 'tiempo,valor\n0';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(false);
  });

  it('rechaza un archivo vacío (AC-02)', () => {
    expect(parseEcgCsv('   \n  ').ok).toBe(false);
  });

  it('informa multicanal y no procesa cuando hay más de 2 columnas (AC-03)', () => {
    const csv = 'tiempo,valor1,valor2\n0,0.1,0.2\n0.004,0.3,0.4';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/canal/i);
  });

  it('soporta delimitador ";" con coma decimal', () => {
    const csv = 'tiempo;valor\n0;0,1\n0,004;0,2';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.signal.time).toEqual([0, 0.004]);
      expect(r.signal.value).toEqual([0.1, 0.2]);
    }
  });

  it('ignora líneas en blanco intermedias y finales', () => {
    const csv = 'tiempo,valor\n0,0.1\n\n0.004,0.2\n';
    const r = parseEcgCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.signal.value).toEqual([0.1, 0.2]);
  });
});
