import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './contextoAuth'

/** Deja pasar solo si hay sesion; si no, manda al login. */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const { sesion } = useAuth()
  const ubicacion = useLocation()

  if (!sesion) {
    return <Navigate to="/login" state={{ desde: ubicacion.pathname }} replace />
  }

  return <>{children}</>
}
