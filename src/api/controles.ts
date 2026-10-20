import { api } from './cliente'
import type { ControlDto, GuardarControlRequest, TipoTrabajo } from '../tipos/api'

export const controlesApi = {
  listar: (filtros?: { atletaId?: number; tipo?: TipoTrabajo }) => {
    const params = new URLSearchParams()
    if (filtros?.atletaId != null) {
      params.set('atletaId', String(filtros.atletaId))
    }
    if (filtros?.tipo) {
      params.set('tipo', filtros.tipo)
    }
    const consulta = params.toString()
    return api.get<ControlDto[]>(`/api/controles${consulta ? `?${consulta}` : ''}`)
  },

  mios: (tipo?: TipoTrabajo) => {
    const consulta = tipo ? `?tipo=${encodeURIComponent(tipo)}` : ''
    return api.get<ControlDto[]>(`/api/controles/mios${consulta}`)
  },

  obtener: (id: number) => api.get<ControlDto>(`/api/controles/${id}`),

  crear: (datos: GuardarControlRequest) => api.post<ControlDto>('/api/controles', datos),

  actualizar: (id: number, datos: GuardarControlRequest) =>
    api.put<ControlDto>(`/api/controles/${id}`, datos),

  eliminar: (id: number) => api.delete(`/api/controles/${id}`),
}
