import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { esStaff } from '../tipos/api'
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

/** Solo el entrenador y el superadmin. El atleta vuelve a sus sesiones. */
export function RutaStaff({ children }: { children: ReactNode }) {
  const { sesion } = useAuth()

  if (!esStaff(sesion?.usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
