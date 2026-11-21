import { Badge, Block, BlockTitle, Button, Checkbox, List, ListInput, ListItem, Preloader } from 'konsta/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/cliente'
import { atletasApi } from '../api/entrenamientos'
import { equiposApi } from '../api/equipos'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import type { AtletaDto, EquipoDto, TipoBote } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

const CUPOS: Record<TipoBote, number> = { K2: 2, K4: 4 }

export function EquiposPage() {
  const [equipos, setEquipos] = useState<EquipoDto[]>([])
  const [atletas, setAtletas] = useState<AtletaDto[]>([])
  const [tipo, setTipo] = useState<TipoBote>('K2')
  const [elegidos, setElegidos] = useState<number[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [lista, catalogo] = await Promise.all([
        equiposApi.listar(true),
        atletasApi.listar(),
      ])
      setEquipos(lista)
      setAtletas(catalogo)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los botes.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cupo = CUPOS[tipo]
  const disponibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return atletas
      .filter((a) => a.activo !== false)
      .filter(
        (a) =>
          !texto ||
          a.apellido.toLowerCase().includes(texto) ||
          a.nombre.toLowerCase().includes(texto) ||
          a.dni.includes(texto),
      )
  }, [atletas, busqueda])

  function alternar(atletaId: number) {
    setElegidos((previos) => {
      if (previos.includes(atletaId)) {
        return previos.filter((id) => id !== atletaId)
      }
      if (previos.length >= cupo) {
        return previos
      }
      return [...previos, atletaId]
    })
  }

  function empezarNuevo() {
    setEditando(null)
    setTipo('K2')
    setElegidos([])
    setError(null)
  }

  function empezarEdicion(equipo: EquipoDto) {
    setEditando(equipo.id)
    setTipo(equipo.tipo)
    setElegidos(equipo.miembros.map((m) => m.atletaId))
    setError(null)
  }

  async function guardar() {
    if (elegidos.length !== cupo) {
      setError(`Un ${tipo} lleva ${cupo} atletas.`)
      return
    }

    setOcupado(true)
    setError(null)
    try {
      if (editando == null) {
        await equiposApi.crear(tipo, elegidos)
      } else {
        await equiposApi.actualizar(editando, tipo, elegidos)
      }
      empezarNuevo()
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el bote.')
    } finally {
      setOcupado(false)
    }
  }

  async function pausar(equipo: EquipoDto) {
    setError(null)
    try {
      await equiposApi.cambiarEstado(equipo.id, !equipo.activo)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.')
    }
  }

  return (
    <MarcoPagina titulo="K2 / K4" subtitulo="Armá botes de equipo para reutilizarlos en las sesiones.">
      <List strong inset>
        <ListInput
          label="Tipo"
          type="select"
          dropdown
          value={tipo}
          onChange={(e) => {
            const nuevo = e.target.value as TipoBote
            setTipo(nuevo)
            setElegidos((previos) => previos.slice(0, CUPOS[nuevo]))
          }}
        >
          <option value="K2">K2</option>
          <option value="K4">K4</option>
        </ListInput>
        <ListInput
          label="Buscar atleta"
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Apellido, nombre o DNI"
        />
      </List>

      <BlockTitle>
        {elegidos.length} de {cupo} elegidos
        {editando != null && ' · editando bote'}
      </BlockTitle>

      <List strong inset>
        {disponibles.map((atleta) => {
          const marcado = elegidos.includes(atleta.id)
          return (
            <ListItem
              key={atleta.id}
              label
              title={
                <NombreAtleta
                  nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                  color={atleta.color}
                />
              }
              after={<span className="opacity-60 text-[13px]">{atleta.dni}</span>}
              media={
                <Checkbox
                  component="div"
                  checked={marcado}
                  disabled={!marcado && elegidos.length >= cupo}
                  onChange={() => alternar(atleta.id)}
                />
              }
            />
          )
        })}
      </List>

      {error && (
        <Block>
          <p className="text-red-500">{error}</p>
        </Block>
      )}

      <Block className="flex gap-2">
        <Button
          type="button"
          rounded
          disabled={ocupado || elegidos.length !== cupo}
          onClick={() => void guardar()}
        >
          {editando == null ? 'Crear bote' : 'Guardar bote'}
        </Button>
        {editando != null && (
          <Button type="button" rounded clear onClick={empezarNuevo}>
            Cancelar
          </Button>
        )}
      </Block>

      <BlockTitle>Botes armados</BlockTitle>
      {cargando ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : equipos.length === 0 ? (
        <Block>
          <p className="opacity-60">Todavía no hay botes armados.</p>
        </Block>
      ) : (
        <List strong inset>
          {equipos.map((equipo) => (
            <ListItem
              key={equipo.id}
              title={<strong>{equipo.etiqueta}</strong>}
              subtitle={equipo.miembros.map((m, i) => (
                <span key={m.atletaId}>
                  {i > 0 && ' · '}
                  <NombreAtleta nombre={textoAtleta(m.apellido, m.nombre)} color={m.color} />
                </span>
              ))}
              after={
                <Badge colors={{ bg: equipo.activo ? 'bg-green-500' : 'bg-gray-400' }}>
                  {equipo.activo ? 'Activo' : 'Pausado'}
                </Badge>
              }
              footer={
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    inline
                    small
                    rounded
                    tonal
                    onClick={() => empezarEdicion(equipo)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    inline
                    small
                    rounded
                    tonal
                    onClick={() => void pausar(equipo)}
                  >
                    {equipo.activo ? 'Pausar' : 'Reactivar'}
                  </Button>
                </div>
              }
            />
          ))}
        </List>
      )}
    </MarcoPagina>
  )
}
