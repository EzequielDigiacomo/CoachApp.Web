import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Block, Button, Card, List, ListInput, ListItem, Preloader, Toggle } from 'konsta/react'
import { useState } from 'react'
import { api, mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { useAuth } from '../auth/contextoAuth'
import { confirmar } from '../componentes/Confirmacion'
import { esStaff, type AvisoDto } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

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
    <MarcoPagina
      titulo="Avisos"
      subtitulo={
        staff
          ? 'Mensajes y links que ven los atletas al entrar. Máximo 1000 caracteres.'
          : 'Novedades del cuerpo técnico.'
      }
    >
      {staff && !listado.isPending && !errorLista && (
        <Block strong inset>
          {ultimoActivo ? (
            <p>
              <Badge colors={{ bg: 'bg-green-500' }}>Activo</Badge>{' '}
              El último aviso visible es <strong>«{ultimoActivo.titulo}»</strong>. Los atletas lo
              ven al entrar al home.
            </p>
          ) : (
            <p className="opacity-60">
              No hay ningún aviso activo. Los atletas no ven nada en el home.
            </p>
          )}
        </Block>
      )}

      {staff && (
        <form onSubmit={pedirGuardar}>
          <List strong inset>
            <ListInput
              label="Título"
              type="text"
              value={titulo}
              maxLength={MAX_TITULO}
              onChange={(e) => setTitulo(e.target.value.slice(0, MAX_TITULO))}
              required
            />
            <ListInput
              label="Mensaje"
              type="textarea"
              value={texto}
              maxLength={MAX_TEXTO}
              inputClassName="min-h-24"
              onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO))}
              required
            />
            <ListInput
              label="Link (opcional)"
              type="url"
              value={link}
              maxLength={MAX_LINK}
              placeholder="https://…"
              onChange={(e) => setLink(e.target.value.slice(0, MAX_LINK))}
            />
            <ListItem
              title="Visible para atletas"
              after={<Toggle checked={activo} onChange={(e) => setActivo(e.target.checked)} />}
            />
          </List>
          <Block className="!mt-0 space-y-2">
            <p className="text-[13px] opacity-60 text-right">
              {texto.length}/{MAX_TEXTO}
            </p>
            <div className="flex gap-2">
              <Button
                type="submit"
                rounded
                disabled={ocupado || titulo.trim().length === 0 || texto.trim().length === 0}
              >
                {editando == null ? 'Publicar' : 'Actualizar'}
              </Button>
              {editando != null && (
                <Button type="button" rounded clear onClick={limpiarFormulario}>
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

      {listado.isPending ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : errorLista ? null : avisos.length === 0 ? (
        <Block>
          <p className="opacity-60">Todavía no hay avisos.</p>
        </Block>
      ) : (
        avisos.map((aviso) => (
          <Card
            key={aviso.id}
            header={
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{aviso.titulo}</span>
                <span className="flex gap-1">
                  {staff && aviso.id === ultimoActivo?.id && (
                    <Badge colors={{ bg: 'bg-green-500' }}>Activo en el home</Badge>
                  )}
                  {staff && aviso.activo && aviso.id !== ultimoActivo?.id && (
                    <Badge colors={{ bg: 'bg-green-500' }}>Activo</Badge>
                  )}
                  {staff && !aviso.activo && <Badge colors={{ bg: 'bg-gray-400' }}>Oculto</Badge>}
                </span>
              </div>
            }
            footer={cuando(aviso.fechaCreacion)}
          >
            <p className="whitespace-pre-wrap">{aviso.texto}</p>
            {aviso.link && (
              <p className="mt-2">
                <a className="text-primary" href={aviso.link} target="_blank" rel="noreferrer">
                  Abrir link
                </a>
              </p>
            )}
            {staff && (
              <div className="mt-3 flex gap-2">
                <Button type="button" inline small rounded tonal onClick={() => empezarEdicion(aviso)}>
                  Editar
                </Button>
                <Button
                  type="button"
                  inline
                  small
                  rounded
                  outline
                  colors={{ outlineBorderIos: 'border-red-500', textIos: 'text-red-500' }}
                  onClick={() => void pedirBorrar(aviso.id)}
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
