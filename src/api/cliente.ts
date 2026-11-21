/**
 * Cliente HTTP de la API. Adjunta el token JWT, soporta AbortSignal
 * (React Query cancela requests viejos) y traduce errores a mensajes UI.
 */

import { tokenVencido } from '../util/token'

const BASE = import.meta.env.VITE_API_URL ?? ''

export const CLAVE_TOKEN = 'coachapp.token'
export const CLAVE_USUARIO = 'coachapp.usuario'

/** Evento que se dispara cuando el backend rechaza el token por vencido. */
export const EVENTO_SESION_EXPIRADA = 'coachapp:sesion-expirada'

/**
 * Rutas publicas donde un 401 significa "credenciales invalidas", no
 * "sesion vencida". Sin esto el login muestra un mensaje enganoso cuando
 * el usuario o la contrasena estan mal.
 */
const RUTAS_PUBLICAS = ['/api/auth/login']

function esRutaPublica(ruta: string): boolean {
  return RUTAS_PUBLICAS.some((publica) => ruta.startsWith(publica))
}

function avisarSesionExpirada(): never {
  window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
  throw new ApiError('La sesión venció. Iniciá sesión de nuevo.', 401)
}

export class ApiError extends Error {
  readonly status: number

  constructor(mensaje: string, status: number) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
  }

  get esConflicto(): boolean {
    return this.status === 409
  }

  get esDemasiadasPeticiones(): boolean {
    return this.status === 429
  }
}

/** Mensaje listo para UI; prioriza 409/429 con texto claro. */
export function mensajeApi(error: unknown, respaldo: string): string {
  if (error instanceof ApiError) {
    if (error.esDemasiadasPeticiones) {
      return error.message || 'Demasiadas peticiones. Esperá un momento e intentá de nuevo.'
    }
    if (error.esConflicto) {
      return error.message || 'Conflicto: ese recurso ya existe o cambió. Refrescá e intentá de nuevo.'
    }
    return error.message
  }
  return respaldo
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(opciones.headers)
  const token = localStorage.getItem(CLAVE_TOKEN)

  // Si el JWT ya vencio, no pegamos a la API: cerramos sesion al toque.
  if (token && !esRutaPublica(ruta) && tokenVencido(token)) {
    avisarSesionExpirada()
  }

  if (opciones.body) {
    cabeceras.set('Content-Type', 'application/json')
  }
  if (token) {
    cabeceras.set('Authorization', `Bearer ${token}`)
  }

  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}${ruta}`, { ...opciones, headers: cabeceras })
  } catch (error) {
    // Abort de React Query / navegacion: no es un fallo de red para la UI.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    if (opciones.signal?.aborted) {
      throw error
    }
    throw new ApiError('No se pudo conectar con el servidor.', 0)
  }

  // Un 401 en una ruta publica (el login) son credenciales invalidas: hay que
  // seguir de largo para mostrar el mensaje que devuelve el backend.
  if (respuesta.status === 401 && !esRutaPublica(ruta)) {
    avisarSesionExpirada()
  }

  if (!respuesta.ok) {
    let mensaje = mensajePorEstado(respuesta.status)
    try {
      const cuerpo = await respuesta.json()
      if (cuerpo?.mensaje) {
        mensaje = cuerpo.mensaje
      } else if (cuerpo?.errors) {
        const detalles = Object.values(cuerpo.errors as Record<string, string[]>)
          .flat()
          .filter((texto): texto is string => Boolean(texto))
        if (detalles.length > 0) {
          mensaje = detalles.join(' ')
        }
      } else if (cuerpo?.title) {
        mensaje = cuerpo.title
      }
    } catch {
      // El backend no devolvio JSON, se usa el mensaje generico.
    }
    throw new ApiError(mensaje, respuesta.status)
  }

  if (respuesta.status === 204) {
    return undefined as T
  }

  return (await respuesta.json()) as T
}

function mensajePorEstado(status: number): string {
  if (status === 409) {
    return 'Conflicto: ese recurso ya existe o cambió. Refrescá e intentá de nuevo.'
  }
  if (status === 429) {
    return 'Demasiadas peticiones. Esperá un momento e intentá de nuevo.'
  }
  return `Error ${status}`
}

export const api = {
  get: <T>(ruta: string, opciones?: RequestInit) => pedir<T>(ruta, opciones),

  post: <T>(ruta: string, cuerpo: unknown, opciones?: RequestInit) =>
    pedir<T>(ruta, { ...opciones, method: 'POST', body: JSON.stringify(cuerpo) }),

  put: <T>(ruta: string, cuerpo: unknown, opciones?: RequestInit) =>
    pedir<T>(ruta, { ...opciones, method: 'PUT', body: JSON.stringify(cuerpo) }),

  patch: <T>(ruta: string, cuerpo: unknown, opciones?: RequestInit) =>
    pedir<T>(ruta, { ...opciones, method: 'PATCH', body: JSON.stringify(cuerpo) }),

  delete: <T = void>(ruta: string, opciones?: RequestInit) =>
    pedir<T>(ruta, { ...opciones, method: 'DELETE' }),
}
