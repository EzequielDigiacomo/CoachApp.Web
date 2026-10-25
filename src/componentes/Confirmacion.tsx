import { useEffect, useState, type ReactNode } from 'react'

type Opciones = {
  titulo?: string
  aceptar?: string
  cancelar?: string
  /** Resalta el botón de aceptar (borrados, bajas, etc.). */
  peligro?: boolean
}

type Pedido = Opciones & {
  mensaje: string
  resolver: (ok: boolean) => void
}

let mostrarPedido: ((pedido: Pedido) => void) | null = null

/**
 * Sustituto de window.confirm: abre el modal de la app y espera la respuesta.
 * Hay que montar ProveedorConfirmacion en App.
 */
export function confirmar(mensaje: string, opciones: Opciones = {}): Promise<boolean> {
  return new Promise((resolver) => {
    if (!mostrarPedido) {
      resolver(false)
      return
    }
    mostrarPedido({ mensaje, ...opciones, resolver })
  })
}

/** Monta el modal de confirmación sobre el resto de la UI. */
export function ProveedorConfirmacion({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)

  useEffect(() => {
    mostrarPedido = (siguiente) => {
      setPedido((actual) => {
        // Si ya habia una confirmacion abierta, se cancela la anterior.
        actual?.resolver(false)
        return siguiente
      })
    }
    return () => {
      mostrarPedido = null
    }
  }, [])

  function cerrar(ok: boolean) {
    setPedido((actual) => {
      actual?.resolver(ok)
      return null
    })
  }

  useEffect(() => {
    if (!pedido) {
      return
    }

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopImmediatePropagation()
        cerrar(false)
      }
      if (evento.key === 'Enter') {
        evento.preventDefault()
        evento.stopImmediatePropagation()
        cerrar(true)
      }
    }

    // Capture: Escape/Enter no llegan al modal de abajo.
    window.addEventListener('keydown', alTeclear, true)
    return () => window.removeEventListener('keydown', alTeclear, true)
  }, [pedido])

  return (
    <>
      {children}
      {pedido && (
        <div
          className="modal-fondo modal-fondo-confirmacion"
          role="presentation"
          onClick={(evento) => {
            evento.stopPropagation()
            cerrar(false)
          }}
        >
          <div
            className="modal modal-chico modal-confirmacion"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmacion-titulo"
            aria-describedby="confirmacion-mensaje"
            onClick={(evento) => evento.stopPropagation()}
          >
            <header className="modal-cabecera">
              <h3 id="confirmacion-titulo">{pedido.titulo ?? 'Confirmar'}</h3>
            </header>
            <div className="modal-cuerpo">
              <p id="confirmacion-mensaje" className="confirmacion-mensaje">
                {pedido.mensaje}
              </p>
              <div className="confirmacion-acciones">
                <button
                  type="button"
                  className="boton-fantasma"
                  onClick={() => cerrar(false)}
                >
                  {pedido.cancelar ?? 'Cancelar'}
                </button>
                <button
                  type="button"
                  className={pedido.peligro ? 'boton peligro' : 'boton'}
                  autoFocus
                  onClick={() => cerrar(true)}
                >
                  {pedido.aceptar ?? 'Aceptar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
