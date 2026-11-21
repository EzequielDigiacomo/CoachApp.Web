import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { useAuth } from '../auth/contextoAuth'
import { confirmar } from '../componentes/Confirmacion'
import { esStaff, type AvisoDto } from '../tipos/api'

const MAX_TITULO = 120
const MAX_TEXTO = 1000
const MAX_LINK = 500

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Avisos del cuerpo técnico. Staff administra; el atleta solo lee. */
export function AvisosPage() {
  const consultas = useQueryClient()
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [link, setLink] = useState('')
  const [activo, setActivo] = useState(true)
  const [editando, setEditando] = useState<number | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const listado = useQuery({
    queryKey: clavesConsulta.avisos,
    queryFn: ({ signal }) => api.get<AvisoDto[]>('/api/avisos', { signal }),
  })

  const avisos = listado.data ?? []
  const errorLista = listado.isError
    ? mensajeApi(listado.error, 'No se pudieron cargar los avisos.')
    : null

  function limpiarFormulario() {
    setTitulo('')
    setTexto('')
    setLink('')
    setActivo(true)
    setEditando(null)
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        titulo: titulo.trim(),
        texto: texto.trim(),
        link: link.trim() || null,
        activo,
      }
      if (editando == null) {
        await api.post('/api/avisos', cuerpo)
      } else {
        await api.put(`/api/avisos/${editando}`, cuerpo)
      }
    },
    onSuccess: async () => {
      limpiarFormulario()
      setErrorAccion(null)
      await consultas.invalidateQueries({ queryKey: clavesConsulta.avisos })
    },
    onError: (e) => setErrorAccion(mensajeApi(e, 'No se pudo guardar el aviso.')),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => api.delete(`/api/avisos/${id}`),
    onSuccess: async (_data, id) => {
      if (editando === id) {
        limpiarFormulario()
      }
      setErrorAccion(null)
      await consultas.invalidateQueries({ queryKey: clavesConsulta.avisos })
    },
    onError: (e) => setErrorAccion(mensajeApi(e, 'No se pudo borrar el aviso.')),
  })

  function pedirGuardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!staff || !titulo.trim() || !texto.trim()) {
      return
    }
    setErrorAccion(null)
    guardar.mutate()
  }

  async function pedirBorrar(id: number) {
    if (!(await confirmar('¿Borrar este aviso?', { peligro: true, aceptar: 'Borrar' }))) {
      return
    }
    setErrorAccion(null)
    borrar.mutate(id)
  }

  function empezarEdicion(aviso: AvisoDto) {
    setEditando(aviso.id)
    setTitulo(aviso.titulo)
    setTexto(aviso.texto)
    setLink(aviso.link ?? '')
    setActivo(aviso.activo)
  }

  const ultimoActivo = avisos.find((aviso) => aviso.activo) ?? null
  const error = errorLista ?? errorAccion
  const ocupado = guardar.isPending || borrar.isPending

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>Avisos</h2>
      </div>
      <p className="sutil">
        {staff
          ? 'Mensajes y links que ven los atletas al entrar. Máximo 1000 caracteres.'
          : 'Novedades del cuerpo técnico.'}
      </p>

      {staff && !listado.isPending && !errorLista && (
        <div className={`tarjeta aviso-estado ${ultimoActivo ? 'aviso-estado-activo' : ''}`}>
          {ultimoActivo ? (
            <p>
              <span className="etiqueta presente">Activo</span>{' '}
              El último aviso visible es <strong>«{ultimoActivo.titulo}»</strong>. Los atletas lo
              ven al entrar al home.
            </p>
          ) : (
            <p className="sutil">No hay ningún aviso activo. Los atletas no ven nada en el home.</p>
          )}
        </div>
      )}

      {staff && (
        <form className="tarjeta formulario" onSubmit={pedirGuardar}>
          <label>
            Título
            <input
              value={titulo}
              maxLength={MAX_TITULO}
              onChange={(e) => setTitulo(e.target.value.slice(0, MAX_TITULO))}
              required
            />
          </label>
          <label>
            Mensaje
            <textarea
              value={texto}
              maxLength={MAX_TEXTO}
              rows={4}
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO))}
              required
            />
          </label>
          <label>
            Link (opcional)
            <input
              value={link}
              maxLength={MAX_LINK}
              placeholder="https://…"
              onChange={(e) => setLink(e.target.value.slice(0, MAX_LINK))}
            />
          </label>
          <label className="check">
            <span className="check-texto">Visible para atletas</span>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          </label>
          <div className="acciones-fila">
            <button
              type="submit"
              className="boton"
              disabled={ocupado || titulo.trim().length === 0 || texto.trim().length === 0}
            >
              {editando == null ? 'Publicar' : 'Actualizar'}
            </button>
            {editando != null && (
              <button type="button" className="boton-fantasma" onClick={limpiarFormulario}>
                Cancelar
              </button>
            )}
            <span className="sutil">
              {texto.length}/{MAX_TEXTO}
            </span>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {listado.isPending ? (
        <p className="sutil">Cargando…</p>
      ) : errorLista ? null : avisos.length === 0 ? (
        <p className="sutil">Todavía no hay avisos.</p>
      ) : (
        avisos.map((aviso) => (
          <article
            key={aviso.id}
            className={['tarjeta', staff && aviso.id === ultimoActivo?.id ? 'aviso-destacado' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <div className="encabezado" style={{ marginBottom: 6 }}>
              <h3 className="titulo-seccion">{aviso.titulo}</h3>
              {staff && aviso.id === ultimoActivo?.id && (
                <span className="etiqueta presente">Activo en el home</span>
              )}
              {staff && aviso.activo && aviso.id !== ultimoActivo?.id && (
                <span className="etiqueta presente">Activo</span>
              )}
              {staff && !aviso.activo && <span className="etiqueta">Oculto</span>}
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{aviso.texto}</p>
            {aviso.link && (
              <p>
                <a className="enlace-texto" href={aviso.link} target="_blank" rel="noreferrer">
                  Abrir link
                </a>
              </p>
            )}
            <p className="sutil">{cuando(aviso.fechaCreacion)}</p>
            {staff && (
              <div className="acciones-fila">
                <button type="button" className="boton-fantasma" onClick={() => empezarEdicion(aviso)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="boton-fantasma peligro"
                  onClick={() => void pedirBorrar(aviso.id)}
                >
                  Borrar
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  )
}
