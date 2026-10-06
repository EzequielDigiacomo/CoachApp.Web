import { api } from './cliente'
import type {
  AtletaDto,
  CrearEntrenamientoRequest,
  EntrenamientoDto,
  FiltrosEntrenamiento,
  GuardarTrabajoRequest,
  SesionHistorialDto,
  TipoTrabajo,
  TrabajoDto,
  Turno,
} from '../tipos/api'

function aQuery(filtros: FiltrosEntrenamiento): string {
  const parametros = new URLSearchParams()

  if (filtros.desde) parametros.set('desde', filtros.desde)
  if (filtros.hasta) parametros.set('hasta', filtros.hasta)
  if (filtros.turno) parametros.set('turno', filtros.turno)
  if (filtros.sesion) parametros.set('sesion', String(filtros.sesion))

  const cadena = parametros.toString()
  return cadena ? `?${cadena}` : ''
}

export const entrenamientosApi = {
  listar: (filtros: FiltrosEntrenamiento) =>
    api.get<EntrenamientoDto[]>(`/api/entrenamientos${aQuery(filtros)}`),

  obtener: (id: number) => api.get<EntrenamientoDto>(`/api/entrenamientos/${id}`),

  crear: (datos: CrearEntrenamientoRequest) =>
    api.post<EntrenamientoDto>('/api/entrenamientos', datos),

  actualizar: (id: number, datos: CrearEntrenamientoRequest) =>
    api.put<EntrenamientoDto>(`/api/entrenamientos/${id}`, datos),

  eliminar: (id: number) => api.delete(`/api/entrenamientos/${id}`),

  agregarAtletas: (id: number, atletaIds: number[]) =>
    api.post<EntrenamientoDto>(`/api/entrenamientos/${id}/atletas`, { atletaIds }),

  quitarAtleta: (id: number, atletaId: number) =>
    api.delete<EntrenamientoDto>(`/api/entrenamientos/${id}/atletas/${atletaId}`),

  marcarAsistencia: (id: number, atletaId: number, asistio: boolean | null) =>
    api.patch<EntrenamientoDto>(`/api/entrenamientos/${id}/asistencia`, {
      atletaId,
      asistio,
    }),
}

export const atletasApi = {
  listar: (busqueda?: string) =>
    api.get<AtletaDto[]>(
      `/api/atletas${busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : ''}`,
    ),

  obtener: (id: number) => api.get<AtletaDto>(`/api/atletas/${id}`),
}

/** Los trabajos cuelgan del atleta dentro de la sesion. */
export const trabajosApi = {
  listar: (entrenamientoId: number, atletaId: number) =>
    api.get<TrabajoDto[]>(rutaTrabajos(entrenamientoId, atletaId)),

  crear: (entrenamientoId: number, atletaId: number, datos: GuardarTrabajoRequest) =>
    api.post<TrabajoDto>(rutaTrabajos(entrenamientoId, atletaId), datos),

  actualizar: (
    entrenamientoId: number,
    atletaId: number,
    trabajoId: number,
    datos: GuardarTrabajoRequest,
  ) => api.put<TrabajoDto>(`${rutaTrabajos(entrenamientoId, atletaId)}/${trabajoId}`, datos),

  eliminar: (entrenamientoId: number, atletaId: number, trabajoId: number) =>
    api.delete(`${rutaTrabajos(entrenamientoId, atletaId)}/${trabajoId}`),

  /** Todos los trabajos del atleta en todas sus sesiones, del mas nuevo al mas viejo. */
  historial: (atletaId: number) => api.get<TrabajoDto[]>(`/api/atletas/${atletaId}/trabajos`),
}

/** Sesiones en las que el atleta estuvo presente o ausente. */
export const asistenciaApi = {
  historial: (atletaId: number) => api.get<SesionHistorialDto[]>(`/api/atletas/${atletaId}/sesiones`),
}

function rutaTrabajos(entrenamientoId: number, atletaId: number): string {
  return `/api/entrenamientos/${entrenamientoId}/atletas/${atletaId}/trabajos`
}

export function etiquetaTurno(turno: Turno): string {
  return turno === 'Manana' ? 'Mañana' : 'Tarde'
}

/** Nombre completo del tipo de trabajo, para mostrar en pantalla. */
export function etiquetaTipoTrabajo(tipo: TipoTrabajo): string {
  switch (tipo) {
    case 'Gimnasio':
      return 'Gimnasio'
    case 'Tierra':
      return 'Tierra'
    case 'Agua':
      return 'Agua'
  }
}

/** En gimnasio la grilla es ejercicio -> series; en tierra y agua, parciales. */
export function esTrabajoDeGimnasio(tipo: TipoTrabajo): boolean {
  return tipo === 'Gimnasio'
}

/** Las paladas por minuto son propias de los trabajos de agua. */
export function esTrabajoDeAgua(tipo: TipoTrabajo): boolean {
  return tipo === 'Agua'
}
