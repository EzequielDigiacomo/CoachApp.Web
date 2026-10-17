import { api } from './cliente'
import type {
  EquipoDto,
  EquipoEnEntrenamientoDto,
  EntrenamientoDto,
  GuardarTrabajoRequest,
  TipoBote,
  TrabajoDto,
} from '../tipos/api'

export const equiposApi = {
  listar: (incluirInactivos = false) =>
    api.get<EquipoDto[]>(
      `/api/equipos${incluirInactivos ? '?incluirInactivos=true' : ''}`,
    ),

  crear: (tipo: TipoBote, atletaIds: number[]) =>
    api.post<EquipoDto>('/api/equipos', { tipo, atletaIds }),

  actualizar: (id: number, tipo: TipoBote, atletaIds: number[]) =>
    api.put<EquipoDto>(`/api/equipos/${id}`, { tipo, atletaIds }),

  cambiarEstado: (id: number, activo: boolean) =>
    api.patch(`/api/equipos/${id}/estado`, { activo }),

  cargarEnSesion: (
    entrenamientoId: number,
    datos: { equipoId?: number; tipo?: TipoBote; atletaIds?: number[] },
  ) => api.post<EntrenamientoDto>(`/api/entrenamientos/${entrenamientoId}/equipos`, datos),

  quitarDeSesion: (entrenamientoId: number, entrenamientoEquipoId: number) =>
    api.delete<EntrenamientoDto>(
      `/api/entrenamientos/${entrenamientoId}/equipos/${entrenamientoEquipoId}`,
    ),
}

export const trabajosEquipoApi = {
  listar: (entrenamientoId: number, entrenamientoEquipoId: number) =>
    api.get<TrabajoDto[]>(ruta(entrenamientoId, entrenamientoEquipoId)),

  crear: (
    entrenamientoId: number,
    entrenamientoEquipoId: number,
    datos: GuardarTrabajoRequest,
  ) => api.post<TrabajoDto>(ruta(entrenamientoId, entrenamientoEquipoId), datos),

  actualizar: (
    entrenamientoId: number,
    entrenamientoEquipoId: number,
    trabajoId: number,
    datos: GuardarTrabajoRequest,
  ) =>
    api.put<TrabajoDto>(
      `${ruta(entrenamientoId, entrenamientoEquipoId)}/${trabajoId}`,
      datos,
    ),

  eliminar: (entrenamientoId: number, entrenamientoEquipoId: number, trabajoId: number) =>
    api.delete(`${ruta(entrenamientoId, entrenamientoEquipoId)}/${trabajoId}`),
}

function ruta(entrenamientoId: number, entrenamientoEquipoId: number) {
  return `/api/entrenamientos/${entrenamientoId}/equipos/${entrenamientoEquipoId}/trabajos`
}

export type { EquipoEnEntrenamientoDto }
