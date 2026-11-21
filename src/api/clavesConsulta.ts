import type { FiltrosEntrenamiento, TipoTrabajo } from '../tipos/api'

/** Claves estables para React Query (caché / invalidación). */
export const clavesConsulta = {
  entrenamientos: (filtros: FiltrosEntrenamiento) =>
    [
      'entrenamientos',
      filtros.desde ?? '',
      filtros.hasta ?? '',
      filtros.turno ?? '',
      filtros.sesion ?? '',
    ] as const,

  entrenamiento: (id: number) => ['entrenamiento', id] as const,

  atletas: (busqueda: string, incluirInactivos: boolean) =>
    ['atletas', busqueda.trim(), incluirInactivos] as const,

  avisos: ['avisos'] as const,

  anotacionesSesion: (entrenamientoId: number) =>
    ['anotaciones', 'sesion', entrenamientoId] as const,

  garminEstado: ['garmin', 'estado'] as const,

  /** scope: id de atleta, "todos" (staff sin filtro) o "mios" (atleta). */
  controles: (tipo: TipoTrabajo, scope: string) => ['controles', tipo, scope] as const,
}
