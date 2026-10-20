/**
 * 1RM aproximado con regla de tres: los kilos cargados son ese porcentaje de
 * una repeticion al 100 %. Si 55 kg son el 80 %, el RM es 55 * 100 / 80.
 */
export function textoRmAproximado(
  porcentaje: number | null | undefined,
  kilos: number | null | undefined,
): string {
  if (porcentaje == null || kilos == null || porcentaje <= 0) {
    return '—'
  }

  const rm = (kilos * 100) / porcentaje
  return rm.toLocaleString('es-AR', { maximumFractionDigits: 1 })
}

/** Lo mismo, a partir de lo que se esta escribiendo en el formulario. */
export function textoRmDeTexto(porcentaje: string, kilos: string): string {
  if (!porcentaje.trim() || !kilos.trim()) {
    return '—'
  }

  const pct = Number(porcentaje)
  const kg = Number(kilos.replace(',', '.'))
  if (!Number.isFinite(pct) || !Number.isFinite(kg)) {
    return '—'
  }

  return textoRmAproximado(pct, kg)
}

export interface FilaPorcentajeRm {
  porcentaje: number
  kilos: number
}

/**
 * Grilla de porcentajes del 30 % al 100 % en pasos de 5, a partir del 1RM.
 * Los kilos se redondean al 0,5 kg mas cercano.
 */
export function grillaPorcentajes(unoRmKg: number): FilaPorcentajeRm[] {
  if (!Number.isFinite(unoRmKg) || unoRmKg <= 0) {
    return []
  }

  const filas: FilaPorcentajeRm[] = []
  for (let porcentaje = 30; porcentaje <= 100; porcentaje += 5) {
    const crudo = (unoRmKg * porcentaje) / 100
    filas.push({ porcentaje, kilos: Math.round(crudo * 2) / 2 })
  }
  return filas
}

/** Formatea kilos para mostrar en la grilla (es-AR). */
export function textoKilos(kilos: number): string {
  return kilos.toLocaleString('es-AR', { maximumFractionDigits: 1 })
}
