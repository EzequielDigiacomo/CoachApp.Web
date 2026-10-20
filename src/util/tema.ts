export type Tema = 'claro' | 'oscuro'

export const CLAVE_TEMA = 'coachapp.tema'

/** Lee el tema guardado o, si no hay, el del sistema. */
export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA)
    if (guardado === 'claro' || guardado === 'oscuro') {
      return guardado
    }
  } catch {
    // localStorage puede fallar en modo privado.
  }

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'oscuro'
  }

  return 'claro'
}

/** Aplica el tema al documento (atributo data-tema en <html>). */
export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema
  document.documentElement.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light'
}

export function guardarTema(tema: Tema) {
  aplicarTema(tema)
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
    // Sin persistencia: el tema igual queda aplicado en la sesion.
  }
}

export function alternarTema(actual: Tema): Tema {
  const siguiente: Tema = actual === 'oscuro' ? 'claro' : 'oscuro'
  guardarTema(siguiente)
  return siguiente
}
