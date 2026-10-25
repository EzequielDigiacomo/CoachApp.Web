import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/cliente'
import { useAuth } from '../auth/contextoAuth'
import { BotonTema } from '../componentes/BotonTema'
import type { LoginResponse } from '../tipos/api'

export function LoginPage() {
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()

  const [nombreUsuario, setNombreUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      const respuesta = await api.post<LoginResponse>('/api/auth/login', {
        nombreUsuario,
        password,
      })

      iniciarSesion({ token: respuesta.token, usuario: respuesta.usuario })
      // Siempre al dashboard al ingresar, sin volver a la URL previa.
      navegar('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo conectar con el servidor.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <form className="tarjeta login-tarjeta" onSubmit={enviar}>
        <div className="login-cabecera">
          <h1>CoachApp</h1>
          <BotonTema />
        </div>
        <p className="sutil">Entrá con la cuenta que te dio el administrador.</p>

        <label>
          Usuario
          <input
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
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

        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
