import { useCallback, useEffect, useState } from 'react'
import { alternarTema, aplicarTema, temaInicial, type Tema } from '../util/tema'

/** Tema claro/oscuro con persistencia en localStorage. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(() => temaInicial())

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  const alternar = useCallback(() => {
    setTema((actual) => alternarTema(actual))
  }, [])

  return { tema, alternar, esOscuro: tema === 'oscuro' }
}
