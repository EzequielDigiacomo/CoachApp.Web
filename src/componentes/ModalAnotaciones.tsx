import { useCallback, useEffect, useState } from 'react'
import { anotacionesApi, fechaNota } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import type { AnotacionDto, GuardarAnotacionRequest } from '../tipos/api'
import { ANOTACION_VACIA, FormularioAnotacion, type DatosAnotacion } from './FormularioAnotacion'
import { Modal } from './Modal'
import { TextoConEnlaces } from './TextoConEnlaces'

interface Props {
  titulo: string
  subtitulo?: string
  /**
   * A que queda atada la anotacion. Si viene el trabajo, manda el trabajo:
   * el backend saca de ahi el atleta y la sesion.
   */
  contexto: {
    atletaId?: number | null
    entrenamientoId?: number | null
    trabajoId?: number | null
  }
  onCerrar: () => void
  /** Avisa que se guardo o borro algo, para que el de abajo se actualice. */
  onCambio?: () => void
}

/**
 * Modal chico que se abre por delante para leer y escribir las anotaciones de
 * un trabajo (o de un atleta). Se lista lo que ya hay y se guarda lo nuevo.
 */
export function ModalAnotaciones({ titulo, subtitulo, contexto, onCerrar, onCambio }: Props) {
  const [notas, setNotas] = useState<AnotacionDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [datos, setDatos] = useState<DatosAnotacion>(ANOTACION_VACIA)
  const [editando, setEditando] = useState<AnotacionDto | null>(null)

  const { atletaId, entrenamientoId, trabajoId } = contexto

  // Si la nota cuelga de un trabajo, se muestran solo las de ese trabajo.
  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      setNotas(
        await anotacionesApi.listar(
          trabajoId
            ? { trabajoId }
            : {
                atletaId: atletaId ?? undefined,
                entrenamientoId: entrenamientoId ?? undefined,
              },
        ),
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las anotaciones.')
    } finally {
      setCargando(false)
    }
  }, [atletaId, entrenamientoId, trabajoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function cambiar(cambios: Partial<DatosAnotacion>) {
    setDatos((previos) => ({ ...previos, ...cambios }))
  }

  function limpiarFormulario() {
    setDatos(ANOTACION_VACIA)
    setEditando(null)
  }

  async function guardar() {
    const texto = datos.texto.trim()
    if (!texto) {
      setError('Escribí el texto de la anotación.')
      return
    }

    // El ancla define a que queda atada la nota: al trabajo o al atleta.
    const ancla: Pick<GuardarAnotacionRequest, 'atletaId' | 'entrenamientoId' | 'trabajoId'> =
      trabajoId
        ? { trabajoId }
        : { atletaId: atletaId ?? null, entrenamientoId: entrenamientoId ?? null }

    const cuerpo: GuardarAnotacionRequest = {
      ...ancla,
      titulo: datos.titulo.trim() || null,
      texto,
    }

    setOcupado(true)
    setError(null)

    try {
      if (editando) {
        await anotacionesApi.actualizar(editando.id, cuerpo)
      } else {
        await anotacionesApi.crear(cuerpo)
      }

      limpiarFormulario()
      await cargar()
      onCambio?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la anotación.')
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(nota: AnotacionDto) {
    if (!window.confirm('¿Eliminar esta anotación?')) {
      return
    }

    setOcupado(true)
    setError(null)

    try {
      await anotacionesApi.eliminar(nota.id)

      if (editando?.id === nota.id) {
        limpiarFormulario()
      }
      await cargar()
      onCambio?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar la anotación.')
    } finally {
      setOcupado(false)
    }
  }

  function editar(nota: AnotacionDto) {
    setError(null)
    setEditando(nota)
    setDatos({ titulo: nota.titulo ?? '', texto: nota.texto, atletaId: '' })
  }

  return (
    <Modal
      ancho="chico"
      apilado
      titulo={titulo}
      subtitulo={subtitulo}
      onCerrar={onCerrar}
    >
      {error && <p className="error">{error}</p>}

      <FormularioAnotacion
        datos={datos}
        onCambiar={cambiar}
        onGuardar={() => void guardar()}
        onCancelar={editando ? limpiarFormulario : undefined}
        guardando={ocupado}
        etiquetaGuardar={editando ? 'Guardar cambios' : 'Guardar anotación'}
        enfocar={!editando}
      />

      <section className="notas">
        <h4 className="titulo-seccion">
          {notas.length === 0
            ? 'Todavía no hay anotaciones'
            : `${notas.length} ${notas.length === 1 ? 'anotación' : 'anotaciones'}`}
        </h4>

        {cargando ? (
          <p className="sutil">Cargando…</p>
        ) : notas.length === 0 ? (
          <p className="sutil">Escribí arriba lo que quieras dejar guardado.</p>
        ) : (
          <ul className="notas-lista">
            {notas.map((nota) => (
              <li className="nota" key={nota.id}>
                <div className="nota-cabecera">
                  {nota.titulo && (
                  <strong>
                    <TextoConEnlaces texto={nota.titulo} />
                  </strong>
                )}
                  <span className="sutil">{fechaNota(nota)}</span>
                  <div className="nota-acciones">
                    <button
                      type="button"
                      className="boton-fantasma"
                      disabled={ocupado}
                      onClick={() => editar(nota)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="boton-fantasma peligro"
                      disabled={ocupado}
                      onClick={() => void eliminar(nota)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <p className="nota-texto">
              <TextoConEnlaces texto={nota.texto} />
            </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  )
}
