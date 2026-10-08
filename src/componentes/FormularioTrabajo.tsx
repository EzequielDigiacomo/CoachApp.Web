import { esTrabajoDeAgua, esTrabajoDeGimnasio, etiquetaTipoTrabajo } from '../api/entrenamientos'
import type {
  GuardarEjercicioRequest,
  GuardarPaladaRequest,
  GuardarParcialRequest,
  GuardarSerieRequest,
  GuardarTrabajoRequest,
  TipoTrabajo,
  TrabajoDto,
} from '../tipos/api'
import { horaActual } from '../util/fechas'
import { esHoraValida, formatearTiempo, parsearTiempo } from '../util/tiempos'
import { CampoTiempo } from './CampoTiempo'

/** Los tres lugares donde se puede hacer un trabajo. */
export const TIPOS: TipoTrabajo[] = ['Gimnasio', 'Tierra', 'Agua']

/** Lo que dice el boton de cada tipo, tal como lo nombra el entrenador. */
export const ETIQUETA_TIPO: Record<TipoTrabajo, string> = {
  Gimnasio: 'gim',
  Tierra: 'tierra',
  Agua: 'agua',
}

export interface FilaParcial {
  /** Clave de React: la fila se identifica aunque cambie su contenido. */
  clave: number
  distancia: string
  tiempo: string
}

/** Una muestra de ppm mientras se carga: su momento y las paladas del momento. */
export interface FilaPalada {
  clave: number
  tiempo: string
  ppm: string
}

export interface FilaSerie {
  clave: number
  repeticiones: string
  porcentaje: string
  peso: string
}

export interface BloqueEjercicio {
  clave: number
  nombre: string
  series: FilaSerie[]
}

export interface FormTrabajo {
  /** null cuando el trabajo todavia no se guardo. */
  id: number | null
  tipo: TipoTrabajo
  horaInicio: string
  observaciones: string
  /** Para tierra y agua: cada fila es una marca del cronometro. */
  parciales: FilaParcial[]
  /** Para gimnasio: cada bloque es un ejercicio con sus series. */
  ejercicios: BloqueEjercicio[]
  /** Para agua: muestras de ppm, cada una con el momento en que se tomo. */
  paladas: FilaPalada[]
}

/**
 * Contador de claves de React a nivel de modulo: en la carga multiple hay
 * varios formularios a la vez y cada fila nueva tiene que ser distinta.
 */
let proximaClave = 1

function clave(): number {
  return proximaClave++
}

function nuevaFilaParcial(): FilaParcial {
  return { clave: clave(), distancia: '', tiempo: '' }
}

function nuevaFilaPalada(): FilaPalada {
  return { clave: clave(), tiempo: '', ppm: '' }
}

function nuevaFilaSerie(): FilaSerie {
  return { clave: clave(), repeticiones: '', porcentaje: '', peso: '' }
}

function nuevoBloque(): BloqueEjercicio {
  return { clave: clave(), nombre: '', series: [nuevaFilaSerie()] }
}

/** Un trabajo nuevo, con la grilla del tipo elegido ya sembrada con una fila. */
export function nuevoFormulario(tipo: TipoTrabajo): FormTrabajo {
  const gimnasio = esTrabajoDeGimnasio(tipo)

  return {
    id: null,
    tipo,
    // La mayoria de las veces se carga al terminar el trabajo, asi que
    // la hora de ahora es el mejor punto de partida.
    horaInicio: horaActual(),
    observaciones: '',
    // La grilla del tipo elegido arranca con una fila lista para escribir.
    parciales: gimnasio ? [] : [nuevaFilaParcial()],
    ejercicios: gimnasio ? [nuevoBloque()] : [],
    // Las ppm se toman a mano con el cronometro, asi que la fila lista solo
    // aparece en los trabajos de agua.
    paladas: esTrabajoDeAgua(tipo) ? [nuevaFilaPalada()] : [],
  }
}

