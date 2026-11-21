import { Block, BlockFooter, Button, List, ListInput, Navbar, Page } from 'konsta/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, mensajeApi } from '../api/cliente'
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
      navegar('/', { replace: true })
    } catch (e) {
      setError(mensajeApi(e, 'No se pudo conectar con el servidor.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Page>
      <Navbar
        title="CoachApp"
        right={
          <div className="pr-2">
            <BotonTema />
          </div>
        }
      />

      <div className="login-konsta mx-auto w-full max-w-[340px] px-4 pt-8">
        <Block strong inset className="!mx-0 !mt-0 text-center">
          <img
            className="mx-auto mb-3"
            src="/favicon.svg"
            width={48}
            height={48}
            alt=""
            aria-hidden="true"
          />
          <div className="text-[20px] font-semibold tracking-tight text-black dark:text-white">
            Bienvenido
          </div>
          <p className="mt-1 text-[13px] text-black/60 dark:text-white/60">
            Entrá con la cuenta que te dio el administrador.
          </p>
        </Block>

        <form onSubmit={(e) => void enviar(e)}>
          <List strong inset className="!mx-0">
            <ListInput
              label="Usuario"
              type="text"
              placeholder="usuario"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario((e.target as HTMLInputElement).value)}
              autoComplete="username"
              autoFocus
            />
            <ListInput
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
            />
          </List>

          {error && (
            <Block className="!mx-0 !py-0">
              <p className="text-center text-[13px] text-red-500">{error}</p>
            </Block>
          )}

          <Block className="!mx-0">
            <Button large rounded type="submit" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </Block>
        </form>

        <BlockFooter className="!mx-0 text-center">CoachApp</BlockFooter>
      </div>
    </Page>
  )
}
