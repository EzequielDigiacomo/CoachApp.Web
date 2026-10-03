/**
 * Detecta las direcciones web dentro de un texto, para poder mostrarlas como
 * enlaces.
 */

/** Una parte del texto: o es texto comun, o es un enlace. */
export interface ParteTexto {
  texto: string
  /** Presente solo cuando la parte es un enlace. */
  url?: string
}

/**
 * Solo http y https. A proposito: un "javascript:" o un "data:" tambien son
 * direcciones, y no queremos ofrecer como enlace algo que pueda ejecutar algo.
 */
const PATRON = /https?:\/\/[^\s<>"']+/gi

/** Cuantas veces aparece un caracter en el texto. */
function contar(texto: string, caracter: string): number {
  let total = 0

  for (const letra of texto) {
    if (letra === caracter) {
      total++
    }
  }

  return total
}

/**
 * La puntuacion que va pegada al final de una direccion casi nunca es parte de
 * la direccion: en "mirá https://ejemplo.com." el punto cierra la oracion.
 */
function recortarPuntuacion(url: string): string {
  let limpio = url

  while (limpio.length > 0 && '.,;:!?'.includes(limpio[limpio.length - 1])) {
    limpio = limpio.slice(0, -1)
  }

  // Un parentesis final es parte de la direccion solo si abre uno antes: en
  // "(ver https://es.wikipedia.org/wiki/Perro)" el parentesis cierra el texto.
  while (limpio.endsWith(')') && contar(limpio, '(') < contar(limpio, ')')) {
    limpio = limpio.slice(0, -1)
  }

  return limpio
}

/**
 * Parte un texto en tramos, marcando cuales son direcciones web. No interpreta
 * ni reformatea nada mas: el texto sale tal cual estaba.
 */
export function partirEnlaces(texto: string): ParteTexto[] {
  const partes: ParteTexto[] = []
  let ultimo = 0

  for (const coincidencia of texto.matchAll(PATRON)) {
    const inicio = coincidencia.index ?? 0
    const bruto = coincidencia[0]
    const url = recortarPuntuacion(bruto)

    if (inicio > ultimo) {
      partes.push({ texto: texto.slice(ultimo, inicio) })
    }

    if (url.length > 0) {
      partes.push({ texto: url, url })
    }

    // Lo que se recorto (el punto final, por ejemplo) queda como texto suelto.
    const resto = bruto.slice(url.length)
    if (resto.length > 0) {
      partes.push({ texto: resto })
    }

    ultimo = inicio + bruto.length
  }

  if (ultimo < texto.length) {
    partes.push({ texto: texto.slice(ultimo) })
  }

  return partes
}
