import { createContext, useContext } from 'react'
import type { UsuarioDto } from '../tipos/api'

export interface Sesion {
  token: string
  usuario: UsuarioDto
}

export interface ContextoAuth {
  sesion: Sesion | null
  iniciarSesion: (sesion: Sesion) => void
  cerrarSesion: () => void
}

export const ContextoAuthReact = createContext<ContextoAuth | null>(null)

export function useAuth(): ContextoAuth {
  const contexto = useContext(ContextoAuthReact)

  if (!contexto) {
    throw new Error('useAuth se tiene que usar dentro de ProveedorAuth.')
  }

  return contexto
}
