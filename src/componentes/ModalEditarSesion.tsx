import { useState } from 'react'
import { ApiError } from '../api/cliente'
import { entrenamientosApi } from '../api/entrenamientos'
import type { CrearEntrenamientoRequest, EntrenamientoDto, Turno } from '../tipos/api'
import { Modal } from './Modal'

const SESIONES = [1, 2, 3, 4, 5]

interface Props {
  entrenamiento: EntrenamientoDto
  onCerrar: () => void
  onGuardado: (actualizado: EntrenamientoDto) => void
}

/** Corrige fecha, turno, sesión, club o descripción sin borrar la sesión. */
export function ModalEditarSesion({ entrenamiento, onCerrar, onGuardado }: Props) {
  const [datos, setDatos] = useState<CrearEntrenamientoRequest>({
    fecha: entrenamiento.fecha,
    turno: entrenamiento.turno,
    sesion: entrenamiento.sesion,
    descripcion: entrenamiento.descripcion ?? '',
    club: entrenamiento.club ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const descripcionLarga = (datos.descripcion?.length ?? 0) > 500

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (descripcionLarga) {
      return
    }

    setError(null)
    setGuardando(true)
    try {
      onGuardado(await entrenamientosApi.actualizar(entrenamiento.id, datos))
      onCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la sesión.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Editar sesión" onCerrar={onCerrar}>
      <form className="formulario" onSubmit={(evento) => void guardar(evento)}>
        <div className="grilla">
          <label>
            Fecha
            <input
              type="date"
              value={datos.fecha}
              onChange={(e) => setDatos((d) => ({ ...d, fecha: e.target.value }))}
              required
            />
          </label>

          <label>
            Turno
            <select
              value={datos.turno}
              onChange={(e) => setDatos((d) => ({ ...d, turno: e.target.value as Turno }))}
            >
              <option value="Manana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
          </label>

          <label>
            Sesión
            <select
              value={datos.sesion}
              onChange={(e) => setDatos((d) => ({ ...d, sesion: Number(e.target.value) }))}
            >
              {SESIONES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label>
            Club
            <input
              value={datos.club ?? ''}
              onChange={(e) => setDatos((d) => ({ ...d, club: e.target.value }))}
            />
          </label>
        </div>

        <label>
          Descripción
          <input
            value={datos.descripcion ?? ''}
            onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
            placeholder="Trabajo de velocidad, fondo, técnica…"
          />
        </label>

        {descripcionLarga && (
          <p className="error">
            La descripción tiene {datos.descripcion?.length ?? 0} caracteres y el límite es 500.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <div className="acciones-fila">
          <button type="submit" className="boton" disabled={guardando || descripcionLarga}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="boton-fantasma" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
