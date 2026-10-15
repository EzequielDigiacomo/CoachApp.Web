/**
 * Conversion de tiempos entre el texto que escribe el entrenador y las
 * centesimas que usamos para calcular. Es el espejo de Entidades/Util/TiempoTexto.cs,
 * y existe para poder mostrar el parcial calculado mientras se carga.
 */

/** Pasa un tiempo escrito a centesimas. null si no se entiende. */
export function parsearTiempo(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!limpio) {
    return null
  }

  const partes = limpio.split(':')
  if (partes.length === 0 || partes.length > 3) {
    return null
  }

  const ultima = Number(partes[partes.length - 1])
  if (!Number.isFinite(ultima) || ultima < 0 || (partes.length > 1 && ultima >= 60)) {
    return null
  }

  let minutosTotales = 0
  if (partes.length === 3) {
    const horas = Number(partes[0])
    const minutos = Number(partes[1])
    if (!Number.isInteger(horas) || horas < 0 || !Number.isInteger(minutos) || minutos < 0 || minutos > 59) {
      return null
    }
    minutosTotales = horas * 60 + minutos
  } else if (partes.length === 2) {
    const minutos = Number(partes[0])
    if (!Number.isInteger(minutos) || minutos < 0) {
      return null
    }
    minutosTotales = minutos
  }

  return Math.round((minutosTotales * 60 + ultima) * 100)
}

/**
 * Suma tiempos escritos, cada uno la duracion de su parcial. "2:16" + "2:14" +
 * "0:30" da "5:00". null si ninguno se entiende.
 */
export function sumarTiempos(textos: string[]): string | null {
  let total = 0
  let alguno = false

  for (const texto of textos) {
    const centesimas = parsearTiempo(texto)
    if (centesimas === null) {
      continue
    }

    total += centesimas
    alguno = true
  }

  return alguno ? formatearTiempo(total) : null
}

/**
 * Velocidad en km/h. 500 m en 136 segundos (2:16) dan 13,24.
 * null si falta la distancia o el tiempo.
 */
export function kilometrosPorHora(metros: number, tiempo: string): number | null {
  const centesimas = parsearTiempo(tiempo)
  if (centesimas === null || centesimas <= 0 || !(metros > 0)) {
    return null
  }

  return (metros * 360) / centesimas
}

/** La misma velocidad, lista para mostrar: "13,2". */
export function velocidadKmh(metros: number, tiempo: string): string | null {
  const kmh = kilometrosPorHora(metros, tiempo)
  return kmh === null ? null : textoKmh(kmh)
}

/** Un número de km/h con un decimal, como se escribe en la tabla. */
export function textoKmh(kmh: number): string {
  return kmh.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** Pasa centesimas a texto: "4:30" o "1:02:03.5". */
export function formatearTiempo(centesimas: number): string {
  const total = Math.round(centesimas)

  const horas = Math.floor(total / 360000)
  const minutos = Math.floor((total % 360000) / 6000)
  const segundos = Math.floor((total % 6000) / 100)
  const fraccion = total % 100

  const sufijo = fraccion > 0 ? `.${String(fraccion).padStart(2, '0')}`.replace(/0+$/, '') : ''
  const segundosTexto = String(segundos).padStart(2, '0')

  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, '0')}:${segundosTexto}${sufijo}`
    : `${minutos}:${segundosTexto}${sufijo}`
}

/** Partes de un tiempo para el campo m:ss,cc. Vacío se ve como 00:00,00. */
export function partirTiempoCampo(texto: string): { m: string; s: string; c: string } {
  const total = parsearTiempo(texto)
  if (total === null) {
    return { m: '00', s: '00', c: '00' }
  }

  const minutos = Math.floor(total / 6000)
  const segundos = Math.floor((total % 6000) / 100)
  const centesimas = total % 100

  return {
    m: String(minutos).padStart(2, '0'),
    s: String(segundos).padStart(2, '0'),
    c: String(centesimas).padStart(2, '0'),
  }
}

/**
 * Arma el texto que ya entiende el resto de la app. Si sigue en cero, queda
 * vacío: la fila no se tocó.
 */
export function armarTiempoCampo(partes: { m: string; s: string; c: string }): string {
  const minutos = Number(partes.m) || 0
  const segundos = Math.min(59, Number(partes.s) || 0)
  const centesimas = Math.min(99, Number(partes.c) || 0)

  if (minutos === 0 && segundos === 0 && centesimas === 0) {
    return ''
  }

  return `${minutos}:${String(segundos).padStart(2, '0')},${String(centesimas).padStart(2, '0')}`
}

/** true si el texto es una hora del dia valida ("09:30"). */
export function esHoraValida(texto: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(texto.trim())
}
