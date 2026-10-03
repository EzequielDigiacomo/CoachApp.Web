/**
 * Cliente HTTP de la API. Adjunta el token JWT y traduce los errores
 * del backend a mensajes mostrables.
 */

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

export class ApiError extends Error {
  readonly status: number

  constructor(mensaje: string, status: number) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(opciones.headers)
  const token = localStorage.getItem(CLAVE_TOKEN)

  if (opciones.body) {
    cabeceras.set('Content-Type', 'application/json')
  }
  if (token) {
    cabeceras.set('Authorization', `Bearer ${token}`)
  }

  const respuesta = await fetch(`${BASE}${ruta}`, { ...opciones, headers: cabeceras })

  // Un 401 en una ruta publica (el login) son credenciales invalidas: hay que
  // seguir de largo para mostrar el mensaje que devuelve el backend.
  if (respuesta.status === 401 && !esRutaPublica(ruta)) {
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
    throw new ApiError('La sesión venció. Iniciá sesión de nuevo.', 401)
  }

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}`
    try {
      const cuerpo = await respuesta.json()
      if (cuerpo?.mensaje) {
        mensaje = cuerpo.mensaje
      } else if (cuerpo?.errors) {
        // Errores de validacion del modelo: { Campo: ["mensaje", ...] }
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

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),

  post: <T>(ruta: string, cuerpo: unknown) =>
    pedir<T>(ruta, { method: 'POST', body: JSON.stringify(cuerpo) }),

  put: <T>(ruta: string, cuerpo: unknown) =>
    pedir<T>(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) }),

  patch: <T>(ruta: string, cuerpo: unknown) =>
    pedir<T>(ruta, { method: 'PATCH', body: JSON.stringify(cuerpo) }),

  delete: <T = void>(ruta: string) => pedir<T>(ruta, { method: 'DELETE' }),
}
