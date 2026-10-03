/**
 * Formato de fechas en espanol.
 *
 * Se arman con los componentes por separado a proposito: new Date("2026-10-06")
 * se interpreta como UTC y en Argentina eso muestra el dia anterior.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

interface Partes {
  anio: number
  mes: number
  dia: number
}

/** Separa "2026-10-06" sin pasar por Date, para no correr el dia por zona horaria. */
function partes(iso: string): Partes {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return { anio, mes, dia }
}

function aDate(iso: string): Date {
  const { anio, mes, dia } = partes(iso)
  return new Date(anio, mes - 1, dia)
}

/** "lun 6/10" */
export function fechaCorta(iso: string): string {
  const { mes, dia } = partes(iso)
  return `${DIAS_CORTOS[aDate(iso).getDay()]} ${dia}/${mes}`
}

/** "lunes 6 de octubre" */
export function fechaLarga(iso: string): string {
  const { mes, dia } = partes(iso)
  return `${DIAS[aDate(iso).getDay()]} ${dia} de ${MESES[mes - 1]}`
}

/** "6/10/2026" */
export function fechaNumerica(iso: string): string {
  const { anio, mes, dia } = partes(iso)
  return `${dia}/${mes}/${anio}`
}

/** Fecha de hoy en formato "YYYY-MM-DD", en hora local. */
export function hoyISO(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

/** true si la fecha ya paso respecto de hoy. */
export function esPasado(iso: string): boolean {
  return iso < hoyISO()
}

/** Hora actual en formato "HH:mm", para precargar la hora de trabajo. */
export function horaActual(): string {
  const ahora = new Date()
  const horas = String(ahora.getHours()).padStart(2, '0')
  const minutos = String(ahora.getMinutes()).padStart(2, '0')
  return `${horas}:${minutos}`
}
