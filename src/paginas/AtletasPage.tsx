import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { atletasApi } from '../api/entrenamientos'
import { confirmar } from '../componentes/Confirmacion'
import { Modal } from '../componentes/Modal'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import type { AtletaDto, CrearAtletaRequest } from '../tipos/api'

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
    <div className="pagina">
      <div className="encabezado">
        <h2>Atletas</h2>
        <div className="acciones-fila">
          <Link className="boton-fantasma enlace" to="/colores">
            Colores
          </Link>
          <button type="button" className="boton" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? 'Cancelar' : 'Nuevo atleta'}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <FormularioAtleta onGuardado={guardado} onCancelar={() => setMostrarForm(false)} />
      )}

      <div className="filtros">
        <input
          className="busqueda"
          placeholder="Buscar por nombre, apellido o DNI"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <label className="casilla">
          <input
            type="checkbox"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          Incluir dados de baja
        </label>
      </div>

      {(error || errorAccion) && <p className="error">{error ?? errorAccion}</p>}

      {listado.isPending ? (
        <p className="sutil">Cargando…</p>
      ) : atletas.length === 0 ? (
        <p className="sutil">No hay atletas{busqueda ? ' para esa búsqueda' : ' cargados'}.</p>
      ) : (
        <div className="tarjeta sin-relleno">
          <table className="tabla">
            <thead>
              <tr>
                <th>Apellido y nombre</th>
                <th>DNI</th>
                <th>Edad</th>
                <th>Club</th>
                <th>Contacto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {atletas.map((atleta) => (
                <tr key={atleta.id} className={atleta.activo ? undefined : 'inactivo'}>
                  <td>
                    <NombreAtleta
                      nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                      color={atleta.color}
                    />
                    {(atleta.categorias ?? []).map((categoria) => (
                      <span className="etiqueta" key={categoria}>
                        {categoria}
                      </span>
                    ))}
                    {!atleta.activo && <span className="etiqueta baja">baja</span>}
                  </td>
                  <td className="mono" data-etiqueta="DNI">
                    {atleta.dni}
                  </td>
                  <td data-etiqueta="Edad">{atleta.edad}</td>
                  <td data-etiqueta="Club">{atleta.club ?? '—'}</td>
                  <td data-etiqueta="Contacto">
                    {atleta.telefono ?? '—'}
                    {atleta.email && <span className="sutil bloque">{atleta.email}</span>}
                  </td>
                  <td className="derecha">
                    <div className="acciones-fila">
                      <Link className="boton-fantasma enlace" to={`/atletas/${atleta.id}`}>
                        Historial
                      </Link>
                      <button
                        type="button"
                        className="boton-fantasma"
                        disabled={cambiarEstado.isPending}
                        onClick={() => setEnEdicion(atleta)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="boton-fantasma peligro"
                        disabled={cambiarEstado.isPending}
                        onClick={() => void pedirCambioEstado(atleta)}
                      >
                        {atleta.activo ? 'Dar de baja' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {enEdicion && (
        <Modal
          titulo="Editar atleta"
          subtitulo={
            <NombreAtleta
              nombre={textoAtleta(enEdicion.apellido, enEdicion.nombre)}
              color={enEdicion.color}
            />
          }
          onCerrar={() => setEnEdicion(null)}
        >
          <FormularioAtleta
            atleta={enEdicion}
            onGuardado={guardado}
            onCancelar={() => setEnEdicion(null)}
          />
        </Modal>
      )}
    </div>
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
    <form className="tarjeta formulario" onSubmit={guardar}>
      <div className="grilla">
        <label>
          Nombre
          <input value={datos.nombre} onChange={campo('nombre')} required />
        </label>

        <label>
          Apellido
          <input value={datos.apellido} onChange={campo('apellido')} required />
        </label>

        <label>
          Fecha de nacimiento
          <input
            type="date"
            value={datos.fechaNacimiento}
            onChange={campo('fechaNacimiento')}
            required
          />
        </label>

        <label>
          DNI
          <input value={datos.dni} onChange={campo('dni')} required />
        </label>

        <label>
          Club
          <input value={datos.club ?? ''} onChange={campo('club')} />
        </label>

        <label>
          Email
          <input type="email" value={datos.email ?? ''} onChange={campo('email')} />
        </label>

        <label>
          Teléfono
          <input value={datos.telefono ?? ''} onChange={campo('telefono')} />
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-acciones">
        <button type="button" className="boton-fantasma" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton" disabled={guardarMutacion.isPending}>
          {guardarMutacion.isPending ? 'Guardando…' : atleta ? 'Guardar cambios' : 'Guardar atleta'}
        </button>
      </div>
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
