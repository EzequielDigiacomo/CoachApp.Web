import { api } from './cliente'
import type { ControlDto, GuardarControlRequest, TipoTrabajo } from '../tipos/api'

export const controlesApi = {
  listar: (filtros?: { atletaId?: number; tipo?: TipoTrabajo }, opciones?: RequestInit) => {
    const params = new URLSearchParams()
    if (filtros?.atletaId != null) {
      params.set('atletaId', String(filtros.atletaId))
    }
    if (filtros?.tipo) {
      params.set('tipo', filtros.tipo)
    }
    const consulta = params.toString()
    return api.get<ControlDto[]>(`/api/controles${consulta ? `?${consulta}` : ''}`, opciones)
  },

  mios: (tipo?: TipoTrabajo, opciones?: RequestInit) => {
    const consulta = tipo ? `?tipo=${encodeURIComponent(tipo)}` : ''
    return api.get<ControlDto[]>(`/api/controles/mios${consulta}`, opciones)
  },

  obtener: (id: number, opciones?: RequestInit) =>
    api.get<ControlDto>(`/api/controles/${id}`, opciones),

  crear: (datos: GuardarControlRequest, opciones?: RequestInit) =>
    api.post<ControlDto>('/api/controles', datos, opciones),

  actualizar: (id: number, datos: GuardarControlRequest, opciones?: RequestInit) =>
    api.put<ControlDto>(`/api/controles/${id}`, datos, opciones),

  eliminar: (id: number, opciones?: RequestInit) =>
    api.delete(`/api/controles/${id}`, opciones),

  /** Promueve un trabajo de sesion a control(es) del historial. */
  marcarDesdeTrabajo: (trabajoId: number, atletaId: number, opciones?: RequestInit) =>
    api.post<ControlDto[]>(
      `/api/controles/desde-trabajo/${trabajoId}?atletaId=${atletaId}`,
      {},
      opciones,
    ),

  /** Quita los controles creados desde ese trabajo para ese atleta. */
  desmarcarDesdeTrabajo: (trabajoId: number, atletaId: number, opciones?: RequestInit) =>
    api.delete(`/api/controles/desde-trabajo/${trabajoId}?atletaId=${atletaId}`, opciones),
}
