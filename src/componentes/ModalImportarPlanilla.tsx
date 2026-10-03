import { useState } from 'react'
import { ApiError } from '../api/cliente'
import { integracionesApi } from '../api/integraciones'
import type { HojaLeidaDto } from '../tipos/api'
import { Modal } from './Modal'

/** Ultimo link usado, para no tener que pegarlo de nuevo cada vez. */
const CLAVE_URL = 'coachapp.planilla'

/**
 * El recuadro de la planilla que se lee siempre.
 *
 * La planilla del entrenador tiene decenas de columnas de calculo (R0, R1, KM,
 * TH...) que no sirven para esto. Lo util es este cuadrado: la fila 7 tiene los
 * titulos (DIA, Tipo, %, DESCRIPCION DEL ENTRENAMIENTO) y de ahi para abajo van
 * las sesiones, hasta la 49.
 */
const RANGO = 'B7:E49'

/** La columna 1 es la A, la 27 la AA, como en Excel. */
function letraDeColumna(columna: number): string {
  let letra = ''
  let numero = columna

  while (numero > 0) {
    const resto = (numero - 1) % 26
    letra = String.fromCharCode(65 + resto) + letra
    numero = Math.floor((numero - 1) / 26)
  }

  return letra
}

function mensajeDe(e: unknown, alternativo: string): string {
  return e instanceof ApiError ? e.message : alternativo
}

interface Props {
  /** Recibe el texto de la celda elegida, tal cual esta en la planilla. */
  onElegir: (texto: string) => void
  onCerrar: () => void
}

/**
 * Trae una descripcion desde una planilla de Google Sheets.
 *
 * Va en pasos a proposito: el libro del entrenador tiene muchisimas pestañas,
 * asi que primero se le pide el link y despues elige la pestaña. La tabla
 * muestra siempre el recuadro de descripciones, y el texto entra tal cual esta
 * escrito, que es el punto de todo esto.
 */
export function ModalImportarPlanilla({ onElegir, onCerrar }: Props) {
  const [url, setUrl] = useState(() => localStorage.getItem(CLAVE_URL) ?? '')
  const [pestanas, setPestanas] = useState<string[] | null>(null)
  const [pestana, setPestana] = useState('')
  const [hoja, setHoja] = useState<HojaLeidaDto | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const link = url.trim()

  async function leerLibro(evento: React.FormEvent) {
    evento.preventDefault()
    setCargando(true)
    setError(null)
    // Lo anterior se limpia: si el link cambia, mostrarlo seria engañoso.
    setPestanas(null)
    setHoja(null)
    setPestana('')

    try {
      const lista = await integracionesApi.listarPestanas(link)
      setPestanas(lista)
      localStorage.setItem(CLAVE_URL, link)

      // Se muestra la primera pestaña para que haya algo apenas termina de leer.
      if (lista.length > 0) {
        await cargarPestana(lista[0])
      }
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo leer la planilla.'))
    } finally {
      setCargando(false)
    }
  }

  async function cargarPestana(nombre: string) {
    setCargando(true)
    setError(null)
    setHoja(null)

    try {
      setHoja(await integracionesApi.leerHoja(link, nombre, RANGO))
      setPestana(nombre)
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo leer la pestaña.'))
    } finally {
      setCargando(false)
    }
  }

  // Si el backend no manda la columna inicial (por ejemplo una version vieja
  // de la API), se asume A: es mejor que mostrar los encabezados vacios.
  const columnaInicial = hoja?.columnaInicial ?? 1

  // "B7:E49", para mostrar arriba de la tabla que parte se esta viendo.
  const encuadre = (() => {
    if (!hoja || hoja.filas.length === 0) return RANGO

    const primera = hoja.filas[0]
    const ultima = hoja.filas[hoja.filas.length - 1]
    const desde = `${letraDeColumna(columnaInicial)}${primera.numero}`
    const hasta = `${letraDeColumna(columnaInicial + hoja.columnas - 1)}${ultima.numero}`

    return `${desde}:${hasta}`
  })()

  return (
    <Modal
      ancho="grande"
      titulo="Traer la descripción de la planilla"
      subtitulo="Elegís la pestaña, tocás la descripción, y el texto entra tal cual está escrito."
      onCerrar={onCerrar}
    >
      <section className="planilla-paso">
        <h4>
          <span className="planilla-paso-numero">1</span>
          Pegá el link del libro
        </h4>

        <p className="sutil">
          El libro tiene que estar compartido con «cualquier persona que tenga el enlace».
        </p>

        <form className="planilla-form" onSubmit={leerLibro}>
          <label>
            Link de la planilla
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              required
            />
          </label>

          <button type="submit" className="boton" disabled={cargando || link.length === 0}>
            {cargando && !pestanas ? 'Leyendo el libro…' : pestanas ? 'Volver a leer' : 'Leer el libro'}
          </button>
        </form>
      </section>

      <section className="planilla-paso">
        <h4>
          <span className="planilla-paso-numero">2</span>
          Elegí la pestaña
        </h4>

        {!pestanas && !error && <p className="sutil">Primero leé el libro: después aparecen las pestañas.</p>}

        {pestanas && (
          <>
            <label className="planilla-pestana">
              Pestaña
              <select
                value={pestana}
                onChange={(e) => void cargarPestana(e.target.value)}
                disabled={cargando}
              >
                {pestanas.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>

            <p className="sutil">
              El libro tiene {pestanas.length} {pestanas.length === 1 ? 'pestaña' : 'pestañas'}. Se lee
              siempre el recuadro <code>{RANGO}</code> de la pestaña elegida.
            </p>
          </>
        )}
      </section>

      {error && <p className="error planilla-error">{error}</p>}

      <section className="planilla-paso">
        <h4>
          <span className="planilla-paso-numero">3</span>
          Elegí la descripción
        </h4>

        {cargando && <p className="sutil">Leyendo la pestaña…</p>}

        {!cargando && hoja && hoja.filas.length === 0 && (
          <p className="sutil">
            La pestaña «{hoja.pestana}» no tiene celdas con contenido en {RANGO}.
          </p>
        )}

        {!cargando && !hoja && !error && <p className="sutil">Acá va a aparecer la tabla.</p>}

        {!cargando && hoja && hoja.filas.length > 0 && (
          <>
            <p className="sutil planilla-ayuda">
              <span className="planilla-encuadre">{encuadre}</span>
              {' '}
              {hoja.filas.length} {hoja.filas.length === 1 ? 'fila' : 'filas'} · pestaña «
              {hoja.pestana}». Tocá la celda con la descripción; las vacías no se pueden elegir.
            </p>

            <div className="tabla-scroll planilla-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th className="planilla-numero">#</th>
                    {Array.from({ length: hoja.columnas }, (_, i) => (
                      <th key={i}>{letraDeColumna(columnaInicial + i)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hoja.filas.map((fila) => (
                    <tr key={fila.numero}>
                      <td className="planilla-numero">{fila.numero}</td>
                      {fila.celdas.map((celda, columna) => {
                        const referencia = `${letraDeColumna(columnaInicial + columna)}${fila.numero}`

                        return (
                          <td key={columna}>
                            <button
                              type="button"
                              className="planilla-celda"
                              onClick={() => onElegir(celda)}
                              disabled={celda.trim().length === 0}
                              title={`Usar ${referencia} como descripción`}
                            >
                              {celda}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </Modal>
  )
}
