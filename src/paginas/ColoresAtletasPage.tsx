import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/cliente'
import { atletasApi } from '../api/entrenamientos'
import { NombreAtleta, PALETA_ATLETAS, textoAtleta } from '../componentes/NombreAtleta'
import type { AtletaDto } from '../tipos/api'

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
    <div className="pagina">
      <div className="encabezado">
        <div>
          <h2>Colores de atletas</h2>
          <p className="sutil">
            Asigná un color a cada atleta para diferenciarlos en controles, sesiones y listas.
          </p>
        </div>
        <button type="button" className="boton" disabled={ocupado || !hayCambios} onClick={() => void guardar()}>
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <input
        className="busqueda"
        placeholder="Buscar atleta…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      {ok && <p className="exito">{ok}</p>}

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="sutil">No hay atletas para mostrar.</p>
      ) : (
        <ul className="colores-atletas-lista">
          {filtrados.map((atleta) => {
            const color = colores[atleta.id] ?? null
            return (
              <li className="tarjeta colores-atleta-fila" key={atleta.id}>
                <div className="colores-atleta-nombre">
                  <span className="color-punto" style={{ background: color ?? 'transparent' }} />
                  <NombreAtleta
                    nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                    color={color}
                  />
                  <span className="sutil">DNI {atleta.dni}</span>
                </div>

                <div className="colores-paleta" role="group" aria-label={`Color de ${atleta.apellido}`}>
                  {PALETA_ATLETAS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={`color-swatch${color?.toUpperCase() === hex ? ' elegido' : ''}`}
                      style={{ background: hex }}
                      title={hex}
                      aria-label={hex}
                      onClick={() => elegir(atleta.id, hex)}
                    />
                  ))}
                  <button
                    type="button"
                    className={`boton-fantasma color-quitar${color == null ? ' elegido' : ''}`}
                    onClick={() => elegir(atleta.id, null)}
                  >
                    Sin color
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
