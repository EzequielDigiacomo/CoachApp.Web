import { useCallback, useEffect, useState } from 'react'
import { anotacionesApi } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { esTrabajoDeGimnasio, etiquetaTipoTrabajo, trabajosApi } from '../api/entrenamientos'
import type { AtletaEnEntrenamientoDto, TrabajoDto } from '../tipos/api'
import { Modal } from './Modal'
import { ModalAnotaciones } from './ModalAnotaciones'
import { ModalGraficoTrabajo } from './ModalGraficoTrabajo'
import {
  ETIQUETA_TIPO,
  FormularioTrabajo,
  TIPOS,
  armarRequest,
  formularioDesde,
  nuevoFormulario,
  type FormTrabajo,
} from './FormularioTrabajo'
import { TarjetaTrabajo } from './TarjetaTrabajo'

interface Props {
  entrenamientoId: number
  atleta: AtletaEnEntrenamientoDto
  onCerrar: () => void
  /** Avisa al detalle de la sesion que cambio la cantidad de trabajos. */
  onCambio: () => void
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
          onCambiar={setForm}
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

/** Mismo orden que usa el backend: por hora de trabajo y despues por carga. */
function ordenar(trabajos: TrabajoDto[]): TrabajoDto[] {
  return [...trabajos].sort((a, b) => {
    const horaA = a.horaInicio ?? '99:99'
    const horaB = b.horaInicio ?? '99:99'
    return horaA === horaB ? a.id - b.id : horaA.localeCompare(horaB)
  })
}
