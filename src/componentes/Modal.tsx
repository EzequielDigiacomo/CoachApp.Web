import { useEffect } from 'react'

interface Props {
  titulo: string
  subtitulo?: string
  /** chico: para modales angostos, como el de anotaciones. */
  /** grande: para contenido ancho, como la tabla de una planilla. */
  ancho?: 'normal' | 'chico' | 'grande'
  /** apilado: queda por delante cuando hay otro modal abierto debajo. */
  apilado?: boolean
  /**
   * En false, este modal ignora el Escape porque hay uno abierto encima:
   * si no, la misma tecla cerraria los dos.
   */
  pausado?: boolean
  onCerrar: () => void
  children: React.ReactNode
}

/** Marco de modal: fondo oscuro, cabecera con titulo y cierre. */
export function Modal({
  titulo,
  subtitulo,
  ancho = 'normal',
  apilado = false,
  pausado = false,
  onCerrar,
  children,
}: Props) {
  // Escape cierra el modal y, mientras esta abierto, no se mueve el fondo.
  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !pausado) {
        onCerrar()
      }
    }

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', alTeclear)

    return () => {
      document.body.style.overflow = overflowAnterior
      window.removeEventListener('keydown', alTeclear)
    }
  }, [onCerrar, pausado])

  return (
    <div
      className={apilado ? 'modal-fondo apilado' : 'modal-fondo'}
      role="presentation"
      onClick={(evento) => {
        evento.stopPropagation()
        onCerrar()
      }}
    >
      <div
        className={`modal${ancho === 'normal' ? '' : ` modal-${ancho}`}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="modal-cabecera">
          <div>
            <h3>{titulo}</h3>
            {subtitulo && <p className="sutil">{subtitulo}</p>}
          </div>
          <button type="button" className="boton-fantasma" onClick={onCerrar}>
            Cerrar
          </button>
        </header>

        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}
