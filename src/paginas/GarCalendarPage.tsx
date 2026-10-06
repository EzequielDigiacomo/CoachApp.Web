import { useEffect, useState } from 'react'
import { ApiError } from '../api/cliente'
import { garminApi } from '../api/garmin'
import type { AmigoCalendarioGarminDto, CalendarioGarminDto } from '../tipos/api'
import { fechaCorta, hoyISO, inicioDeMes, lunesDe, sumarDias, sumarMeses, tituloMes } from '../util/fechas'

type Vista = 'semana' | 'mes'

const CLAVE_OCULTOS = 'coachapp.garmin.ocultos'

function leerOcultos(): Set<string> {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_OCULTOS) ?? '[]') as unknown
    return new Set(Array.isArray(guardados) ? guardados.filter((item) => typeof item === 'string') : [])
  } catch {
    return new Set()
  }
}

function claveDe(amigo: AmigoCalendarioGarminDto): string {
  return amigo.clave || amigo.nombre
}

/**
 * Calendario de Garmin por semana o por mes. Cada dia es una card y cada
 * amigo va en verde si cargo una actividad o en amarillo si no.
 */
export function GarCalendarPage() {
  const [vista, setVista] = useState<Vista>('semana')
  const [ancla, setAncla] = useState(() => lunesDe(hoyISO()))
  const [calendario, setCalendario] = useState<CalendarioGarminDto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elegir, setElegir] = useState(false)
  const [ocultos, setOcultos] = useState<Set<string>>(leerOcultos)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)

    garminApi
      .calendario(ancla, vista === 'mes')
      .then((datos) => {
        if (vigente) {
          setCalendario(datos)
        }
      })
      .catch((e: unknown) => {
        if (!vigente) {
          return
        }

        setCalendario(null)
        setError(e instanceof ApiError ? e.message : 'No se pudo leer Garmin.')
      })
      .finally(() => {
        if (vigente) {
          setCargando(false)
        }
      })

    return () => {
      vigente = false
    }
  }, [ancla, vista])

  function elegirVista(siguiente: Vista) {
    setVista(siguiente)
    setAncla(siguiente === 'mes' ? inicioDeMes(ancla) : lunesDe(ancla))
  }

  function guardarOcultos(siguientes: Set<string>) {
    setOcultos(siguientes)
    localStorage.setItem(CLAVE_OCULTOS, JSON.stringify([...siguientes]))
  }

  function alternar(clave: string) {
    const siguientes = new Set(ocultos)
    if (siguientes.has(clave)) {
      siguientes.delete(clave)
    } else {
      siguientes.add(clave)
    }

    guardarOcultos(siguientes)
  }

  const titulo =
    vista === 'mes'
      ? tituloMes(calendario?.desde ?? ancla)
      : calendario === null
        ? fechaCorta(ancla)
        : `${fechaCorta(calendario.desde)} – ${fechaCorta(calendario.hasta)}`

  const amigos = calendario?.dias[0]?.amigos ?? []
  const visibles = amigos.filter((amigo) => !ocultos.has(claveDe(amigo))).length

  return (
    <div className={vista === 'mes' ? 'pagina calendario-mes' : 'pagina'}>
      <div className="encabezado">
        <h2>GarCalendar</h2>
        <div className="semana-nav">
          <button
            type="button"
            className={vista === 'semana' ? 'boton' : 'boton-fantasma'}
            onClick={() => elegirVista('semana')}
          >
            Semana
          </button>
          <button
            type="button"
            className={vista === 'mes' ? 'boton' : 'boton-fantasma'}
            onClick={() => elegirVista('mes')}
          >
            Mes
          </button>
          {vista === 'semana' ? (
            <>
              <button type="button" className="boton-fantasma" onClick={() => setAncla((dia) => sumarDias(dia, -7))}>
                Anterior
              </button>
              <button type="button" className="boton-fantasma" onClick={() => setAncla(lunesDe(hoyISO()))}>
                Esta
              </button>
              <button type="button" className="boton-fantasma" onClick={() => setAncla((dia) => sumarDias(dia, 7))}>
                Siguiente
              </button>
            </>
          ) : (
            <>
              <button type="button" className="boton-fantasma" onClick={() => setAncla((dia) => sumarMeses(dia, -1))}>
                Anterior
              </button>
              <button type="button" className="boton-fantasma" onClick={() => setAncla(inicioDeMes(hoyISO()))}>
                Este
              </button>
              <button type="button" className="boton-fantasma" onClick={() => setAncla((dia) => sumarMeses(dia, 1))}>
                Siguiente
              </button>
            </>
          )}
        </div>
      </div>

      <p className="sutil">
        {titulo}. Verde si el amigo cargó una actividad, amarillo si no.
        {amigos.length > 0 && ` Mostrando ${visibles} de ${amigos.length}.`}
      </p>

      {amigos.length > 0 && (
        <div className="tarjeta">
          <button type="button" className="boton-fantasma" onClick={() => setElegir((abierto) => !abierto)}>
            {elegir ? 'Cerrar filtro' : 'Elegir amigos'}
          </button>
          {elegir && (
            <div className="elegir-amigos">
              <button type="button" className="enlace-texto" onClick={() => guardarOcultos(new Set())}>
                Ver todos
              </button>
              {amigos.map((amigo) => {
                const clave = claveDe(amigo)
                return (
                  <label key={clave} className="casilla">
                    <input
                      type="checkbox"
                      checked={!ocultos.has(clave)}
                      onChange={() => alternar(clave)}
                    />
                    {amigo.nombre}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {cargando && <p className="sutil">Leyendo {vista === 'mes' ? 'el mes' : 'la semana'} en Garmin…</p>}

      {calendario && !cargando && (
        <div className={vista === 'mes' ? 'semana-garmin mes' : 'semana-garmin'}>
          {calendario.dias.map((dia) => {
            const delDia = dia.amigos.filter((amigo) => !ocultos.has(claveDe(amigo)))
            const cargaron = delDia.filter((amigo) => amigo.cargo).length

            return (
              <article key={dia.fecha} className="tarjeta dia-garmin">
                <h3>
                  {fechaCorta(dia.fecha)}
                  <span className="sutil">
                    {' '}
                    · {cargaron}/{delDia.length}
                  </span>
                </h3>
                {delDia.length === 0 ? (
                  <p className="sutil">Nadie elegido.</p>
                ) : (
                  <div className="mini-grilla">
                    {delDia.map((amigo) => (
                      <span key={claveDe(amigo)} className={`amigo-garmin ${amigo.cargo ? 'cargo' : 'vacio'}`}>
                        {amigo.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
