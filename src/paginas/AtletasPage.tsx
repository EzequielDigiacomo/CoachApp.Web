import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import {
  Badge,
  Block,
  BlockTitle,
  Button,
  Link,
  List,
  ListInput,
  ListItem,
  Navbar,
  Page,
  Popup,
  Preloader,
  Toggle,
} from 'konsta/react'
import { useNavigate } from 'react-router-dom'
import { api, mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { atletasApi } from '../api/entrenamientos'
import { confirmar } from '../componentes/Confirmacion'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import type { AtletaDto, CrearAtletaRequest } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

const ATLETA_VACIO: CrearAtletaRequest = {
  nombre: '',
  apellido: '',
  fechaNacimiento: '',
  dni: '',
  club: '',
  email: '',
  telefono: '',
}

export function AtletasPage() {
  const consultas = useQueryClient()
  const navegar = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  /** Atleta que se esta editando en el modal, o null si no hay ninguno. */
  const [enEdicion, setEnEdicion] = useState<AtletaDto | null>(null)

  const busquedaDiferida = useDeferredValue(busqueda.trim())

  const listado = useQuery({
    queryKey: clavesConsulta.atletas(busquedaDiferida, incluirInactivos),
    queryFn: ({ signal }) =>
      atletasApi.listarConFiltros(
        { busqueda: busquedaDiferida || undefined, incluirInactivos },
        { signal },
      ),
  })

  const atletas = listado.data ?? []
  const error = listado.isError
    ? mensajeApi(listado.error, 'No se pudieron cargar los atletas.')
    : null

  const cambiarEstado = useMutation({
    mutationFn: async (atleta: AtletaDto) => {
      if (atleta.activo) {
        await api.delete(`/api/atletas/${atleta.id}`)
      } else {
        await api.patch<AtletaDto>(`/api/atletas/${atleta.id}/estado`, { activo: true })
      }
    },
    onSuccess: async () => {
      await consultas.invalidateQueries({ queryKey: ['atletas'] })
    },
  })

  async function pedirCambioEstado(atleta: AtletaDto) {
    const bajando = atleta.activo
    const mensaje = bajando
      ? `¿Dar de baja a ${atleta.apellido}, ${atleta.nombre}? El historial se conserva.`
      : `¿Reactivar a ${atleta.apellido}, ${atleta.nombre}?`

    if (
      !(await confirmar(mensaje, {
        peligro: bajando,
        aceptar: bajando ? 'Dar de baja' : 'Reactivar',
      }))
    ) {
      return
    }

    try {
      await cambiarEstado.mutateAsync(atleta)
    } catch {
      // El error se muestra abajo via cambiarEstado.error
    }
  }

  function guardado(atleta: AtletaDto) {
    setMostrarForm(false)
    setEnEdicion(null)
    void consultas.invalidateQueries({ queryKey: ['atletas'] })
    // Actualizacion optimista local mientras llega el refetch.
    consultas.setQueryData<AtletaDto[]>(
      clavesConsulta.atletas(busquedaDiferida, incluirInactivos),
      (previos) =>
        [...(previos ?? []).filter((a) => a.id !== atleta.id), atleta].sort((a, b) =>
          a.apellido.localeCompare(b.apellido),
        ),
    )
  }

  const errorAccion = cambiarEstado.isError
    ? mensajeApi(cambiarEstado.error, 'No se pudo cambiar el estado del atleta.')
    : null

  return (
    <MarcoPagina
      titulo="Atletas"
      right={
        <>
          <Button inline small rounded tonal onClick={() => navegar('/colores')}>
            Colores
          </Button>
          <Button inline small rounded onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? 'Cancelar' : 'Nuevo atleta'}
          </Button>
        </>
      }
    >
      {mostrarForm && (
        <FormularioAtleta onGuardado={guardado} onCancelar={() => setMostrarForm(false)} />
      )}

      <List strong inset>
        <ListInput
          label="Buscar"
          type="text"
          placeholder="Nombre, apellido o DNI"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <ListItem
          title="Incluir dados de baja"
          after={
            <Toggle
              checked={incluirInactivos}
              onChange={(e) => setIncluirInactivos(e.target.checked)}
            />
          }
        />
      </List>

      {(error || errorAccion) && (
        <Block>
          <p className="text-red-500">{error ?? errorAccion}</p>
        </Block>
      )}

      {listado.isPending ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : atletas.length === 0 ? (
        <Block>
          <p className="opacity-60">
            No hay atletas{busqueda ? ' para esa búsqueda' : ' cargados'}.
          </p>
        </Block>
      ) : (
        <List strong inset>
          {atletas.map((atleta) => {
            const categorias = atleta.categorias ?? []
            const datosBasicos = [
              `DNI ${atleta.dni}`,
              `${atleta.edad} años`,
              atleta.club,
            ]
              .filter(Boolean)
              .join(' · ')
            const contacto = [atleta.telefono, atleta.email].filter(Boolean).join(' · ')

            return (
              <ListItem
                key={atleta.id}
                className={atleta.activo ? undefined : 'opacity-60'}
                title={
                  <NombreAtleta
                    nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                    color={atleta.color}
                  />
                }
                subtitle={datosBasicos}
                text={contacto || undefined}
                after={
                  categorias.length > 0 || !atleta.activo ? (
                    <span className="flex flex-wrap gap-1 justify-end">
                      {categorias.map((categoria) => (
                        <Badge key={categoria} colors={{ bg: 'bg-primary' }}>
                          {categoria}
                        </Badge>
                      ))}
                      {!atleta.activo && <Badge colors={{ bg: 'bg-red-500' }}>baja</Badge>}
                    </span>
                  ) : undefined
                }
                footer={
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      type="button"
                      inline
                      small
                      rounded
                      tonal
                      onClick={() => navegar(`/atletas/${atleta.id}`)}
                    >
                      Historial
                    </Button>
                    <Button
                      type="button"
                      inline
                      small
                      rounded
                      tonal
                      disabled={cambiarEstado.isPending}
                      onClick={() => setEnEdicion(atleta)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      inline
                      small
                      rounded
                      outline
                      colors={atleta.activo ? { outlineBorderIos: 'border-red-500', textIos: 'text-red-500' } : undefined}
                      disabled={cambiarEstado.isPending}
                      onClick={() => void pedirCambioEstado(atleta)}
                    >
                      {atleta.activo ? 'Dar de baja' : 'Reactivar'}
                    </Button>
                  </div>
                }
              />
            )
          })}
        </List>
      )}

      {/* Edición en un Popup de Konsta (reemplaza al Modal propio). */}
      <Popup opened={enEdicion != null} onBackdropClick={() => setEnEdicion(null)}>
        <Page>
          <Navbar
            title="Editar atleta"
            right={
              <Link onClick={() => setEnEdicion(null)}>
                Cerrar
              </Link>
            }
          />
          {enEdicion && (
            <>
              <BlockTitle>
                <NombreAtleta
                  nombre={textoAtleta(enEdicion.apellido, enEdicion.nombre)}
                  color={enEdicion.color}
                />
              </BlockTitle>
              <FormularioAtleta
                atleta={enEdicion}
                onGuardado={guardado}
                onCancelar={() => setEnEdicion(null)}
              />
            </>
          )}
        </Page>
      </Popup>
    </MarcoPagina>
  )
}

interface PropsFormulario {
  /** Cuando viene, se edita ese atleta en lugar de crear uno nuevo. */
  atleta?: AtletaDto
  onGuardado: (atleta: AtletaDto) => void
  onCancelar: () => void
}

/** Sirve para el alta y para la edicion: cambia el metodo y el texto del boton. */
function FormularioAtleta({ atleta, onGuardado, onCancelar }: PropsFormulario) {
  const [datos, setDatos] = useState<CrearAtletaRequest>(() =>
    atleta
      ? {
          nombre: atleta.nombre,
          apellido: atleta.apellido,
          fechaNacimiento: atleta.fechaNacimiento,
          dni: atleta.dni,
          club: atleta.club ?? '',
          email: atleta.email ?? '',
          telefono: atleta.telefono ?? '',
        }
      : ATLETA_VACIO,
  )
  const [error, setError] = useState<string | null>(null)

  const guardarMutacion = useMutation({
    mutationFn: (pedido: CrearAtletaRequest) =>
      atleta
        ? api.put<AtletaDto>(`/api/atletas/${atleta.id}`, pedido)
        : api.post<AtletaDto>('/api/atletas', pedido),
    onSuccess: (guardado) => onGuardado(guardado),
    onError: (e) => setError(mensajeApi(e, 'No se pudo guardar el atleta.')),
  })

  function campo<C extends keyof CrearAtletaRequest>(nombre: C) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDatos((previos) => ({ ...previos, [nombre]: e.target.value }))
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    guardarMutacion.mutate(normalizar(datos))
  }

  return (
    <form onSubmit={guardar}>
      <List strong inset>
        <ListInput label="Nombre" type="text" value={datos.nombre} onChange={campo('nombre')} required />
        <ListInput
          label="Apellido"
          type="text"
          value={datos.apellido}
          onChange={campo('apellido')}
          required
        />
        <ListInput
          label="Fecha de nacimiento"
          type="date"
          value={datos.fechaNacimiento}
          onChange={campo('fechaNacimiento')}
          required
        />
        <ListInput label="DNI" type="text" value={datos.dni} onChange={campo('dni')} required />
        <ListInput label="Club" type="text" value={datos.club ?? ''} onChange={campo('club')} />
        <ListInput
          label="Email"
          type="email"
          value={datos.email ?? ''}
          onChange={campo('email')}
        />
        <ListInput
          label="Teléfono"
          type="tel"
          value={datos.telefono ?? ''}
          onChange={campo('telefono')}
        />
      </List>

      {error && (
        <Block className="!mt-0">
          <p className="text-red-500">{error}</p>
        </Block>
      )}

      <Block className="flex gap-2 justify-end !mt-0">
        <Button type="button" inline rounded clear onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" inline rounded disabled={guardarMutacion.isPending}>
          {guardarMutacion.isPending ? 'Guardando…' : atleta ? 'Guardar cambios' : 'Guardar atleta'}
        </Button>
      </Block>
    </form>
  )
}

/** Los campos opcionales vacios viajan como null, no como cadena vacia. */
function normalizar(datos: CrearAtletaRequest): CrearAtletaRequest {
  return {
    ...datos,
    club: textoOpcional(datos.club),
    email: textoOpcional(datos.email),
    telefono: textoOpcional(datos.telefono),
  }
}

function textoOpcional(valor: string | null | undefined): string | null {
  const limpio = valor?.trim()
  return limpio ? limpio : null
}
