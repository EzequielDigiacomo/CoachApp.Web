import { useEffect, type ReactNode } from 'react'

interface Props {
  titulo: string
  subtitulo?: ReactNode
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
  /**
   * Si es true, un click en el fondo oscuro cierra el modal.
   * Por defecto no: en carga de trabajos un click accidental tira el progreso.
   */
  cerrarConFondo?: boolean
  /**
   * Si devuelve false, se cancela el cierre (Escape, fondo o boton Cerrar).
   * Sirve para confirmar cuando hay datos sin guardar.
   */
  alIntentarCerrar?: () => boolean
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
  cerrarConFondo = false,
  alIntentarCerrar,
  onCerrar,
  children,
}: Props) {
  function intentarCerrar() {
    if (alIntentarCerrar && !alIntentarCerrar()) {
      return
    }
    onCerrar()
  }

  // Solo al montar / desmontar: no se vuelve a correr si cambia onCerrar.
  useEffect(() => {
    bloquearScrollFondo()
    return () => liberarScrollFondo()
  }, [])

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !pausado) {
        if (alIntentarCerrar && !alIntentarCerrar()) {
          return
        }
        onCerrar()
      }
    }

    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar, pausado, alIntentarCerrar])

  return (
    <div
      className={apilado ? 'modal-fondo apilado' : 'modal-fondo'}
      role="presentation"
      onClick={(evento) => {
        evento.stopPropagation()
        if (cerrarConFondo) {
          intentarCerrar()
        }
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
          <button type="button" className="boton-fantasma" onClick={intentarCerrar}>
            Cerrar
          </button>
        </header>

        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}
