import { api } from './cliente'
import type { HojaLeidaDto, LeerHojaRequest } from '../tipos/api'

/**
 * Lee planillas de Google Sheets compartidas por enlace. La lectura la hace el
 * backend, asi que el navegador nunca habla con Google.
 */
export const integracionesApi = {
  /** Los nombres de las pestañas del libro, para poder elegir una. */
  listarPestanas: (url: string) => {
    const cuerpo: LeerHojaRequest = { url }
    return api.post<string[]>('/api/integraciones/hojas/pestanas', cuerpo)
  },

  leerHoja: (url: string, pestana: string, rango?: string) => {
    const cuerpo: LeerHojaRequest = { url, pestana, rango: rango?.trim() || null }
    return api.post<HojaLeidaDto>('/api/integraciones/hojas/leer', cuerpo)
  },
}
