import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EVENTO_SESION_EXPIRADA, CLAVE_TOKEN, CLAVE_USUARIO } from '../api/cliente'
import { msHastaVencimiento, tokenVencido } from '../util/token'
import { ContextoAuthReact } from './contextoAuth'
import type { ContextoAuth, Sesion } from './contextoAuth'

function limpiarStorage() {
  localStorage.removeItem(CLAVE_TOKEN)
  localStorage.removeItem(CLAVE_USUARIO)
}

function leerSesionGuardada(): Sesion | null {
  const token = localStorage.getItem(CLAVE_TOKEN)
  const usuario = localStorage.getItem(CLAVE_USUARIO)

  if (!token || !usuario) {
    return null
  }

  // Token vencido: al abrir la web vamos directo al login, sin pegarle a la API.
  if (tokenVencido(token)) {
    limpiarStorage()
    return null
  }

  try {
    return { token, usuario: JSON.parse(usuario) }
  } catch {
    // El dato guardado quedo corrupto, se descarta.
    limpiarStorage()
    return null
  }
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesionGuardada)

  const cerrarSesion = useCallback(() => {
    limpiarStorage()
    setSesion(null)
  }, [])

  const iniciarSesion = useCallback((nueva: Sesion) => {
    localStorage.setItem(CLAVE_TOKEN, nueva.token)
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(nueva.usuario))
    setSesion(nueva)
  }, [])

  // Si la API responde 401 (o el cliente detecta JWT vencido), se cierra la sesion.
  useEffect(() => {
    window.addEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion)
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, cerrarSesion)
  }, [cerrarSesion])

  // Mientras la pestana esta abierta, cerramos sola al llegar el vencimiento.
  useEffect(() => {
    if (!sesion) {
      return
    }

    const restante = msHastaVencimiento(sesion.token)
    if (restante <= 0) {
      cerrarSesion()
      return
    }

    // setTimeout con delays enormes es impreciso; capamos a 24 h y rechequeamos.
    const espera = Math.min(restante, 24 * 60 * 60 * 1000)
    const id = window.setTimeout(() => {
      if (tokenVencido(sesion.token)) {
        cerrarSesion()
      }
    }, espera)

    return () => window.clearTimeout(id)
  }, [sesion, cerrarSesion])

  // Al volver a la pestana (despues de horas), si el token cayo vamos al login.
  useEffect(() => {
    function alVisibilidad() {
      if (document.visibilityState !== 'visible') {
        return
      }
      const token = localStorage.getItem(CLAVE_TOKEN)
      if (token && tokenVencido(token)) {
        cerrarSesion()
      }
    }

    document.addEventListener('visibilitychange', alVisibilidad)
    window.addEventListener('focus', alVisibilidad)
    return () => {
      document.removeEventListener('visibilitychange', alVisibilidad)
      window.removeEventListener('focus', alVisibilidad)
    }
  }, [cerrarSesion])

  const valor = useMemo<ContextoAuth>(
    () => ({ sesion, iniciarSesion, cerrarSesion }),
    [sesion, iniciarSesion, cerrarSesion],
  )

  return <ContextoAuthReact.Provider value={valor}>{children}</ContextoAuthReact.Provider>
}
