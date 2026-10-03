import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { anotacionesApi, contextoAnotacion, fechaNota } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { atletasApi } from '../api/entrenamientos'
import {
  ANOTACION_VACIA,
  FormularioAnotacion,
  type DatosAnotacion,
} from '../componentes/FormularioAnotacion'
import { TextoConEnlaces } from '../componentes/TextoConEnlaces'
import type { AnotacionDto, AtletaDto, GuardarAnotacionRequest } from '../tipos/api'

/**
 * Todas las anotaciones del entrenador, de la mas nueva a la mas vieja.
 * Se puede buscar por texto y filtrar por atleta.
 */
export function AnotacionesPage() {
  const [parametros, setParametros] = useSearchParams()
  const [notas, setNotas] = useState<AnotacionDto[]>([])
  const [atletas, setAtletas] = useState<AtletaDto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [datos, setDatos] = useState<DatosAnotacion>(ANOTACION_VACIA)
  const [editando, setEditando] = useState<AnotacionDto | null>(null)

  // El atleta elegido vive en la URL, asi se puede linkear desde el historial.
  const atletaFiltro = parametros.get('atleta') ?? ''

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      setNotas(
        await anotacionesApi.listar({
          atletaId: atletaFiltro ? Number(atletaFiltro) : undefined,
          busqueda: busqueda.trim() || undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las anotaciones.')
    } finally {
      setCargando(false)
    }
  }, [atletaFiltro, busqueda])

  // Recarga al escribir, con una pequeña espera para no golpear la API en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => void cargar(), 300)
    return () => clearTimeout(temporizador)
  }, [cargar])

  // La lista de atletas solo hace falta para filtrar y para elegir el dueño.
  useEffect(() => {
    void atletasApi
      .listar()
      .then(setAtletas)
      .catch(() => setAtletas([]))
  }, [])

  function cambiarFiltroAtleta(valor: string) {
    setParametros(valor ? { atleta: valor } : {})
  }

  function abrirNuevo() {
    setEditando(null)
    setDatos({ ...ANOTACION_VACIA, atletaId: atletaFiltro })
    setMostrarForm(true)
    setError(null)
  }

  function cerrarFormulario() {
    setMostrarForm(false)
    setEditando(null)
    setDatos(ANOTACION_VACIA)
    setError(null)
  }

  function editar(nota: AnotacionDto) {
    setEditando(nota)
    setDatos({
      titulo: nota.titulo ?? '',
      texto: nota.texto,
      atletaId: nota.atletaId === null ? '' : String(nota.atletaId),
    })
    setMostrarForm(true)
    setError(null)
  }

  async function guardar() {
    const armado = armarRequest(datos)
    if ('error' in armado) {
      setError(armado.error)
      return
    }

    setOcupado(true)
    setError(null)

    try {
      if (editando) {
        await anotacionesApi.actualizar(editando.id, armado.datos)
      } else {
        await anotacionesApi.crear(armado.datos)
      }

      cerrarFormulario()
      await cargar()
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
        cerrarFormulario()
      }
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar la anotación.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>Anotaciones</h2>
        <button type="button" className="boton" onClick={mostrarForm ? cerrarFormulario : abrirNuevo}>
          {mostrarForm ? 'Cancelar' : 'Nueva anotación'}
        </button>
      </div>

      {mostrarForm && (
        <div className="tarjeta">
          <h4 className="titulo-seccion">
            {editando ? 'Editar anotación' : 'Nueva anotación'}
          </h4>
          <FormularioAnotacion
            datos={datos}
            onCambiar={(cambios) => setDatos((previos) => ({ ...previos, ...cambios }))}
            onGuardar={() => void guardar()}
            onCancelar={cerrarFormulario}
            guardando={ocupado}
            etiquetaGuardar={editando ? 'Guardar cambios' : 'Guardar anotación'}
            atletas={atletas}
            enfocar={!editando}
          />
        </div>
      )}

      <div className="filtros">
        <input
          className="busqueda"
          placeholder="Buscar en el texto o el título"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <label>
          Atleta
          <select value={atletaFiltro} onChange={(e) => cambiarFiltroAtleta(e.target.value)}>
            <option value="">Todos</option>
            {atletas.map((atleta) => (
              <option value={String(atleta.id)} key={atleta.id}>
                {atleta.apellido}, {atleta.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : notas.length === 0 ? (
        <p className="sutil">
          No hay anotaciones{busqueda || atletaFiltro ? ' con esos filtros' : ' todavía'}.
        </p>
      ) : (
        <ul className="notas-lista ancho">
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

              {contextoAnotacion(nota).length > 0 && (
                <p className="contexto">
                  {contextoAnotacion(nota).map((parte) => (
                    <span className="etiqueta-contexto" key={parte}>
                      {parte}
                    </span>
                  ))}
                </p>
              )}

              <p className="nota-texto">
                <TextoConEnlaces texto={nota.texto} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Valida lo minimo y arma el cuerpo del request. */
function armarRequest(datos: DatosAnotacion): { datos: GuardarAnotacionRequest } | { error: string } {
  const texto = datos.texto.trim()
  if (!texto) {
    return { error: 'Escribí el texto de la anotación.' }
  }

  return {
    datos: {
      titulo: datos.titulo.trim() || null,
      texto,
      atletaId: datos.atletaId ? Number(datos.atletaId) : null,
    },
  }
}
