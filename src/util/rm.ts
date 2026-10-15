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
