import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/cliente'
import { useAuth } from '../auth/contextoAuth'
import { esStaff, type NotaAtletaDto } from '../tipos/api'

const MAXIMO = 1000

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Lo que sintieron al remar. El atleta escribe, el entrenador lee. */
export function SensacionesPage() {
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
      setNotas(await api.get<NotaAtletaDto[]>('/api/sensaciones'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las sensaciones.')
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
        await api.post('/api/sensaciones', { texto: limpio })
      } else {
        await api.put(`/api/sensaciones/${editando}`, { texto: limpio })
      }
      setTexto('')
      setEditando(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la sensación.')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar(id: number) {
    if (!window.confirm('¿Borrar esta sensación?')) {
      return
    }
    setError(null)
    try {
      await api.delete(`/api/sensaciones/${id}`)
      if (editando === id) {
        setEditando(null)
        setTexto('')
      }
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo borrar la sensación.')
    }
  }

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>Sensaciones</h2>
      </div>
      <p className="sutil">Qué sintieron al remar. Máximo {MAXIMO} caracteres.</p>
      {!staff && (
        <form className="tarjeta formulario" onSubmit={(evento) => void guardar(evento)}>
          <label>
            Al remar sentí…
            <textarea
              value={texto}
              maxLength={MAXIMO}
              rows={5}
              onChange={(e) => setTexto(e.target.value.slice(0, MAXIMO))}
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
        <p className="sutil">Todavía no hay sensaciones.</p>
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
