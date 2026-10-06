/**
 * Tipos que espejan los DTO del backend .NET.
 * Si cambia un DTO en Entidades/DTOs, este archivo es el que hay que actualizar.
 */

export type RolUsuario = 'SuperAdmin' | 'Entrenador'

export interface UsuarioDto {
  id: number
  nombreUsuario: string
  email: string
  nombre: string
  apellido: string
  rol: RolUsuario
  activo: boolean
  fechaCreacion: string
  ultimoAcceso: string | null
}

export interface LoginRequest {
  nombreUsuario: string
  password: string
}

export interface LoginResponse {
  token: string
  expira: string
  usuario: UsuarioDto
}

/** DateOnly viaja como texto "YYYY-MM-DD". */
export interface AtletaDto {
  id: number
  nombre: string
  apellido: string
  fechaNacimiento: string
  edad: number
  /** Puede faltar si la API en ejecucion es anterior a las categorias. */
  categorias?: string[]
  club: string | null
  email: string | null
  dni: string
  telefono: string | null
  activo: boolean
  fechaAlta: string
}

export interface CrearAtletaRequest {
  nombre: string
  apellido: string
  fechaNacimiento: string
  club?: string | null
  email?: string | null
  dni: string
  telefono?: string | null
}

/* ---------- Entrenamientos ---------- */

export type Turno = 'Manana' | 'Tarde'

export interface AtletaEnEntrenamientoDto {
  atletaId: number
  nombre: string
  apellido: string
  dni: string
  edad: number
  /** Puede faltar si la API en ejecucion es anterior a las categorias. */
  categorias?: string[]
  /** null cuando todavia no se marco la asistencia. */
  asistio: boolean | null
  /** Cantidad de trabajos o controles cargados en la sesion. */
  cantidadTrabajos: number
  /** Actividad de Garmin del dia, si el nombre coincidio con un amigo. */
  garmin: ActividadGarminDto | null
}

export interface EntrenamientoDto {
  id: number
  fecha: string
  turno: Turno
  sesion: number
  descripcion: string | null
  club: string | null
  fechaCreacion: string
  cantidadAtletas: number
  cantidadPresentes: number
  cantidadAusentes: number
  cantidadSinMarcar: number
  /** Vacio en el listado; completo en el detalle. */
  atletas: AtletaEnEntrenamientoDto[]
}

/** Actividad de un amigo de Garmin, el dia de la sesion. */
export interface ActividadGarminDto {
  actividadId: number
  nombre: string
  tipo: string | null
  /** Hora local de inicio, "08:12". */
  inicio: string | null
  distanciaMetros: number | null
  duracionSegundos: number | null
  fcPromedio: number | null
  fcMaxima: number | null
  cadencia: number | null
  calorias: number | null
  url: string
}

export interface EstadoGarminDto {
  vinculada: boolean
  nombre: string | null
}

export interface SincronizacionGarminDto {
  entrenamiento: EntrenamientoDto
  avisos: string[]
}

export interface AmigoCalendarioGarminDto {
  nombre: string
  /** Usuario de Garmin. Puede faltar si la API en ejecucion es anterior. */
  clave?: string
  cargo: boolean
}

export interface DiaCalendarioGarminDto {
  fecha: string
  amigos: AmigoCalendarioGarminDto[]
}

export interface CalendarioGarminDto {
  desde: string
  hasta: string
  dias: DiaCalendarioGarminDto[]
}

export interface CrearEntrenamientoRequest {
  fecha: string
  turno: Turno
  sesion: number
  descripcion?: string | null
  club?: string | null
  atletaIds?: number[]
}

export interface FiltrosEntrenamiento {
  desde?: string
  hasta?: string
  turno?: Turno
  sesion?: number
}

/* ---------- Trabajos del atleta en una sesion ---------- */

/**
 * Una muestra de paladas por minuto (ppm) tomada durante un trabajo de agua.
 * El tiempo es el momento de la toma, contado desde el inicio del trabajo.
 */
export interface PaladaDto {
  id: number
  /** Ya normalizado por el backend, por ejemplo "1:40". */
  tiempo: string
  ppm: number
  orden: number
}

export interface ParcialDto {
  id: number
  distanciaMetros: number
  /** Ya normalizado por el backend, por ejemplo "2:12". */
  tiempo: string
  /** Diferencia con el parcial anterior. null en el primero. */
  parcial: string | null
  /** Muestras de ppm que caen dentro de este parcial segun su tiempo. */
  paladas: PaladaDto[]
  orden: number
}

/** Lugar donde se hizo un trabajo. */
export type TipoTrabajo = 'Gimnasio' | 'Tierra' | 'Agua'