/** El formulario cargado con un trabajo ya guardado, para editarlo. */
export function formularioDesde(trabajo: TrabajoDto): FormTrabajo {
  return {
    id: trabajo.id,
    tipo: trabajo.tipo,
    horaInicio: trabajo.horaInicio ?? '',
    observaciones: trabajo.observaciones ?? '',
    parciales: trabajo.parciales.map((parcial) => ({
      clave: clave(),
      distancia: String(parcial.distanciaMetros),
      tiempo: parcial.tiempo,
    })),
    ejercicios: trabajo.ejercicios.map((ejercicio) => ({
      clave: clave(),
      nombre: ejercicio.nombre,
      series: ejercicio.series.map((serie) => ({
        clave: clave(),
        repeticiones: String(serie.repeticiones),
        porcentaje: serie.porcentaje === null ? '' : String(serie.porcentaje),
        peso: serie.pesoKg === null ? '' : String(serie.pesoKg),
      })),
    })),
    paladas: trabajo.paladas.map((palada) => ({
      clave: clave(),
      tiempo: palada.tiempo,
      ppm: String(palada.ppm),
    })),
  }
}

/**
 * Cambiar el tipo cambia la grilla. Lo que ya se cargo del otro tipo se
 * conserva por si el entrenador vuelve atras, y si la grilla nueva esta
 * vacia se siembra una fila para que nunca quede un formulario sin filas.
 */
export function cambiarTipoDe(form: FormTrabajo, tipo: TipoTrabajo): FormTrabajo {
  const cambios: Partial<FormTrabajo> = { tipo }

  if (esTrabajoDeGimnasio(tipo) && form.ejercicios.length === 0) {
    cambios.ejercicios = [nuevoBloque()]
  }
  if (!esTrabajoDeGimnasio(tipo) && form.parciales.length === 0) {
    cambios.parciales = [nuevaFilaParcial()]
  }
  if (esTrabajoDeAgua(tipo) && form.paladas.length === 0) {
    cambios.paladas = [nuevaFilaPalada()]
  }

  return { ...form, ...cambios }
}

interface Props {
  form: FormTrabajo
  ocupado?: boolean
  /** En la carga multiple el tipo, la hora y las observaciones van arriba del modal. */
  mostrarCabecera?: boolean
  /** En la carga multiple los botones de guardar y cancelar son del modal. */
  mostrarAcciones?: boolean
  /** false para que el primer ejercicio no se lleve el foco: hay varios formularios a la vez. */
  autoFocus?: boolean
  /** Encabezado propio; sin esto usa el que arma con el tipo de trabajo. */
  titulo?: string
  onCambiar: (form: FormTrabajo) => void
  onCancelar?: () => void
  onGuardar?: () => void
}

/**
 * La grilla de un trabajo: en gimnasio se cargan ejercicios con sus series
 * (reps, %, kg) y en tierra y agua, parciales de distancia y tiempo, con las
 * muestras de ppm cuando el trabajo es de agua.
 *
 * Es un componente controlado: recibe el formulario y avisa cada cambio con el
 * formulario entero, asi lo pueden usar tanto el modal de un atleta como el de
 * la carga multiple.
 */
