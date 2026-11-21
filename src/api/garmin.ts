import { api } from './cliente'
import type {
  CalendarioGarminDto,
  EstadoGarminDto,
  ImportarGarminRequest,
  PreviewGarminDto,
  SincronizacionGarminDto,
} from '../tipos/api'

export const garminApi = {
  estado: (opciones?: RequestInit) =>
    api.get<EstadoGarminDto>('/api/garmin/estado', opciones),

  vincular: (usuario: string, password: string, opciones?: RequestInit) =>
    api.post<EstadoGarminDto>('/api/garmin/vincular', { usuario, password }, opciones),

  desvincular: (opciones?: RequestInit) => api.delete('/api/garmin', opciones),

  sincronizar: (entrenamientoId: number, opciones?: RequestInit) =>
    api.post<SincronizacionGarminDto>(
      `/api/garmin/sesiones/${entrenamientoId}`,
      {},
      opciones,
    ),

  preview: (entrenamientoId: number, opciones?: RequestInit) =>
    api.post<PreviewGarminDto>(
      `/api/garmin/sesiones/${entrenamientoId}/preview`,
      {},
      opciones,
    ),

  importar: (
    entrenamientoId: number,
    datos: ImportarGarminRequest,
    opciones?: RequestInit,
  ) =>
    api.post<SincronizacionGarminDto>(
      `/api/garmin/sesiones/${entrenamientoId}/importar`,
      datos,
      opciones,
    ),

  calendario: (desde: string, mes = false, opciones?: RequestInit) =>
    api.get<CalendarioGarminDto>(
      `/api/garmin/calendario?desde=${desde}${mes ? '&mes=true' : ''}`,
      opciones,
    ),
}
