import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { controlesApi } from '../api/controles'
import { atletasApi } from '../api/entrenamientos'
import type { TipoTrabajo } from '../tipos/api'

/**
 * Datos compartidos de un panel Gim/Tierra/Agua: listado cancelable +
 * catalogo de atletas (staff) e invalidacion tras mutar.
 */
export function useControlesPanel(tipo: TipoTrabajo, staff: boolean, atletaId: string) {
  const consultas = useQueryClient()
  const scope = staff ? atletaId || 'todos' : 'mios'

  const controlesQuery = useQuery({
    queryKey: clavesConsulta.controles(tipo, scope),
    queryFn: ({ signal }) => {
      if (staff) {
        const id = atletaId ? Number(atletaId) : undefined
        return controlesApi.listar({ atletaId: id, tipo }, { signal })
      }
      return controlesApi.mios(tipo, { signal })
    },
  })

  const atletasQuery = useQuery({
    queryKey: clavesConsulta.atletas('', false),
    queryFn: ({ signal }) => atletasApi.listar(undefined, { signal }),
    enabled: staff,
  })

  const atletasActivos = useMemo(
    () =>
      (atletasQuery.data ?? [])
        .filter((a) => a.activo)
        .sort((a, b) => a.apellido.localeCompare(b.apellido)),
    [atletasQuery.data],
  )

  async function refrescarControles() {
    await consultas.invalidateQueries({ queryKey: ['controles', tipo] })
  }

  return {
    controles: controlesQuery.data ?? [],
    cargando: controlesQuery.isPending,
    errorLista: controlesQuery.isError
      ? mensajeApi(controlesQuery.error, 'No se pudieron cargar los controles.')
      : null,
    atletasActivos,
    refrescarControles,
  }
}