export function FormularioTrabajo({
  form,
  ocupado = false,
  mostrarCabecera = true,
  mostrarAcciones = true,
  autoFocus = true,
  titulo,
  onCambiar,
  onCancelar,
  onGuardar,
}: Props) {
  const gimnasio = esTrabajoDeGimnasio(form.tipo)

  function agregarParcial() {
    onCambiar({ ...form, parciales: [...form.parciales, nuevaFilaParcial()] })
  }

  function cambiarParcial(claveFila: number, cambios: Partial<FilaParcial>) {
    onCambiar({
      ...form,
      parciales: form.parciales.map((fila) =>
        fila.clave === claveFila ? { ...fila, ...cambios } : fila,
      ),
    })
  }

  function quitarParcial(claveFila: number) {
    onCambiar({ ...form, parciales: form.parciales.filter((f) => f.clave !== claveFila) })
  }

  function agregarPalada() {
    onCambiar({ ...form, paladas: [...form.paladas, nuevaFilaPalada()] })
  }

  function cambiarPalada(claveFila: number, cambios: Partial<FilaPalada>) {
    onCambiar({
      ...form,
      paladas: form.paladas.map((fila) =>
        fila.clave === claveFila ? { ...fila, ...cambios } : fila,
      ),
    })
  }

  function quitarPalada(claveFila: number) {
    onCambiar({ ...form, paladas: form.paladas.filter((f) => f.clave !== claveFila) })
  }

  function agregarEjercicio() {
    onCambiar({ ...form, ejercicios: [...form.ejercicios, nuevoBloque()] })
  }

  function cambiarEjercicio(claveBloque: number, cambios: Partial<BloqueEjercicio>) {
    onCambiar({
      ...form,
      ejercicios: form.ejercicios.map((bloque) =>
        bloque.clave === claveBloque ? { ...bloque, ...cambios } : bloque,
      ),
    })
  }

  function quitarEjercicio(claveBloque: number) {
    onCambiar({ ...form, ejercicios: form.ejercicios.filter((b) => b.clave !== claveBloque) })
  }

  function agregarSerie(claveBloque: number) {
    onCambiar({
      ...form,
      ejercicios: form.ejercicios.map((bloque) =>
        bloque.clave === claveBloque
          ? { ...bloque, series: [...bloque.series, nuevaFilaSerie()] }
          : bloque,
      ),
    })
  }

  function cambiarSerie(claveBloque: number, claveSerie: number, cambios: Partial<FilaSerie>) {
    onCambiar({
      ...form,
      ejercicios: form.ejercicios.map((bloque) =>
        bloque.clave === claveBloque
          ? {
              ...bloque,
              series: bloque.series.map((serie) =>
                serie.clave === claveSerie ? { ...serie, ...cambios } : serie,
              ),
            }
          : bloque,
      ),
    })
  }

  function quitarSerie(claveBloque: number, claveSerie: number) {
    onCambiar({
      ...form,
      ejercicios: form.ejercicios.map((bloque) =>
        bloque.clave === claveBloque
          ? { ...bloque, series: bloque.series.filter((s) => s.clave !== claveSerie) }
          : bloque,
      ),
    })
  }

  return (
    <form
      className="trabajo-form"
      onSubmit={(evento) => {
        evento.preventDefault()
        onGuardar?.()
      }}
    >
      {mostrarCabecera && (
        <>
          <h4 className="titulo-seccion">
            {titulo ??
              (form.id === null
                ? `Nuevo trabajo · ${etiquetaTipoTrabajo(form.tipo)}`
                : `Editar trabajo · ${etiquetaTipoTrabajo(form.tipo)}`)}
          </h4>

          <div className="grilla">
            <label>
              Tipo de trabajo
              <select
                value={form.tipo}
                onChange={(e) => onCambiar(cambiarTipoDe(form, e.target.value as TipoTrabajo))}
              >
                {TIPOS.map((tipo) => (
                  <option value={tipo} key={tipo}>
                    {etiquetaTipoTrabajo(tipo)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Hora de trabajo
              <input
                inputMode="numeric"
                value={form.horaInicio}
                onChange={(e) => onCambiar({ ...form, horaInicio: e.target.value })}
                placeholder="09:30"
              />
            </label>

            <label>
              Observaciones
              <input
                value={form.observaciones}
                onChange={(e) => onCambiar({ ...form, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </label>
          </div>
        </>
      )}

      {gimnasio ? (
        <section className="parciales">
          <div className="parciales-cabecera">
            <div>
              <h5>Ejercicios</h5>
              <p className="sutil">Cada ejercicio lleva sus series: reps, % y kg.</p>
            </div>
            <button type="button" className="boton-fantasma" onClick={agregarEjercicio}>
              Agregar ejercicio
            </button>
          </div>

          {form.ejercicios.map((bloque, indice) => (
            <div className="ejercicio-bloque" key={bloque.clave}>
              <div className="ejercicio-cabecera">
                <span className="parcial-numero" title={`Ejercicio ${indice + 1}`}>
                  {indice + 1}
                </span>
                <input
                  className="ejercicio-nombre"
                  value={bloque.nombre}
                  onChange={(e) => cambiarEjercicio(bloque.clave, { nombre: e.target.value })}
                  placeholder="Ejercicio (ej. Sentadillas)"
                  autoFocus={autoFocus && indice === 0 && !bloque.nombre}
                />
                <button
                  type="button"
                  className="boton-fantasma peligro"
                  disabled={form.ejercicios.length === 1}
                  title={
                    form.ejercicios.length === 1
                      ? 'El trabajo necesita al menos un ejercicio'
                      : 'Quitar este ejercicio'
                  }
                  onClick={() => quitarEjercicio(bloque.clave)}
                >
                  Quitar
                </button>
              </div>

              <ul className="series-lista">
                {bloque.series.map((serie, ordenSerie) => (
                  <li key={serie.clave}>
                    <span className="parcial-numero" title={`Serie ${ordenSerie + 1}`}>
                      {ordenSerie + 1}
                    </span>
                    <input
                      className="serie-campo"
                      inputMode="numeric"
                      placeholder="Reps"
                      value={serie.repeticiones}
                      onChange={(e) =>
                        cambiarSerie(bloque.clave, serie.clave, { repeticiones: e.target.value })
                      }
                    />
                    <input
                      className="serie-campo"
                      inputMode="numeric"
                      placeholder="%"
                      value={serie.porcentaje}
                      onChange={(e) =>
                        cambiarSerie(bloque.clave, serie.clave, { porcentaje: e.target.value })
                      }
                    />
                    <input
                      className="serie-campo"
                      inputMode="decimal"
                      placeholder="Kg"
                      value={serie.peso}
                      onChange={(e) =>
                        cambiarSerie(bloque.clave, serie.clave, { peso: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="boton-fantasma peligro"
                      disabled={bloque.series.length === 1}
                      title={
                        bloque.series.length === 1
                          ? 'El ejercicio necesita al menos una serie'
                          : 'Quitar esta serie'
                      }
                      onClick={() => quitarSerie(bloque.clave, serie.clave)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="boton-fantasma"
                onClick={() => agregarSerie(bloque.clave)}
              >
                Agregar serie
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="parciales">
          <div className="parciales-cabecera">
            <div>
              <h5>Parciales</h5>
              <p className="sutil">
                Cada tiempo es lo que duró ese parcial. El cronómetro de las paladas sigue de
                corrido.
              </p>
            </div>
            <button type="button" className="boton-fantasma" onClick={agregarParcial}>
              Agregar parcial
            </button>
          </div>

          <ul className="parciales-lista">
            {form.parciales.map((fila, indice) => (
              <li key={fila.clave}>
                <span className="parcial-numero" title={`Parcial ${indice + 1}`}>
                  {indice + 1}
                </span>
                <input
                  className="parcial-distancia"
                  inputMode="numeric"
                  placeholder="Distancia (m)"
                  value={fila.distancia}
                  onChange={(e) => cambiarParcial(fila.clave, { distancia: e.target.value })}
                />
                <CampoTiempo
                  className="parcial-tiempo"
                  valor={fila.tiempo}
                  onChange={(tiempo) => cambiarParcial(fila.clave, { tiempo })}
                />
                <span className="parcial-dif sutil" title="Diferencia con el parcial anterior">
                  {diferencia(form.parciales, indice)}
                </span>
                <button
                  type="button"
                  className="boton-fantasma peligro"
                  disabled={form.parciales.length === 1}
                  title={
                    form.parciales.length === 1
                      ? 'El trabajo necesita al menos un parcial'
                      : 'Quitar este parcial'
                  }
                  onClick={() => quitarParcial(fila.clave)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {esTrabajoDeAgua(form.tipo) && (
        <section className="parciales">
          <div className="parciales-cabecera">
            <div>
              <h5>Paladas por minuto</h5>
              <p className="sutil">
                Poné el momento y las ppm: la muestra se ubica sola en la fila del parcial que le
                toca.
              </p>
            </div>
          </div>

          {form.paladas.length === 0 ? (
            <p className="sutil">Sin paladas cargadas.</p>
          ) : (
            <ul className="paladas-lista">
              {form.paladas.map((palada, indice) => {
                const destino = destinoPalada(form.parciales, palada)

                return (
                  <li key={palada.clave}>
                    <span className="parcial-numero" title={`Palada ${indice + 1}`}>
                      {indice + 1}
                    </span>
                    <CampoTiempo
                      className="palada-tiempo"
                      valor={palada.tiempo}
                      onChange={(tiempo) => cambiarPalada(palada.clave, { tiempo })}
                    />
                    <input
                      className="palada-ppm"
                      inputMode="numeric"
                      placeholder="ppm"
                      value={palada.ppm}
                      onChange={(e) => cambiarPalada(palada.clave, { ppm: e.target.value })}
                    />
                    <span className={`palada-destino${destino.aviso ? ' aviso' : ''}`}>
                      {destino.texto}
                    </span>
                    <button
                      type="button"
                      className="boton-fantasma peligro"
                      title="Quitar esta palada"
                      onClick={() => quitarPalada(palada.clave)}
                    >
                      Quitar
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button type="button" className="boton-fantasma agregar-palada" onClick={agregarPalada}>
            Agregar palada
          </button>
        </section>
      )}

      {mostrarAcciones && (
        <div className="form-acciones">
          <button type="button" className="boton-fantasma" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={ocupado}>
            {ocupado ? 'Guardando…' : 'Guardar trabajo'}
          </button>
        </div>
      )}
    </form>
  )
}

/** Diferencia con la fila anterior, mientras se esta cargando. */
function diferencia(filas: FilaParcial[], indice: number): string {
  if (indice === 0) {
    return '—'
  }

  const anterior = parsearTiempo(filas[indice - 1].tiempo)
  const actual = parsearTiempo(filas[indice].tiempo)

  if (anterior === null || actual === null || actual < anterior) {
    return '—'
  }

  return formatearTiempo(actual - anterior)
}

/**
 * A que parcial va a caer una muestra mientras se carga. Usa la misma regla que
 * el backend: cada tiempo es la duracion de ese tramo, y se suman porque el
 * cronometro de las paladas sigue de corrido. Con 1:53, 2:00 y 2:09, una
 * muestra de 4:03 va al parcial 3 (1:53 + 2:00 = 3:53, y el total llega a ~6:03).
 */
function parcialDePalada(
  filas: FilaParcial[],
  tiempo: number,
): { numero: number; pasado: boolean } | null {
  if (filas.length === 0) {
    return null
  }

  let acumulado = 0

  for (let i = 0; i < filas.length; i++) {
    const duracion = parsearTiempo(filas[i].tiempo)

    // Con un parcial sin tiempo todavia no hay con que decidir.
    if (duracion === null) {
      return null
    }

    acumulado += duracion
    if (tiempo < acumulado) {
      return { numero: i + 1, pasado: false }
    }
  }

  // Se pasa del tiempo total: el backend la deja en la ultima fila.
  return { numero: filas.length, pasado: true }
}

/** Texto con el destino de una muestra, para mostrarlo al lado de la fila. */
function destinoPalada(filas: FilaParcial[], fila: FilaPalada): { texto: string; aviso: boolean } {
  const tiempo = parsearTiempo(fila.tiempo)
  if (tiempo === null) {
    return { texto: '—', aviso: false }
  }

  const parcial = parcialDePalada(filas, tiempo)
  if (parcial === null) {
    return { texto: '—', aviso: false }
  }

  return parcial.pasado
    ? { texto: `parcial ${parcial.numero} · pasa el tiempo total`, aviso: true }
    : { texto: `parcial ${parcial.numero}`, aviso: false }
}

/**
 * Valida el formulario y arma el cuerpo del request. Devuelve un mensaje de
 * error en castellano cuando algo no se entiende, para no depender del 400.
 */
export function armarRequest(
  form: FormTrabajo,
): { datos: GuardarTrabajoRequest } | { error: string } {
  const horaInicio = form.horaInicio.trim()
  if (horaInicio && !esHoraValida(horaInicio)) {
    return { error: `La hora de trabajo "${horaInicio}" no es válida. Escribila como 09:30.` }
  }

  const comun = {
    tipo: form.tipo,
    horaInicio: horaInicio || null,
    observaciones: form.observaciones.trim() || null,
  }

  if (esTrabajoDeGimnasio(form.tipo)) {
    return armarGimnasio(form, comun)
  }

  if (form.parciales.length === 0) {
    return { error: 'Agregá al menos un parcial con su distancia y su tiempo.' }
  }

  const parciales: GuardarParcialRequest[] = []

  // El orden de la lista es el orden de toma, y el backend lo guarda asi.
  for (const [indice, fila] of form.parciales.entries()) {
    const distancia = Number(fila.distancia)
    if (!Number.isInteger(distancia) || distancia < 1 || distancia > 100000) {
      return { error: `Cargá la distancia del parcial ${indice + 1}, en metros.` }
    }

    if (parsearTiempo(fila.tiempo) === null) {
      return { error: `Completá el tiempo del parcial ${indice + 1}.` }
    }

    parciales.push({ distanciaMetros: distancia, tiempo: fila.tiempo.trim() })
  }

  // Las ppm son solo de agua: en tierra el formulario ni las muestra.
  let paladas: GuardarPaladaRequest[] = []
  if (esTrabajoDeAgua(form.tipo)) {
    const armado = armarPaladas(form)
    if ('error' in armado) {
      return { error: armado.error }
    }

    paladas = armado.datos
  }

  return { datos: { ...comun, parciales, paladas } }
}

/** En gimnasio cada ejercicio exige nombre y al menos una serie con reps. */
function armarGimnasio(
  form: FormTrabajo,
  comun: Pick<GuardarTrabajoRequest, 'tipo' | 'horaInicio' | 'observaciones'>,
): { datos: GuardarTrabajoRequest } | { error: string } {
  if (form.ejercicios.length === 0) {
    return { error: 'Agregá al menos un ejercicio.' }
  }

  const ejercicios: GuardarEjercicioRequest[] = []

  for (const [indice, bloque] of form.ejercicios.entries()) {
    const nombre = bloque.nombre.trim()
    if (!nombre) {
      return { error: `Escribí el nombre del ejercicio ${indice + 1}.` }
    }

    if (bloque.series.length === 0) {
      return { error: `El ejercicio "${nombre}" necesita al menos una serie.` }
    }

    const series: GuardarSerieRequest[] = []

    for (const [orden, serie] of bloque.series.entries()) {
      const repeticiones = Number(serie.repeticiones)
      if (!Number.isInteger(repeticiones) || repeticiones < 1 || repeticiones > 1000) {
        return {
          error: `Las repeticiones de la serie ${orden + 1} de "${nombre}" tienen que estar entre 1 y 1000.`,
        }
      }

      const porcentaje = serie.porcentaje.trim() === '' ? null : Number(serie.porcentaje)
      if (porcentaje !== null && (!Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 100)) {
        return {
          error: `El porcentaje de la serie ${orden + 1} de "${nombre}" tiene que estar entre 1 y 100.`,
        }
      }

      // Se acepta la coma decimal, que es lo natural al escribirlo a mano.
      const peso = serie.peso.trim() === '' ? null : Number(serie.peso.replace(',', '.'))
      if (peso !== null && (!Number.isFinite(peso) || peso < 0 || peso > 1000)) {
        return {
          error: `El peso de la serie ${orden + 1} de "${nombre}" tiene que estar entre 0 y 1000 kg.`,
        }
      }

      series.push({ repeticiones, porcentaje, pesoKg: peso })
    }

    ejercicios.push({ nombre, series })
  }

  return { datos: { ...comun, ejercicios } }
}

/**
 * En agua cada palada necesita un tiempo entendible y un ppm razonable. Una
 * fila que quedo del todo vacia se ignora: es una fila que se agrego y no se uso.
 */
function armarPaladas(form: FormTrabajo): { datos: GuardarPaladaRequest[] } | { error: string } {
  const paladas: GuardarPaladaRequest[] = []

  for (const [indice, fila] of form.paladas.entries()) {
    const tiempo = fila.tiempo.trim()
    const ppmTexto = fila.ppm.trim()

    if (tiempo === '' && ppmTexto === '') {
      continue
    }

    if (tiempo === '') {
      return { error: `Completá el tiempo de la palada ${indice + 1}.` }
    }

    if (parsearTiempo(tiempo) === null) {
      return { error: `El tiempo de la palada ${indice + 1} no se entiende.` }
    }

    const ppm = Number(ppmTexto)
    if (!Number.isInteger(ppm) || ppm < 1 || ppm > 400) {
      return { error: `Cargá las ppm de la palada ${indice + 1}, entre 1 y 400.` }
    }

    paladas.push({ tiempo, ppm })
  }

  return { datos: paladas }
}
