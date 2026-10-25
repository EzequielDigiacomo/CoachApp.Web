/**
 * Lectura del vencimiento del JWT sin librerias.
 * El payload es base64url; si no se puede leer, se trata como vencido.
 */

/** Devuelve la fecha de vencimiento del token, o null si no se puede leer. */
export function expiracionDelToken(token: string): Date | null {
  const partes = token.split('.')
  if (partes.length < 2) {
    return null
  }

  try {
    const json = atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { exp?: unknown }
    if (typeof payload.exp !== 'number') {
      return null
    }
    return new Date(payload.exp * 1000)
  } catch {
    return null
  }
}

/** True si el token ya vencio o no se puede interpretar. */
export function tokenVencido(token: string, margenMs = 5_000): boolean {
  const expira = expiracionDelToken(token)
  if (!expira) {
    return true
  }
  return expira.getTime() <= Date.now() + margenMs
}

/** Ms hasta el vencimiento (0 si ya vencio). */
export function msHastaVencimiento(token: string): number {
  const expira = expiracionDelToken(token)
  if (!expira) {
    return 0
  }
  return Math.max(0, expira.getTime() - Date.now())
}