/** Una serie de un ejercicio de gimnasio. */
export interface SerieDto {
  id: number
  repeticiones: number
  porcentaje: number | null
  pesoKg: number | null
  orden: number
}

/** Un ejercicio con sus series, de un trabajo de gimnasio. */
export interface EjercicioDto {
  id: number
  nombre: string
  orden: number
  series: SerieDto[]
}

export interface TrabajoDto {
  id: number
  entrenamientoId: number
  atletaId: number
  tipo: TipoTrabajo
  /** Hora del dia en que se hizo el trabajo, "09:30". */
  horaInicio: string | null
  observaciones: string | null
  fechaCreacion: string
  /** Marcas de los trabajos de tierra y agua, en orden de toma. */
  parciales: ParcialDto[]
  /** Ejercicios de los trabajos de gimnasio. */
  ejercicios: EjercicioDto[]
  /** Muestras de ppm de los trabajos de agua, en orden de toma. */
  paladas: PaladaDto[]
  /** Datos de la sesion. Llegan completos en el historial del atleta. */
  entrenamientoFecha: string | null
  entrenamientoTurno: Turno | null
  entrenamientoSesion: number | null
}

export interface GuardarParcialRequest {
  distanciaMetros: number
  /** Se escribe a mano: "2:12" o "1:02:03". */
  tiempo: string
}

/** Una muestra de ppm que viene del formulario. */
export interface GuardarPaladaRequest {
  /** Momento de la toma desde el inicio del trabajo: "15" o "1:40". */
  tiempo: string
  ppm: number
}

export interface GuardarSerieRequest {
  repeticiones: number
  porcentaje?: number | null
  pesoKg?: number | null
}

export interface GuardarEjercicioRequest {
  nombre: string
  series: GuardarSerieRequest[]
}

export interface GuardarTrabajoRequest {
  tipo: TipoTrabajo
  horaInicio?: string | null
  observaciones?: string | null
  /** Para tierra y agua. Al menos uno. */
  parciales?: GuardarParcialRequest[]
  /** Para gimnasio. Al menos un ejercicio, cada uno con al menos una serie. */
  ejercicios?: GuardarEjercicioRequest[]
  /** Para agua. Muestras de ppm con su tiempo. */
  paladas?: GuardarPaladaRequest[]
}

/* ---------- Anotaciones ---------- */

export type OrigenAnotacion = 'Manual' | 'Audio'

/**
 * Una anotacion del entrenador. Los vinculos son opcionales: puede ser una
 * nota general, de un atleta, de una sesion o de un trabajo puntual.
 */
export interface AnotacionDto {
  id: number
  titulo: string | null
  texto: string
  origen: OrigenAnotacion
  /** true cuando hay que revisar la transcripcion de audio. */
  requiereRevision: boolean
  fechaCreacion: string

  atletaId: number | null
  atletaNombre: string | null
  atletaApellido: string | null

  entrenamientoId: number | null
  /** DateOnly viaja como texto "YYYY-MM-DD". */
  entrenamientoFecha: string | null
  entrenamientoTurno: Turno | null
  entrenamientoSesion: number | null

  trabajoId: number | null
  trabajoTipo: TipoTrabajo | null
  trabajoHoraInicio: string | null

  usuarioId: number | null
  usuarioNombre: string | null
}

export interface GuardarAnotacionRequest {
  titulo?: string | null
  texto: string
  atletaId?: number | null
  entrenamientoId?: number | null
  /** Si viene, el atleta y la sesion se toman del trabajo. */
  trabajoId?: number | null
}

export interface FiltrosAnotacion {
  atletaId?: number
  entrenamientoId?: number
  trabajoId?: number
  busqueda?: string
}

/* ---------- Importar desde una planilla de Google Sheets ---------- */

/** Una fila de la planilla, con el numero que ocupa en la hoja. */
export interface FilaHojaDto {
  /** Numero de fila en la planilla, tal como se ve en Excel. */
  numero: number
  /** El texto de cada celda, tal cual esta escrito en la hoja. */
  celdas: string[]
}

export interface HojaLeidaDto {
  /** Nombre de la pestaña que se leyo. */
  pestana: string
  /** Cantidad de columnas de la tabla. */
  columnas: number
  /** Numero de la primera columna (1 = A), para rotular con las letras reales. */
  columnaInicial: number
  filas: FilaHojaDto[]
}

export interface LeerHojaRequest {
  /** Link de la planilla compartida por enlace. */
  url: string
  /** Nombre de la pestaña. No hace falta para listarlas. */
  pestana?: string | null
  /** Celdas a leer, del estilo "B4:E49". Sin esto, la pestaña entera. */
  rango?: string | null
}
