import { useState } from 'react'
import { garminApi } from '../api/garmin'
import { ApiError } from '../api/cliente'
import type { EstadoGarminDto } from '../tipos/api'
import { Modal } from './Modal'

interface Props {
  onCerrar: () => void
  onVinculada: (estado: EstadoGarminDto) => void
}

/** Pide el usuario de Garmin del entrenador. La contrasena no queda guardada. */
export function ModalVincularGarmin({ onCerrar, onVinculada }: Props) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function vincular(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      onVinculada(await garminApi.vincular(usuario.trim(), password))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo vincular Garmin.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Vincular Garmin" subtitulo="Se guarda la sesión, no la contraseña." onCerrar={onCerrar}>
      <form className="formulario" onSubmit={(evento) => void vincular(evento)}>
        <p className="sutil">
          Alcanza con que el nombre del atleta sea el del amigo en Garmin. El apellido no hace falta
          si Garmin no lo muestra. Las mayúsculas y las tildes no importan.
        </p>

        <label>
          Usuario de Garmin
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-acciones">
          <button type="button" className="boton-fantasma" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? 'Vinculando…' : 'Vincular'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
