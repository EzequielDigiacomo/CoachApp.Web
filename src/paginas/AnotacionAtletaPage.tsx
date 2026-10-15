import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/cliente'
import { useAuth } from '../auth/contextoAuth'
import { esStaff, type NotaAtletaDto } from '../tipos/api'

const MAXIMO = 4000

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

/** El atleta escribe. El entrenador lee lo que escribieron. */
export function AnotacionAtletaPage() {
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const [notas, setNotas] = useState<NotaAtletaDto[]>([])
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setNotas(await api.get<NotaAtletaDto[]>('/api/anotaciones-atleta'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las anotaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    const limpio = texto.trim()
    if (!limpio) {
      return
    }

    setOcupado(true)
    setError(null)
    try {
      if (editando == null) {
        await api.post('/api/anotaciones-atleta', { texto: limpio })
      } else {
        await api.put(`/api/anotaciones-atleta/${editando}`, { texto: limpio })
      }
      setTexto('')
      setEditando(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la anotación.')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar(id: number) {
    if (!window.confirm('¿Borrar esta anotación?')) {
      return
    }
    setError(null)
    try {
      await api.delete(`/api/anotaciones-atleta/${id}`)
      if (editando === id) {
        setEditando(null)
        setTexto('')
      }
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo borrar la anotación.')
    }
  }

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>{staff ? 'Anotación atleta' : 'Anotación'}</h2>
      </div>
      {staff ? (
        <p className="sutil">Lo que escribe cada atleta, de lo más nuevo a lo más viejo.</p>
      ) : (
        <form className="tarjeta formulario" onSubmit={(evento) => void guardar(evento)}>
          <label>
            Escribí tu anotación
            <textarea
              value={texto}
              maxLength={MAXIMO}
              rows={5}
              onChange={(e) => setTexto(e.target.value)}
              required
            />
          </label>
          <div className="acciones-fila">
            <button type="submit" className="boton" disabled={ocupado || texto.trim().length === 0}>
              {editando == null ? 'Guardar' : 'Actualizar'}
            </button>
            {editando != null && (
              <button
                type="button"
                className="boton-fantasma"
                onClick={() => {
                  setEditando(null)
                  setTexto('')
                }}
              >
                Cancelar
              </button>
            )}
            <span className="sutil">
              {texto.length}/{MAXIMO}
            </span>
          </div>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : error ? null : notas.length === 0 ? (
        <p className="sutil">Todavía no hay anotaciones.</p>
      ) : (
        notas.map((nota) => (
          <article key={nota.id} className="tarjeta">
            {staff && (
              <p>
                <strong>
                  {nota.apellido}, {nota.nombre}
                </strong>
              </p>
            )}
            <p style={{ whiteSpace: 'pre-wrap' }}>{nota.texto}</p>
            <p className="sutil">{cuando(nota.fechaCreacion)}</p>
            {!staff && (
              <div className="acciones-fila">
                <button
                  type="button"
                  className="boton-fantasma"
                  onClick={() => {
                    setEditando(nota.id)
                    setTexto(nota.texto)
                  }}
                >
                  Editar
                </button>
                <button type="button" className="boton-fantasma peligro" onClick={() => void borrar(nota.id)}>
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
