import { Fragment, useRef, useState, type RefObject } from 'react'
import { armarTiempoCampo, partirTiempoCampo } from '../util/tiempos'

type Parte = 'm' | 's' | 'c'

const ORDEN: Parte[] = ['m', 's', 'c']

const MAXIMO: Record<Parte, number> = { m: 2, s: 2, c: 2 }
const TOPE: Record<Parte, number> = { m: 99, s: 59, c: 99 }

const ETIQUETA: Record<Parte, string> = {
  m: 'minutos',
  s: 'segundos',
  c: 'centésimas',
}

/**
 * Tiempo en tres casillas, 00:00,00. Los dos puntos y la coma ya estan: en el
 * celular el teclado numerico no los tiene. Al tocar una casilla se selecciona
 * el numero y lo que se escribe lo reemplaza.
 */
export function CampoTiempo({
  valor,
  onChange,
  className,
}: {
  valor: string
  onChange: (valor: string) => void
  className?: string
}) {
  const refs = {
    m: useRef<HTMLInputElement>(null),
    s: useRef<HTMLInputElement>(null),
    c: useRef<HTMLInputElement>(null),
  }
  // La casilla que se esta escribiendo y su texto ya recortado. Fuera de ella
  // manda el valor recibido, que es el que quedo armado.
  const [edicion, setEdicion] = useState<{ parte: Parte; texto: string } | null>(null)

  const partes = partirTiempoCampo(valor)

  function mostrado(parte: Parte): string {
    // Mientras se escribe se ve el digito tal cual (sin el 0 de adelante); al
    // salir de la casilla vuelve el valor armado, ya completo.
    if (edicion?.parte === parte && edicion.texto !== '') {
      return edicion.texto
    }
    return partes[parte]
  }

  function alCambiar(parte: Parte, texto: string) {
    // El valor previo es el que se ve en pantalla: el borrador si hay algo, y
    // si no 00, que es lo que muestra la casilla.
    const anterior =
      edicion?.parte === parte && edicion.texto !== '' ? edicion.texto : partes[parte]
    const maximo = MAXIMO[parte]
    let digitos = texto.replace(/\D/g, '')

    // El teclado del celular no siempre respeta la seleccion: el digito nuevo
    // puede quedar pegado delante o detras del que ya estaba. Se descarta el
    // sobrante y se conserva lo ultimo que se escribio.
    if (anterior && digitos.length > maximo) {
      if (digitos.startsWith(anterior)) {
        digitos = digitos.slice(anterior.length)
      } else if (digitos.endsWith(anterior)) {
        digitos = digitos.slice(0, digitos.length - anterior.length)
      } else {
        digitos = digitos.slice(-maximo)
      }
    }

    digitos = digitos.slice(0, maximo)

    if (digitos !== '' && Number(digitos) > TOPE[parte]) {
      digitos = digitos.slice(0, -1)
    }

    // Con dos digitos, o con un 6 o mas en los segundos, la parte ya esta.
    const listo =
      digitos.length === maximo ||
      (parte === 's' && digitos.length === 1 && Number(digitos) >= 6)

    // Mientras se escribe se ve lo tipeado tal cual, sin rellenar con ceros: si
    // no, el segundo digito se pierde contra el 0 que se agrega adelante.
    setEdicion({ parte, texto: digitos })

    const siguientes = {
      ...partirTiempoCampo(valor),
      [parte]: digitos === '' ? '00' : digitos.padStart(2, '0'),
    }
    onChange(armarTiempoCampo(siguientes))

    if (!listo || parte === 'c') {
      return
    }

    const siguiente = ORDEN[ORDEN.indexOf(parte) + 1]
    window.setTimeout(() => {
      const casilla = refs[siguiente].current
      casilla?.focus()
      casilla?.select()
    }, 0)
  }

  function alEntrar(parte: Parte) {
    setEdicion({ parte, texto: partes[parte] })
    const casilla = refs[parte].current
    window.setTimeout(() => casilla?.select(), 0)
  }

  function alSalir(parte: Parte) {
    // Al soltar la casilla vuelve el valor armado: un 6 suelto se ve 06.
    setEdicion((actual) => (actual?.parte === parte ? null : actual))
  }

  return (
    <div className={className ? `tiempo-mask ${className}` : 'tiempo-mask'}>
      {ORDEN.map((parte, indice) => (
        <Fragment key={parte}>
          {indice > 0 && (
            <span className="tiempo-sep" aria-hidden="true">
              {parte === 's' ? ':' : ','}
            </span>
          )}
          <Casilla
            parte={parte}
            valor={mostrado(parte)}
            inputRef={refs[parte]}
            onFocus={() => alEntrar(parte)}
            onBlur={() => alSalir(parte)}
            onChange={(texto) => alCambiar(parte, texto)}
          />
        </Fragment>
      ))}
    </div>
  )
}

function Casilla({
  parte,
  valor,
  inputRef,
  onFocus,
  onBlur,
  onChange,
}: {
  parte: Parte
  valor: string
  inputRef: RefObject<HTMLInputElement | null>
  onFocus: () => void
  onBlur: () => void
  onChange: (texto: string) => void
}) {
  return (
    <div className="tiempo-parte">
      <input
        ref={inputRef}
        className="tiempo-digitos"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ETIQUETA[parte]}
        value={valor}
        onFocus={onFocus}
        onBlur={onBlur}
        onMouseUp={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>{parte}</span>
    </div>
  )
}
