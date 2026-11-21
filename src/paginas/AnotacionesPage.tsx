import { Badge, Block, BlockTitle, Button, Card, List, ListInput, Preloader } from 'konsta/react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { anotacionesApi, contextoAnotacion, fechaNota } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { atletasApi } from '../api/entrenamientos'
import { confirmar } from '../componentes/Confirmacion'
import {
  ANOTACION_VACIA,
  FormularioAnotacion,
  type DatosAnotacion,
} from '../componentes/FormularioAnotacion'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import { TextoConEnlaces } from '../componentes/TextoConEnlaces'
import type { AnotacionDto, AtletaDto, GuardarAnotacionRequest } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

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

  // Desde el dashboard (?nueva=1) abrimos el form al toque y limpiamos el query.
  useEffect(() => {
    if (parametros.get('nueva') !== '1') {
      return
    }

    const atleta = parametros.get('atleta') ?? ''
    setEditando(null)
    setDatos({ ...ANOTACION_VACIA, atletaId: atleta })
    setMostrarForm(true)
    setError(null)

    const siguientes = new URLSearchParams(parametros)
    siguientes.delete('nueva')
    setParametros(siguientes, { replace: true })
  }, [parametros, setParametros])

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
    if (!(await confirmar('¿Eliminar esta anotación?', { peligro: true, aceptar: 'Eliminar' }))) {
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
    <MarcoPagina
      titulo="Anotaciones"
      right={
        <Button inline small rounded onClick={mostrarForm ? cerrarFormulario : abrirNuevo}>
          {mostrarForm ? 'Cancelar' : 'Nueva anotación'}
        </Button>
      }
    >
      {mostrarForm && (
        <>
          <BlockTitle>{editando ? 'Editar anotación' : 'Nueva anotación'}</BlockTitle>
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
        </>
      )}

      <List strong inset>
        <ListInput
          label="Buscar"
          type="text"
          placeholder="En el texto o el título"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <ListInput
          label="Atleta"
          type="select"
          dropdown
          value={atletaFiltro}
          onChange={(e) => cambiarFiltroAtleta(e.target.value)}
        >
          <option value="">Todos</option>
          {atletas.map((atleta) => (
            <option value={String(atleta.id)} key={atleta.id}>
              {atleta.apellido}, {atleta.nombre}
            </option>
          ))}
        </ListInput>
      </List>

      {error && (
        <Block>
          <p className="text-red-500">{error}</p>
        </Block>
      )}

      {cargando ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : notas.length === 0 ? (
        <Block>
          <p className="opacity-60">
            No hay anotaciones{busqueda || atletaFiltro ? ' con esos filtros' : ' todavía'}.
          </p>
        </Block>
      ) : (
        notas.map((nota) => {
          const nombreAtleta = textoAtleta(nota.atletaApellido ?? '', nota.atletaNombre ?? '')
          const contexto = contextoAnotacion(nota).filter((parte) => parte !== nombreAtleta)

          return (
            <Card
              key={nota.id}
              header={
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="min-w-0 break-words">
                    {nota.titulo ? <TextoConEnlaces texto={nota.titulo} /> : null}
                  </strong>
                  <span className="shrink-0 text-[13px] opacity-60">{fechaNota(nota)}</span>
                </div>
              }
            >
              {(nota.atletaApellido || contexto.length > 0) && (
                <p className="mb-2 flex flex-wrap gap-1">
                  {nota.atletaApellido && (
                    <Badge colors={{ bg: 'bg-primary/15', text: 'text-primary' }}>
                      <NombreAtleta nombre={nombreAtleta} color={nota.atletaColor} />
                    </Badge>
                  )}
                  {contexto.map((parte) => (
                    <Badge key={parte} colors={{ bg: 'bg-black/10 dark:bg-white/10', text: 'text-inherit' }}>
                      {parte}
                    </Badge>
                  ))}
                </p>
              )}

              <p className="whitespace-pre-wrap break-words">
                <TextoConEnlaces texto={nota.texto} />
              </p>

              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  inline
                  small
                  rounded
                  tonal
                  disabled={ocupado}
                  onClick={() => editar(nota)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  inline
                  small
                  rounded
                  outline
                  colors={{ outlineBorderIos: 'border-red-500', textIos: 'text-red-500' }}
                  disabled={ocupado}
                  onClick={() => void eliminar(nota)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          )
        })
      )}
    </MarcoPagina>
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
