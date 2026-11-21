import { Block, Button, List, ListInput, ListItem, Preloader } from 'konsta/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/cliente'
import { atletasApi } from '../api/entrenamientos'
import { NombreAtleta, PALETA_ATLETAS, textoAtleta } from '../componentes/NombreAtleta'
import type { AtletaDto } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

/**
 * Modulo staff: asigna un color de identificacion a cada atleta.
 * Al guardar, el color se usa en nombres en toda la app.
 */
export function ColoresAtletasPage() {
  const [atletas, setAtletas] = useState<AtletaDto[]>([])
  /** Colores en edicion: atletaId -> #RRGGBB | null */
  const [colores, setColores] = useState<Record<number, string | null>>({})
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      const lista = await atletasApi.listar()
      setAtletas(lista)
      const mapa: Record<number, string | null> = {}
      for (const a of lista) {
        mapa[a.id] = a.color ?? null
      }
      setColores(mapa)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los atletas.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const base = atletas.filter((a) => a.activo)
    if (!texto) {
      return base
    }
    return base.filter(
      (a) =>
        a.apellido.toLowerCase().includes(texto) ||
        a.nombre.toLowerCase().includes(texto) ||
        a.dni.includes(texto),
    )
  }, [atletas, busqueda])

  const hayCambios = useMemo(() => {
    return atletas.some((a) => (a.color ?? null) !== (colores[a.id] ?? null))
  }, [atletas, colores])

  function elegir(atletaId: number, color: string | null) {
    setColores((prev) => ({ ...prev, [atletaId]: color }))
    setOk(null)
  }

  async function guardar() {
    setOcupado(true)
    setError(null)
    setOk(null)

    try {
      const payload = atletas.map((a) => ({
        atletaId: a.id,
        color: colores[a.id] ?? null,
      }))

      const actualizados = await atletasApi.guardarColores(payload)
      setAtletas((prev) =>
        prev.map((a) => actualizados.find((u) => u.id === a.id) ?? a),
      )
      const mapa: Record<number, string | null> = { ...colores }
      for (const a of actualizados) {
        mapa[a.id] = a.color ?? null
      }
      setColores(mapa)
      setOk('Colores guardados. Ya se ven en el resto de la app.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron guardar los colores.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <MarcoPagina
      titulo="Colores de atletas"
      subtitulo="Asigná un color a cada atleta para diferenciarlos en controles, sesiones y listas."
      atras
      right={
        <Button
          inline
          small
          rounded
          disabled={ocupado || !hayCambios}
          onClick={() => void guardar()}
        >
          {ocupado ? 'Guardando…' : 'Guardar'}
        </Button>
      }
    >
      <List strong inset>
        <ListInput
          label="Buscar"
          type="text"
          placeholder="Buscar atleta…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </List>

      {error && (
        <Block>
          <p className="text-red-500">{error}</p>
        </Block>
      )}
      {ok && (
        <Block>
          <p className="text-green-600">{ok}</p>
        </Block>
      )}

      {cargando ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : filtrados.length === 0 ? (
        <Block>
          <p className="opacity-60">No hay atletas para mostrar.</p>
        </Block>
      ) : (
        <List strong inset>
          {filtrados.map((atleta) => {
            const color = colores[atleta.id] ?? null
            return (
              <ListItem
                key={atleta.id}
                media={
                  <span
                    className="block h-4 w-4 rounded-full border border-black/20"
                    style={{ background: color ?? 'transparent' }}
                  />
                }
                title={
                  <NombreAtleta
                    nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                    color={color}
                  />
                }
                subtitle={`DNI ${atleta.dni}`}
                footer={
                  <div
                    className="mt-2 flex flex-wrap items-center gap-2"
                    role="group"
                    aria-label={`Color de ${atleta.apellido}`}
                  >
                    {PALETA_ATLETAS.map((hex) => {
                      const elegido = color?.toUpperCase() === hex
                      return (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          aria-label={hex}
                          aria-pressed={elegido}
                          className={`h-7 w-7 rounded-full border-2 ${
                            elegido ? 'scale-110 border-black dark:border-white' : 'border-transparent'
                          }`}
                          style={{ background: hex }}
                          onClick={() => elegir(atleta.id, hex)}
                        />
                      )
                    })}
                    <Button
                      type="button"
                      inline
                      small
                      rounded
                      tonal={color == null}
                      outline={color != null}
                      onClick={() => elegir(atleta.id, null)}
                    >
                      Sin color
                    </Button>
                  </div>
                }
              />
            )
          })}
        </List>
      )}
    </MarcoPagina>
  )
}
