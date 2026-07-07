/** Marcador de evento anclado a un instante de tiempo (RF-02). */
export interface EcgMarker {
  id: string;
  /** Instante en segundos sobre el eje temporal. */
  time: number;
  /** Etiqueta / comentario del evento (editable). */
  label: string;
}

/** Crea un marcador nuevo en el instante dado. */
export function createMarker(time: number, label = ''): EcgMarker {
  return { id: crypto.randomUUID(), time, label };
}

/** Devuelve los marcadores ordenados por tiempo (sin mutar el arreglo). */
export function sortedByTime(markers: EcgMarker[]): EcgMarker[] {
  return [...markers].sort((a, b) => a.time - b.time);
}

/** Actualiza la etiqueta de un marcador (AC-05). */
export function updateLabel(
  markers: EcgMarker[],
  id: string,
  label: string,
): EcgMarker[] {
  return markers.map((m) => (m.id === id ? { ...m, label } : m));
}

/** Elimina un marcador (AC-05). */
export function removeMarker(markers: EcgMarker[], id: string): EcgMarker[] {
  return markers.filter((m) => m.id !== id);
}
