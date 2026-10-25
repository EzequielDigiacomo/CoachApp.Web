import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/cliente'
import { equiposApi } from '../api/equipos'
import type {
  AtletaEnEntrenamientoDto,
  EquipoDto,
  TipoBote,
} from '../tipos/api'
import { Modal } from './Modal'
import { NombreAtleta, textoAtleta } from './NombreAtleta'

const CUPOS: Record<TipoBote, number> = { K2: 2, K4: 4 }

interface Props {
  entrenamientoId: number
  atletas: AtletaEnEntrenamientoDto[]
  onCerrar: () => void
  onCargado: () => void
}

/** Carga un bote del catalogo o arma uno con los atletas de la sesion. */
export function ModalCargaEquipo({ entrenamientoId, atletas, onCerrar, onCargado }: Props) {
  const [modo, setModo] = useState<'catalogo' | 'nuevo'>('nuevo')
  const [catalogo, setCatalogo] = useState<EquipoDto[]>([])
  const [equipoId, setEquipoId] = useState<number | ''>('')
  const [tipo, setTipo] = useState<TipoBote>('K2')
  const [elegidos, setElegidos] = useState<number[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    void equiposApi
      .listar()
      .then((lista) => {
        setCatalogo(lista)
        if (lista.length > 0) {
          setModo('catalogo')
        }
      })
      .catch(() => setCatalogo([]))
      .finally(() => setCargando(false))
  }, [])

  const cupo = CUPOS[tipo]
  const disponiblesCatalogo = useMemo(() => {
    const enSesion = new Set(atletas.map((a) => a.atletaId))
    return catalogo.filter((e) => e.miembros.every((m) => enSesion.has(m.atletaId)))
  }, [catalogo, atletas])

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

  async function guardar() {
    setOcupado(true)
    setError(null)
    try {
      if (modo === 'catalogo') {
        if (equipoId === '') {
          setError('Elegí un bote del catálogo.')
          return
        }
        await equiposApi.cargarEnSesion(entrenamientoId, { equipoId })
      } else {
        if (elegidos.length !== cupo) {
          setError(`Un ${tipo} lleva ${cupo} atletas.`)
          return
        }
        await equiposApi.cargarEnSesion(entrenamientoId, { tipo, atletaIds: elegidos })
      }
      onCargado()
      onCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el equipo.')
    } finally {
      setOcupado(false)
    }
  }

  function alIntentarCerrar() {
    return window.confirm('¿Cancelar la carga de equipo? Se pierde lo que no guardaste.')
  }

  return (
    <Modal titulo="Carga equipo" alIntentarCerrar={alIntentarCerrar} onCerrar={onCerrar}>
      <div className="acciones-fila">
        <button
          type="button"
          className={modo === 'nuevo' ? 'boton' : 'boton-fantasma'}
          onClick={() => setModo('nuevo')}
        >
          Armar ahora
        </button>
        <button
          type="button"
          className={modo === 'catalogo' ? 'boton' : 'boton-fantasma'}
          onClick={() => setModo('catalogo')}
          disabled={disponiblesCatalogo.length === 0 && !cargando}
        >
          Del catálogo
        </button>
      </div>

      {modo === 'catalogo' ? (
        cargando ? (
          <p className="sutil">Cargando…</p>
        ) : disponiblesCatalogo.length === 0 ? (
          <p className="sutil">
            No hay botes del catálogo cuyos remeros estén todos en esta sesión.
          </p>
        ) : (
          <label>
            Bote
            <select
              value={equipoId}
              onChange={(e) => setEquipoId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Elegir…</option>
              {disponiblesCatalogo.map((equipo) => (
                <option key={equipo.id} value={equipo.id}>
                  {equipo.etiqueta}
                </option>
              ))}
            </select>
          </label>
        )
      ) : (
        <>
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
          <p className="sutil">
            {elegidos.length} de {cupo} elegidos entre los atletas de la sesión
          </p>
          <ul className="lista-disponibles">
            {atletas.map((atleta) => {
              const marcado = elegidos.includes(atleta.atletaId)
              return (
                <li key={atleta.atletaId}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={!marcado && elegidos.length >= cupo}
                      onChange={() => alternar(atleta.atletaId)}
                    />
                    <NombreAtleta
                      nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                      color={atleta.color}
                    />
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div className="acciones-fila">
        <button type="button" className="boton" disabled={ocupado} onClick={() => void guardar()}>
          Cargar
        </button>
        <button
          type="button"
          className="boton-fantasma"
          onClick={() => {
            if (alIntentarCerrar()) {
              onCerrar()
            }
          }}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
