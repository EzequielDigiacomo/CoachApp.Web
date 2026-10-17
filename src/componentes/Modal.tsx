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

/**
 * Cuantos modales tienen el fondo trabado. Si cada uno guardara y
 * restaurara el overflow, al apilar trabajos + grafico el body quedaba
 * en "hidden" para siempre y la pagina no scrolleaba hasta refrescar.
 */
let bloqueosScroll = 0

function bloquearScrollFondo() {
  if (bloqueosScroll === 0) {
    document.body.style.overflow = 'hidden'
  }
  bloqueosScroll += 1
}

function liberarScrollFondo() {
  bloqueosScroll = Math.max(0, bloqueosScroll - 1)
  if (bloqueosScroll === 0) {
    document.body.style.overflow = ''
  }
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
  // Solo al montar / desmontar: no se vuelve a correr si cambia onCerrar.
  useEffect(() => {
    bloquearScrollFondo()
    return () => liberarScrollFondo()
  }, [])

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !pausado) {
        onCerrar()
      }
    }

    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
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
