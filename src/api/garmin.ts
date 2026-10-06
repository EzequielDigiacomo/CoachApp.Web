import { api } from './cliente'
import type { CalendarioGarminDto, EstadoGarminDto, SincronizacionGarminDto } from '../tipos/api'

export const garminApi = {
  estado: () => api.get<EstadoGarminDto>('/api/garmin/estado'),

  vincular: (usuario: string, password: string) =>
    api.post<EstadoGarminDto>('/api/garmin/vincular', { usuario, password }),

  desvincular: () => api.delete('/api/garmin'),

  sincronizar: (entrenamientoId: number) =>
    api.post<SincronizacionGarminDto>(`/api/garmin/sesiones/${entrenamientoId}`, {}),

  calendario: (desde: string, mes = false) =>
    api.get<CalendarioGarminDto>(`/api/garmin/calendario?desde=${desde}${mes ? '&mes=true' : ''}`),
}
