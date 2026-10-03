import { useCallback, useEffect, useRef, useState } from 'react'
import { anotacionesApi } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import {
  esTrabajoDeAgua,
  esTrabajoDeGimnasio,
  etiquetaTipoTrabajo,
  trabajosApi,
} from '../api/entrenamientos'
import type {
  AtletaEnEntrenamientoDto,
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
import { Modal } from './Modal'
import { ModalAnotaciones } from './ModalAnotaciones'
import { ModalGraficoTrabajo } from './ModalGraficoTrabajo'
import { TarjetaTrabajo } from './TarjetaTrabajo'

interface Props {
  entrenamientoId: number
  atleta: AtletaEnEntrenamientoDto
  onCerrar: () => void
  /** Avisa al detalle de la sesion que cambio la cantidad de trabajos. */
  onCambio: () => void
}

/** Los tres lugares donde se puede hacer un trabajo. */
const TIPOS: TipoTrabajo[] = ['Gimnasio', 'Tierra', 'Agua']

/** Lo que dice el boton de cada tipo, tal como lo nombra el entrenador. */
const ETIQUETA_TIPO: Record<TipoTrabajo, string> = {
  Gimnasio: 'gim',
  Tierra: 'tierra',
  Agua: 'agua',
}

interface FilaParcial {
  /** Clave de React: la fila se identifica aunque cambie su contenido. */
  clave: number
  distancia: string
  tiempo: string
}

/** Una muestra de ppm mientras se carga: su momento y las paladas del momento. */
interface FilaPalada {
  clave: number
  tiempo: string
  ppm: string
}

interface FilaSerie {
  clave: number
  repeticiones: string
  porcentaje: string
  peso: string
}

interface BloqueEjercicio {
  clave: number
  nombre: string
  series: FilaSerie[]
}

interface FormTrabajo {
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
 * Muestra los trabajos que hizo el atleta en la sesion y permite cargarlos.
 * La grilla cambia segun el tipo: en gimnasio se cargan ejercicios con sus
 * series (reps, %, kg) y en tierra y agua, parciales de distancia y tiempo.
 */
export function ModalTrabajos({ entrenamientoId, atleta, onCerrar, onCambio }: Props) {
  const [trabajos, setTrabajos] = useState<TrabajoDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [form, setForm] = useState<FormTrabajo | null>(null)
  /** Cuantas anotaciones tiene cada trabajo, para mostrarlo en su boton. */
  const [notasPorTrabajo, setNotasPorTrabajo] = useState<Record<number, number>>({})
  /** Trabajo cuyas anotaciones se estan leyendo en el modal chico. */
  const [trabajoParaNotas, setTrabajoParaNotas] = useState<TrabajoDto | null>(null)
  /** Trabajo cuyo grafico se esta viendo en el modal encima de este. */
  const [trabajoParaGrafico, setTrabajoParaGrafico] = useState<TrabajoDto | null>(null)

  const siguienteClave = useRef(1)

  const clave = useCallback(() => siguienteClave.current++, [])

  /** Las notas cuelgan del atleta en la sesion, asi que se traen todas juntas. */
  const cargarNotas = useCallback(async () => {
    try {
      const notas = await anotacionesApi.listar({
        atletaId: atleta.atletaId,
        entrenamientoId,
      })

      const conteo: Record<number, number> = {}
      for (const nota of notas) {
        if (nota.trabajoId !== null) {
          conteo[nota.trabajoId] = (conteo[nota.trabajoId] ?? 0) + 1
        }
      }

      setNotasPorTrabajo(conteo)
    } catch {
      // Si falla el conteo, el boton simplemente no muestra el numero.
      setNotasPorTrabajo({})
    }
  }, [atleta.atletaId, entrenamientoId])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      setTrabajos(await trabajosApi.listar(entrenamientoId, atleta.atletaId))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los trabajos.')
    } finally {
      setCargando(false)
    }
  }, [entrenamientoId, atleta.atletaId])

  useEffect(() => {
    void cargar()
    void cargarNotas()
  }, [cargar, cargarNotas])

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

  function nuevoFormulario(tipo: TipoTrabajo): FormTrabajo {
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

  function formularioDesde(trabajo: TrabajoDto): FormTrabajo {
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

  function cambiarForm(cambios: Partial<FormTrabajo>) {
    setForm((previo) => (previo ? { ...previo, ...cambios } : previo))
  }

  /**
   * Cambiar el tipo cambia la grilla. Lo que ya se cargo del otro tipo se
   * conserva por si el entrenador vuelve atras, y si la grilla nueva esta
   * vacia se siembra una fila para que nunca quede un formulario sin filas.
   */
  function cambiarTipo(tipo: TipoTrabajo) {
    setForm((previo) => {
      if (!previo) {
        return previo
      }

      const cambios: Partial<FormTrabajo> = { tipo }
      if (esTrabajoDeGimnasio(tipo) && previo.ejercicios.length === 0) {
        cambios.ejercicios = [nuevoBloque()]
      }
      if (!esTrabajoDeGimnasio(tipo) && previo.parciales.length === 0) {
        cambios.parciales = [nuevaFilaParcial()]
      }
      if (esTrabajoDeAgua(tipo) && previo.paladas.length === 0) {
        cambios.paladas = [nuevaFilaPalada()]
      }

      return { ...previo, ...cambios }
    })
  }

  function agregarParcial() {
    setForm((previo) =>
      previo ? { ...previo, parciales: [...previo.parciales, nuevaFilaParcial()] } : previo,
    )
  }

  function cambiarParcial(claveFila: number, cambios: Partial<FilaParcial>) {
    setForm((previo) =>
      previo
        ? {
            ...previo,
            parciales: previo.parciales.map((fila) =>
              fila.clave === claveFila ? { ...fila, ...cambios } : fila,
            ),
          }
        : previo,
    )
  }

  function quitarParcial(claveFila: number) {
    setForm((previo) =>
      previo
        ? { ...previo, parciales: previo.parciales.filter((f) => f.clave !== claveFila) }
        : previo,
    )
  }

  function agregarPalada() {
    setForm((previo) =>
      previo ? { ...previo, paladas: [...previo.paladas, nuevaFilaPalada()] } : previo,
    )
  }

  function cambiarPalada(claveFila: number, cambios: Partial<FilaPalada>) {
    setForm((previo) =>
      previo
        ? {
            ...previo,
            paladas: previo.paladas.map((fila) =>
              fila.clave === claveFila ? { ...fila, ...cambios } : fila,
            ),
          }
        : previo,
    )
  }

  function quitarPalada(claveFila: number) {
    setForm((previo) =>
      previo ? { ...previo, paladas: previo.paladas.filter((f) => f.clave !== claveFila) } : previo,
    )
  }

  function agregarEjercicio() {
    setForm((previo) =>
      previo ? { ...previo, ejercicios: [...previo.ejercicios, nuevoBloque()] } : previo,
    )
  }

  function cambiarEjercicio(claveBloque: number, cambios: Partial<BloqueEjercicio>) {
    setForm((previo) =>
      previo
        ? {
            ...previo,
            ejercicios: previo.ejercicios.map((bloque) =>
              bloque.clave === claveBloque ? { ...bloque, ...cambios } : bloque,
            ),
          }
        : previo,
    )
  }

  function quitarEjercicio(claveBloque: number) {
    setForm((previo) =>
      previo
        ? { ...previo, ejercicios: previo.ejercicios.filter((b) => b.clave !== claveBloque) }
        : previo,
    )
  }

  function agregarSerie(claveBloque: number) {
    setForm((previo) =>
      previo
        ? {
            ...previo,
            ejercicios: previo.ejercicios.map((bloque) =>
              bloque.clave === claveBloque
                ? { ...bloque, series: [...bloque.series, nuevaFilaSerie()] }
                : bloque,
            ),
          }
        : previo,
    )
  }

  function cambiarSerie(claveBloque: number, claveSerie: number, cambios: Partial<FilaSerie>) {
    setForm((previo) =>
      previo
        ? {
            ...previo,
            ejercicios: previo.ejercicios.map((bloque) =>
              bloque.clave === claveBloque
                ? {
                    ...bloque,
                    series: bloque.series.map((serie) =>
                      serie.clave === claveSerie ? { ...serie, ...cambios } : serie,
                    ),
                  }
                : bloque,
            ),
          }
        : previo,
    )
  }

  function quitarSerie(claveBloque: number, claveSerie: number) {
    setForm((previo) =>
      previo
        ? {
            ...previo,
            ejercicios: previo.ejercicios.map((bloque) =>
              bloque.clave === claveBloque
                ? { ...bloque, series: bloque.series.filter((s) => s.clave !== claveSerie) }
                : bloque,
            ),
          }
        : previo,
    )
  }

  async function guardar() {
    if (!form) {
      return
    }

    const armado = armarRequest(form)
    if ('error' in armado) {
      setError(armado.error)
      return
    }

    setOcupado(true)
    setError(null)

    try {
      const guardado =
        form.id === null
          ? await trabajosApi.crear(entrenamientoId, atleta.atletaId, armado.datos)
          : await trabajosApi.actualizar(entrenamientoId, atleta.atletaId, form.id, armado.datos)

      setTrabajos((previos) =>
        ordenar(
          form.id === null
            ? [...previos, guardado]
            : previos.map((trabajo) => (trabajo.id === guardado.id ? guardado : trabajo)),
        ),
      )
      setForm(null)
      onCambio()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el trabajo.')
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(trabajo: TrabajoDto) {
    const detalle = esTrabajoDeGimnasio(trabajo.tipo)
      ? `${trabajo.ejercicios.length} ${trabajo.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}`
      : `${trabajo.parciales.length} ${trabajo.parciales.length === 1 ? 'parcial' : 'parciales'}`

    const confirmado = window.confirm(
      `¿Eliminar el trabajo de ${etiquetaTipoTrabajo(trabajo.tipo).toLowerCase()}${trabajo.horaInicio ? ` de las ${trabajo.horaInicio}` : ''} con sus ${detalle}?`,
    )
    if (!confirmado) {
      return
    }

    setOcupado(true)
    setError(null)

    try {
      await trabajosApi.eliminar(entrenamientoId, atleta.atletaId, trabajo.id)
      setTrabajos((previos) => previos.filter((t) => t.id !== trabajo.id))
      onCambio()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar el trabajo.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal
      titulo="Trabajos"
      subtitulo={`${atleta.apellido}, ${atleta.nombre} · ${atleta.dni}`}
      pausado={trabajoParaNotas !== null || trabajoParaGrafico !== null}
      onCerrar={onCerrar}
    >
      {error && <p className="error">{error}</p>}

      {form ? (
        <FormularioTrabajo
          form={form}
          ocupado={ocupado}
          onCambiar={cambiarForm}
          onCambiarTipo={cambiarTipo}
          onAgregarParcial={agregarParcial}
          onCambiarParcial={cambiarParcial}
          onQuitarParcial={quitarParcial}
          onAgregarPalada={agregarPalada}
          onCambiarPalada={cambiarPalada}
          onQuitarPalada={quitarPalada}
          onAgregarEjercicio={agregarEjercicio}
          onCambiarEjercicio={cambiarEjercicio}
          onQuitarEjercicio={quitarEjercicio}
          onAgregarSerie={agregarSerie}
          onCambiarSerie={cambiarSerie}
          onQuitarSerie={quitarSerie}
          onCancelar={() => {
            setForm(null)
            setError(null)
          }}
          onGuardar={() => void guardar()}
        />
      ) : (
        <>
          <div className="encabezado">
            <h4 className="titulo-seccion">
              {trabajos.length === 0
                ? 'Sin trabajos cargados'
                : `${trabajos.length} ${trabajos.length === 1 ? 'trabajo' : 'trabajos'}`}
            </h4>
          </div>

          <div className="acciones-trabajo">
            {TIPOS.map((tipo) => (
              <button
                type="button"
                className={`boton-tipo tipo-${tipo.toLowerCase()}`}
                key={tipo}
                onClick={() => {
                  setError(null)
                  setForm(nuevoFormulario(tipo))
                }}
              >
                Agregar trabajo {ETIQUETA_TIPO[tipo]}
              </button>
            ))}
          </div>

          {cargando ? (
            <p className="sutil">Cargando…</p>
          ) : trabajos.length === 0 ? (
            <p className="sutil">
              Elegí dónde fue el trabajo: en gimnasio se cargan ejercicios con sus series, y en
              tierra y agua, los parciales con distancia y tiempo.
            </p>
          ) : (
            <div className="trabajos">
              {trabajos.map((trabajo) => (
                <TarjetaTrabajo
                  trabajo={trabajo}
                  key={trabajo.id}
                  onGrafico={() => {
                    setError(null)
                    setTrabajoParaGrafico(trabajo)
                  }}
                  acciones={
                    <>
                      <button
                        type="button"
                        className="boton-fantasma"
                        onClick={() => setTrabajoParaNotas(trabajo)}
                      >
                        Anotaciones
                        {(notasPorTrabajo[trabajo.id] ?? 0) > 0 &&
                          ` · ${notasPorTrabajo[trabajo.id]}`}
                      </button>
                      <button
                        type="button"
                        className="boton-fantasma"
                        disabled={ocupado}
                        onClick={() => {
                          setError(null)
                          setForm(formularioDesde(trabajo))
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="boton-fantasma peligro"
                        disabled={ocupado}
                        onClick={() => void eliminar(trabajo)}
                      >
                        Eliminar
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {trabajoParaNotas && (
        <ModalAnotaciones
          titulo="Anotaciones del trabajo"
          subtitulo={subtituloNotas(trabajoParaNotas)}
          contexto={{ trabajoId: trabajoParaNotas.id }}
          onCerrar={() => setTrabajoParaNotas(null)}
          onCambio={() => void cargarNotas()}
        />
      )}

      {trabajoParaGrafico && (
        <ModalGraficoTrabajo
          trabajo={trabajoParaGrafico}
          apilado
          onCerrar={() => setTrabajoParaGrafico(null)}
        />
      )}
    </Modal>
  )
}

/** "Tierra · 09:30 h" para el encabezado del modal de anotaciones. */
function subtituloNotas(trabajo: TrabajoDto): string {
  const hora = trabajo.horaInicio ? ` · ${trabajo.horaInicio} h` : ''
  return `${etiquetaTipoTrabajo(trabajo.tipo)}${hora}`
}

/** Props del formulario, agrupadas para que la firma no quede larga. */
interface PropsFormulario {
  form: FormTrabajo
  ocupado: boolean
  onCambiar: (cambios: Partial<FormTrabajo>) => void
  onCambiarTipo: (tipo: TipoTrabajo) => void
  onAgregarParcial: () => void
  onCambiarParcial: (clave: number, cambios: Partial<FilaParcial>) => void
  onQuitarParcial: (clave: number) => void
  onAgregarPalada: () => void
  onCambiarPalada: (clave: number, cambios: Partial<FilaPalada>) => void
  onQuitarPalada: (clave: number) => void
  onAgregarEjercicio: () => void
  onCambiarEjercicio: (clave: number, cambios: Partial<BloqueEjercicio>) => void
  onQuitarEjercicio: (clave: number) => void
  onAgregarSerie: (clave: number) => void
  onCambiarSerie: (claveBloque: number, claveSerie: number, cambios: Partial<FilaSerie>) => void
  onQuitarSerie: (claveBloque: number, claveSerie: number) => void
  onCancelar: () => void
  onGuardar: () => void
}

function FormularioTrabajo({
  form,
  ocupado,
  onCambiar,
  onCambiarTipo,
  onAgregarParcial,
  onCambiarParcial,
  onQuitarParcial,
  onAgregarPalada,
  onCambiarPalada,
  onQuitarPalada,
  onAgregarEjercicio,
  onCambiarEjercicio,
  onQuitarEjercicio,
  onAgregarSerie,
  onCambiarSerie,
  onQuitarSerie,
  onCancelar,
  onGuardar,
}: PropsFormulario) {
  const gimnasio = esTrabajoDeGimnasio(form.tipo)

  return (
    <form
      className="trabajo-form"
      onSubmit={(evento) => {
        evento.preventDefault()
        onGuardar()
      }}
    >
      <h4 className="titulo-seccion">
        {form.id === null
          ? `Nuevo trabajo · ${etiquetaTipoTrabajo(form.tipo)}`
          : `Editar trabajo · ${etiquetaTipoTrabajo(form.tipo)}`}
      </h4>

      <div className="grilla">
        <label>
          Tipo de trabajo
          <select
            value={form.tipo}
            onChange={(e) => onCambiarTipo(e.target.value as TipoTrabajo)}
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
            onChange={(e) => onCambiar({ horaInicio: e.target.value })}
            placeholder="09:30"
          />
        </label>

        <label>
          Observaciones
          <input
            value={form.observaciones}
            onChange={(e) => onCambiar({ observaciones: e.target.value })}
            placeholder="Opcional"
          />
        </label>
      </div>

      {gimnasio ? (
        <section className="parciales">
          <div className="parciales-cabecera">
            <div>
              <h5>Ejercicios</h5>
              <p className="sutil">Cada ejercicio lleva sus series: reps, % y kg.</p>
            </div>
            <button type="button" className="boton-fantasma" onClick={onAgregarEjercicio}>
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
                  onChange={(e) => onCambiarEjercicio(bloque.clave, { nombre: e.target.value })}
                  placeholder="Ejercicio (ej. Sentadillas)"
                  autoFocus={indice === 0 && !bloque.nombre}
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
                  onClick={() => onQuitarEjercicio(bloque.clave)}
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
                        onCambiarSerie(bloque.clave, serie.clave, { repeticiones: e.target.value })
                      }
                    />
                    <input
                      className="serie-campo"
                      inputMode="numeric"
                      placeholder="%"
                      value={serie.porcentaje}
                      onChange={(e) =>
                        onCambiarSerie(bloque.clave, serie.clave, { porcentaje: e.target.value })
                      }
                    />
                    <input
                      className="serie-campo"
                      inputMode="decimal"
                      placeholder="Kg"
                      value={serie.peso}
                      onChange={(e) =>
                        onCambiarSerie(bloque.clave, serie.clave, { peso: e.target.value })
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
                      onClick={() => onQuitarSerie(bloque.clave, serie.clave)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="boton-fantasma"
                onClick={() => onAgregarSerie(bloque.clave)}
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
              <p className="sutil">El parcial 1 es la primera marca del cronómetro.</p>
            </div>
            <button type="button" className="boton-fantasma" onClick={onAgregarParcial}>
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
                  onChange={(e) => onCambiarParcial(fila.clave, { distancia: e.target.value })}
                />
                <input
                  className="parcial-tiempo"
                  inputMode="decimal"
                  placeholder="Tiempo (2:12)"
                  value={fila.tiempo}
                  onChange={(e) => onCambiarParcial(fila.clave, { tiempo: e.target.value })}
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
                  onClick={() => onQuitarParcial(fila.clave)}
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
            <button type="button" className="boton-fantasma" onClick={onAgregarPalada}>
              Agregar palada
            </button>
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
                    <input
                      className="palada-tiempo"
                      inputMode="decimal"
                      placeholder="Tiempo (1:40)"
                      value={palada.tiempo}
                      onChange={(e) => onCambiarPalada(palada.clave, { tiempo: e.target.value })}
                    />
                    <input
                      className="palada-ppm"
                      inputMode="numeric"
                      placeholder="ppm"
                      value={palada.ppm}
                      onChange={(e) => onCambiarPalada(palada.clave, { ppm: e.target.value })}
                    />
                    <span className={`palada-destino${destino.aviso ? ' aviso' : ''}`}>
                      {destino.texto}
                    </span>
                    <button
                      type="button"
                      className="boton-fantasma peligro"
                      title="Quitar esta palada"
                      onClick={() => onQuitarPalada(palada.clave)}
                    >
                      Quitar
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <div className="form-acciones">
        <button type="button" className="boton-fantasma" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar trabajo'}
        </button>
      </div>
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
 * el backend: el primero cuyo tiempo acumulado sea mayor que el de la muestra.
 * Con 0:50, 1:45 y 2:40, una muestra de 1:40 va al parcial 2.
 */
function parcialDePalada(
  filas: FilaParcial[],
  tiempo: number,
): { numero: number; pasado: boolean } | null {
  const acumulados = filas.map((fila) => parsearTiempo(fila.tiempo))

  for (let i = 0; i < acumulados.length; i++) {
    const acumulado = acumulados[i]

    // Con un parcial sin tiempo todavia no hay con que decidir.
    if (acumulado === null) {
      return null
    }

    if (tiempo < acumulado) {
      return { numero: i + 1, pasado: false }
    }
  }

  if (acumulados.length === 0) {
    return null
  }

  // Se pasa de la ultima marca: el backend la deja en la ultima fila.
  return { numero: acumulados.length, pasado: true }
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
    ? { texto: `parcial ${parcial.numero} · pasa la última marca`, aviso: true }
    : { texto: `parcial ${parcial.numero}`, aviso: false }
}

/**
 * Valida el formulario y arma el cuerpo del request. Devuelve un mensaje de
 * error en castellano cuando algo no se entiende, para no depender del 400.
 */
function armarRequest(form: FormTrabajo): { datos: GuardarTrabajoRequest } | { error: string } {
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
      return { error: `El tiempo del parcial ${indice + 1} no se entiende. Escribilo como 2:12.` }
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
      return { error: `Cargá el tiempo de la palada ${indice + 1}, como 1:40.` }
    }

    if (parsearTiempo(tiempo) === null) {
      return { error: `El tiempo de la palada ${indice + 1} no se entiende. Escribilo como 1:40.` }
    }

    const ppm = Number(ppmTexto)
    if (!Number.isInteger(ppm) || ppm < 1 || ppm > 400) {
      return { error: `Cargá las ppm de la palada ${indice + 1}, entre 1 y 400.` }
    }

    paladas.push({ tiempo, ppm })
  }

  return { datos: paladas }
}

/** Mismo orden que usa el backend: por hora de trabajo y despues por carga. */
function ordenar(trabajos: TrabajoDto[]): TrabajoDto[] {
  return [...trabajos].sort((a, b) => {
    const horaA = a.horaInicio ?? '99:99'
    const horaB = b.horaInicio ?? '99:99'
    return horaA === horaB ? a.id - b.id : horaA.localeCompare(horaB)
  })
}
