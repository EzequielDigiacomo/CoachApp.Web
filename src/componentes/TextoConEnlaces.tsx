import { Fragment } from 'react'
import { partirEnlaces } from '../util/enlaces'

interface Props {
  texto: string
}

/**
 * Muestra un texto tal cual, pero con las direcciones web convertidas en
 * enlaces que se abren en otra pestaña.
 *
 * Se arma con elementos de React y no con HTML crudo: el texto lo escribe el
 * entrenador, asi que nada de lo que escriba se interpreta como HTML.
 *
 * No envuelve el texto en ninguna etiqueta: el que lo usa decide si va en un
 * parrafo o en un titulo, y conserva los saltos de linea que ya tenia.
 */
export function TextoConEnlaces({ texto }: Props) {
  return (
    <>
      {partirEnlaces(texto).map((parte, i) =>
        parte.url ? (
          <a
            key={i}
            className="enlace"
            href={parte.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en otra pestaña"
          >
            {parte.texto}
          </a>
        ) : (
          <Fragment key={i}>{parte.texto}</Fragment>
        ),
      )}
    </>
  )
}
