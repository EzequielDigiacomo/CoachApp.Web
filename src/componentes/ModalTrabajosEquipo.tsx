import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/cliente'
import { trabajosEquipoApi } from '../api/equipos'
import { useAuth } from '../auth/contextoAuth'
import { esStaff, type EquipoEnEntrenamientoDto, type TrabajoDto } from '../tipos/api'
import {
  FormularioTrabajo,
  armarRequest,
  formularioDesde,
  nuevoFormulario,
  type FormTrabajo,
} from './FormularioTrabajo'
import { Modal } from './Modal'
import { ModalGraficoTrabajo } from './ModalGraficoTrabajo'
import { TarjetaTrabajo } from './TarjetaTrabajo'

interface Props {
  entrenamientoId: number
  equipo: EquipoEnEntrenamientoDto
  onCerrar: () => void
  onCambio: () => void
}

/** Trabajos de agua del bote. El atleta puede ver detalle y gráficos. */
export function ModalTrabajosEquipo({ entrenamientoId, equipo, onCerrar, onCambio }: Props) {
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const [trabajos, setTrabajos] = useState<TrabajoDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [form, setForm] = useState<FormTrabajo | null>(null)
  const [trabajoParaGrafico, setTrabajoParaGrafico] = useState<TrabajoDto | null>(null)
  const [trabajoParaVelocidad, setTrabajoParaVelocidad] = useState<TrabajoDto | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setTrabajos(await trabajosEquipoApi.listar(entrenamientoId, equipo.id))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los trabajos.')
    } finally {
      setCargando(false)
    }
  }, [entrenamientoId, equipo.id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function guardar() {
    if (!form) {
      return
    }

    const armado = armarRequest({ ...form, tipo: 'Agua' })
    if ('error' in armado) {
      setError(armado.error)
      return
    }

    setOcupado(true)
    setError(null)
    try {
      const datos = { ...armado.datos, tipo: 'Agua' as const }
      const guardado =
        form.id === null
          ? await trabajosEquipoApi.crear(entrenamientoId, equipo.id, datos)
          : await trabajosEquipoApi.actualizar(entrenamientoId, equipo.id, form.id, datos)

      setTrabajos((previos) =>
        form.id === null
          ? [...previos, guardado]
          : previos.map((trabajo) => (trabajo.id === guardado.id ? guardado : trabajo)),
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
    if (
      !window.confirm(
        `¿Eliminar el trabajo de agua${trabajo.horaInicio ? ` de las ${trabajo.horaInicio}` : ''}?`,
      )
    ) {
      return
    }

    setOcupado(true)
    setError(null)
    try {
      await trabajosEquipoApi.eliminar(entrenamientoId, equipo.id, trabajo.id)
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
      titulo="Trabajo de equipo"
      subtitulo={equipo.etiqueta}
      pausado={trabajoParaGrafico !== null || trabajoParaVelocidad !== null}
      onCerrar={onCerrar}
    >
      {error && <p className="error">{error}</p>}

      {form && staff ? (
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
            {staff && (
              <button
                type="button"
                className="boton"
                onClick={() => {
                  setError(null)
                  setForm(nuevoFormulario('Agua'))
                }}
              >
                Agregar trabajo agua
              </button>
            )}
          </div>

          {cargando ? (
            <p className="sutil">Cargando…</p>
          ) : trabajos.length === 0 ? (
            <p className="sutil">
              {staff
                ? 'Cargá el trabajo de agua del bote: parciales, distancia y tiempo.'
                : 'Todavía no hay trabajos cargados en este bote.'}
            </p>
          ) : (
            <div className="trabajos">
              {trabajos.map((trabajo) => (
                <TarjetaTrabajo
                  trabajo={trabajo}
                  key={trabajo.id}
                  onVelocidad={() => {
                    setError(null)
                    setTrabajoParaVelocidad(trabajo)
                  }}
                  onGrafico={() => {
                    setError(null)
                    setTrabajoParaGrafico(trabajo)
                  }}
                  acciones={
                    staff ? (
                      <>
                        <button
                          type="button"
                          className="boton-fantasma"
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
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {trabajoParaVelocidad && (
        <ModalGraficoTrabajo
          trabajo={trabajoParaVelocidad}
          modo="velocidad"
          apilado
          onCerrar={() => setTrabajoParaVelocidad(null)}
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
