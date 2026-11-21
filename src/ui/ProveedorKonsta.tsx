import { App as KonstaApp } from 'konsta/react'
import { useEffect, useState, type ReactNode } from 'react'

/** Tema iOS de Konsta; dark sigue el `data-tema` / clase `.dark` del documento. */
export function ProveedorKonsta({ children }: { children: ReactNode }) {
  const [oscuro, setOscuro] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.dataset.tema === 'oscuro',
  )

  useEffect(() => {
    const sync = () => {
      const next = document.documentElement.dataset.tema === 'oscuro'
      setOscuro(next)
      document.documentElement.classList.toggle('dark', next)
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-tema'],
    })
    return () => obs.disconnect()
  }, [])

  return (
    <KonstaApp
      theme="ios"
      dark={oscuro}
      safeAreas
      className={oscuro ? 'dark' : undefined}
    >
      {children}
    </KonstaApp>
  )
}
