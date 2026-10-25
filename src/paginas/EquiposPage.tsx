import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/cliente'
import { atletasApi } from '../api/entrenamientos'
import { equiposApi } from '../api/equipos'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import type { AtletaDto, EquipoDto, TipoBote } from '../tipos/api'

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
    <div className="pagina">
      <div className="encabezado">
        <h2>K2 / K4</h2>
      </div>
      <p className="sutil">Armá botes de equipo para reutilizarlos en las sesiones.</p>

      <div className="tarjeta formulario">
        <div className="grilla">
          <label>
            Tipo
            <select
              value={tipo}
              onChange={(e) => {
                const nuevo = e.target.value as TipoBote
                setTipo(nuevo)
                setElegidos((previos) => previos.slice(0, CUPOS[nuevo]))
              }}
            >
              <option value="K2">K2</option>
              <option value="K4">K4</option>
            </select>
          </label>
          <label>
            Buscar atleta
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Apellido, nombre o DNI"
            />
          </label>
        </div>

        <p className="sutil">
          {elegidos.length} de {cupo} elegidos
          {editando != null && ' · editando bote'}
        </p>

        <ul className="lista-disponibles">
          {disponibles.map((atleta) => {
            const marcado = elegidos.includes(atleta.id)
            return (
              <li key={atleta.id}>
                <label className="check">
                  <span className="check-texto">
                    <NombreAtleta
                      nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                      color={atleta.color}
                    />
                    <span className="sutil"> · {atleta.dni}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={!marcado && elegidos.length >= cupo}
                    onChange={() => alternar(atleta.id)}
                  />
                </label>
              </li>
            )
          })}
        </ul>

        {error && <p className="error">{error}</p>}

        <div className="acciones-fila">
          <button
            type="button"
            className="boton"
            disabled={ocupado || elegidos.length !== cupo}
            onClick={() => void guardar()}
          >
            {editando == null ? 'Crear bote' : 'Guardar bote'}
          </button>
          {editando != null && (
            <button type="button" className="boton-fantasma" onClick={empezarNuevo}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : equipos.length === 0 ? (
        <p className="sutil">Todavía no hay botes armados.</p>
      ) : (
        <div className="tarjeta sin-relleno">
          <table className="tabla">
            <thead>
              <tr>
                <th>Bote</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {equipos.map((equipo) => (
                <tr key={equipo.id}>
                  <td>
                    <strong>{equipo.etiqueta}</strong>
                    <span className="sutil bloque">
                      {equipo.miembros.map((m, i) => (
                        <span key={m.atletaId}>
                          {i > 0 && ' · '}
                          <NombreAtleta
                            nombre={textoAtleta(m.apellido, m.nombre)}
                            color={m.color}
                          />
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>{equipo.activo ? 'Activo' : 'Pausado'}</td>
                  <td className="derecha">
                    <div className="acciones-fila">
                      <button
                        type="button"
                        className="boton-fantasma"
                        onClick={() => empezarEdicion(equipo)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="boton-fantasma"
                        onClick={() => void pausar(equipo)}
                      >
                        {equipo.activo ? 'Pausar' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
