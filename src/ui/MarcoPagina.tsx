import { Block, BlockTitle, Link } from 'konsta/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  titulo: string
  subtitulo?: string
  /** Si true, flecha atrás (historial). Si string, navega a esa ruta. */
  atras?: boolean | string
  right?: ReactNode
  children: ReactNode
}

/**
 * Cabecera de sección dentro del Layout (que ya trae Navbar).
 * No anida otro Page de Konsta.
 */
export function MarcoPagina({ titulo, subtitulo, atras = false, right, children }: Props) {
  const navegar = useNavigate()

  function irAtras() {
    if (typeof atras === 'string') {
      navegar(atras)
      return
    }
    if (window.history.length > 1) {
      navegar(-1)
    } else {
      navegar('/')
    }
  }

  return (
    <>
      <Block className="!pb-0 !pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {atras ? (
            <Link className="text-[14px] mb-1 inline-block" onClick={() => irAtras()}>
              ← Volver
            </Link>
          ) : null}
          <BlockTitle className="!mt-0 !mb-0">{titulo}</BlockTitle>
          {subtitulo ? (
            <p className="mt-1 text-[13px] opacity-60">{subtitulo}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0 flex flex-wrap gap-2 justify-end">{right}</div> : null}
      </Block>
      {children}
    </>
  )
}
