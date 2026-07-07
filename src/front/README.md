# ECGViewer — Frontend

React 19 + TypeScript + Vite. Visor de señales ECG de un canal desde CSV.

## Scripts

- `npm install` — instala dependencias.
- `npm run dev` — servidor de desarrollo.
- `npm run build` — chequeo de tipos (`tsc --noEmit`) + build de producción.
- `npm run test` — tests unitarios (Vitest).
- `npx playwright test` — tests E2E (a futuro).

## Formato CSV esperado (RF-01)

- Primera línea: encabezado con **dos** columnas (tiempo, valor).
- Datos: tiempo en **segundos** (eje X), amplitud en **mV** (eje Y).
- Delimitador: coma, punto y coma o tabulación (autodetectado). Con `;` se admite
  la coma como separador decimal.
- Más de dos columnas => se considera multicanal y **no** se procesa (AC-03).

En `public/sample-ecg.csv` hay una señal sintética de 10 s (250 Hz, ~72 BPM) para probar.
