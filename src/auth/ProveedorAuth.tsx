import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EVENTO_SESION_EXPIRADA, CLAVE_TOKEN, CLAVE_USUARIO } from '../api/cliente'
import { ContextoAuthReact } from './contextoAuth'
import type { ContextoAuth, Sesion } from './contextoAuth'

function leerSesionGuardada(): Sesion | null {
  const token = localStorage.getItem(CLAVE_TOKEN)
  const usuario = localStorage.getItem(CLAVE_USUARIO)

  if (!token || !usuario) {
    return null
  }

  try {
    return { token, usuario: JSON.parse(usuario) }
  } catch {
    // El dato guardado quedo corrupto, se descarta.
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_USUARIO)
    return null
  }
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesionGuardada)

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_USUARIO)
    setSesion(null)
  }, [])

  const iniciarSesion = useCallback((nueva: Sesion) => {
    localStorage.setItem(CLAVE_TOKEN, nueva.token)
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(nueva.usuario))
    setSesion(nueva)
  }, [])

  // Si la API responde 401 en cualquier parte de la app, se cierra la sesion.
  useEffect(() => {
    window.addEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion)
  }, [cerrarSesion])

  const valor = useMemo<ContextoAuth>(
    () => ({ sesion, iniciarSesion, cerrarSesion }),
    [sesion, iniciarSesion, cerrarSesion],
  )

  return <ContextoAuthReact.Provider value={valor}>{children}</ContextoAuthReact.Provider>
}
