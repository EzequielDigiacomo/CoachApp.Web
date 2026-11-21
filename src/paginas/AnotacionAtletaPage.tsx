import { Block, Button, Card, List, ListInput, Preloader } from 'konsta/react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/cliente'
import { useAuth } from '../auth/contextoAuth'
import { confirmar } from '../componentes/Confirmacion'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import { esStaff, type NotaAtletaDto } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

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
    if (!(await confirmar('¿Borrar esta anotación?', { peligro: true, aceptar: 'Borrar' }))) {
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
    <MarcoPagina
      titulo={staff ? 'Anotación atleta' : 'Anotación'}
      subtitulo={staff ? 'Lo que escribe cada atleta, de lo más nuevo a lo más viejo.' : undefined}
    >
      {!staff && (
        <form onSubmit={(evento) => void guardar(evento)}>
          <List strong inset>
            <ListInput
              label="Escribí tu anotación"
              type="textarea"
              value={texto}
              maxLength={MAXIMO}
              inputClassName="min-h-28"
              onChange={(e) => setTexto(e.target.value)}
              required
            />
          </List>
          <Block className="!mt-0 space-y-2">
            <p className="text-[13px] opacity-60 text-right">
              {texto.length}/{MAXIMO}
            </p>
            <div className="flex gap-2">
              <Button type="submit" rounded disabled={ocupado || texto.trim().length === 0}>
                {editando == null ? 'Guardar' : 'Actualizar'}
              </Button>
              {editando != null && (
                <Button
                  type="button"
                  rounded
                  clear
                  onClick={() => {
                    setEditando(null)
                    setTexto('')
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </Block>
        </form>
      )}

      {error && (
        <Block>
          <p className="text-red-500">{error}</p>
        </Block>
      )}

      {cargando ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : error ? null : notas.length === 0 ? (
        <Block>
          <p className="opacity-60">Todavía no hay anotaciones.</p>
        </Block>
      ) : (
        notas.map((nota) => (
          <Card
            key={nota.id}
            header={
              staff ? (
                <NombreAtleta
                  nombre={textoAtleta(nota.apellido, nota.nombre)}
                  color={nota.color}
                />
              ) : undefined
            }
            footer={cuando(nota.fechaCreacion)}
          >
            <p className="whitespace-pre-wrap break-words">{nota.texto}</p>
            {!staff && (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  inline
                  small
                  rounded
                  tonal
                  onClick={() => {
                    setEditando(nota.id)
                    setTexto(nota.texto)
                  }}
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
                  onClick={() => void borrar(nota.id)}
                >
                  Borrar
                </Button>
              </div>
            )}
          </Card>
        ))
      )}
    </MarcoPagina>
  )
}
