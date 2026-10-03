import { api } from './cliente'
import { etiquetaTipoTrabajo, etiquetaTurno } from './entrenamientos'
import type {
  AnotacionDto,
  FiltrosAnotacion,
  GuardarAnotacionRequest,
} from '../tipos/api'
import { fechaNumerica } from '../util/fechas'

function aQuery(filtros: FiltrosAnotacion): string {
  const parametros = new URLSearchParams()

  if (filtros.atletaId) parametros.set('atletaId', String(filtros.atletaId))
  if (filtros.entrenamientoId) parametros.set('entrenamientoId', String(filtros.entrenamientoId))
  if (filtros.trabajoId) parametros.set('trabajoId', String(filtros.trabajoId))
  if (filtros.busqueda) parametros.set('busqueda', filtros.busqueda)

  const cadena = parametros.toString()
  return cadena ? `?${cadena}` : ''
}

export const anotacionesApi = {
  listar: (filtros: FiltrosAnotacion = {}) =>
    api.get<AnotacionDto[]>(`/api/anotaciones${aQuery(filtros)}`),

  crear: (datos: GuardarAnotacionRequest) =>
    api.post<AnotacionDto>('/api/anotaciones', datos),

  actualizar: (id: number, datos: GuardarAnotacionRequest) =>
    api.put<AnotacionDto>(`/api/anotaciones/${id}`, datos),

  eliminar: (id: number) => api.delete(`/api/anotaciones/${id}`),
}

/** "Pérez, Juan" o null si la nota no esta atada a un atleta. */
export function etiquetaAtleta(anotacion: AnotacionDto): string | null {
  return anotacion.atletaApellido
    ? `${anotacion.atletaApellido}, ${anotacion.atletaNombre}`
    : null
}

/**
 * Partes del contexto de una anotacion, para mostrarlas como etiquetas:
 * el atleta, la sesion y el trabajo del que salio la nota.
 */
export function contextoAnotacion(anotacion: AnotacionDto): string[] {
  const partes: string[] = []

  const atleta = etiquetaAtleta(anotacion)
  if (atleta) {
    partes.push(atleta)
  }

  if (anotacion.entrenamientoFecha) {
    const sesion: string[] = [fechaNumerica(anotacion.entrenamientoFecha)]

    if (anotacion.entrenamientoTurno) {
      sesion.push(etiquetaTurno(anotacion.entrenamientoTurno))
    }
    if (anotacion.entrenamientoSesion !== null) {
      sesion.push(`Sesión ${anotacion.entrenamientoSesion}`)
    }

    partes.push(sesion.join(' · '))
  }

  if (anotacion.trabajoTipo) {
    const trabajo = etiquetaTipoTrabajo(anotacion.trabajoTipo).toLowerCase()
    partes.push(
      anotacion.trabajoHoraInicio ? `Trabajo ${trabajo} ${anotacion.trabajoHoraInicio}` : `Trabajo ${trabajo}`,
    )
  }

  return partes
}

/** Fecha y hora en que se escribio la nota, ya formateada. */
export function fechaNota(anotacion: AnotacionDto): string {
  const cuando = new Date(anotacion.fechaCreacion)

  if (Number.isNaN(cuando.getTime())) {
    return ''
  }

  const dia = String(cuando.getDate()).padStart(2, '0')
  const mes = String(cuando.getMonth() + 1).padStart(2, '0')
  const horas = String(cuando.getHours()).padStart(2, '0')
  const minutos = String(cuando.getMinutes()).padStart(2, '0')

  return `${dia}/${mes}/${cuando.getFullYear()} ${horas}:${minutos}`
}
