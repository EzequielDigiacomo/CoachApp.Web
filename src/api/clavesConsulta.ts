import type { FiltrosEntrenamiento } from '../tipos/api'

/** Claves estables para React Query (caché / invalidación). */
export const clavesConsulta = {
  entrenamientos: (filtros: FiltrosEntrenamiento) =>
    ['entrenamientos', filtros.desde ?? '', filtros.hasta ?? '', filtros.turno ?? '', filtros.sesion ?? ''] as const,

  atletas: (busqueda: string, incluirInactivos: boolean) =>
    ['atletas', busqueda.trim(), incluirInactivos] as const,

  avisos: ['avisos'] as const,
}
