import { Badge, Block, Button, Card, Checkbox, Chip, List, ListItem, Preloader, Segmented, SegmentedButton } from 'konsta/react'
import { useEffect, useState } from 'react'
import { ApiError } from '../api/cliente'
import { garminApi } from '../api/garmin'
import type { AmigoCalendarioGarminDto, CalendarioGarminDto } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'
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

  const COLOR_CARGO = { bg: 'bg-green-500', text: 'text-white' }
  const COLOR_VACIO = { bg: 'bg-amber-500', text: 'text-white' }
  const colorChip = (cargo: boolean) => {
    const bg = cargo ? 'bg-green-500' : 'bg-amber-500'
    return { fillBgIos: bg, fillBgMaterial: bg, fillTextIos: 'text-white', fillTextMaterial: 'text-white' }
  }

  function anterior() {
    setAncla((dia) => (vista === 'semana' ? sumarDias(dia, -7) : sumarMeses(dia, -1)))
  }

  function actual() {
    setAncla(vista === 'semana' ? lunesDe(hoyISO()) : inicioDeMes(hoyISO()))
  }

  function siguiente() {
    setAncla((dia) => (vista === 'semana' ? sumarDias(dia, 7) : sumarMeses(dia, 1)))
  }

  return (
    <MarcoPagina
      titulo="GarCalendar"
      subtitulo={`${titulo}. Verde si el amigo cargó una actividad, amarillo si no.${
        amigos.length > 0 ? ` Mostrando ${visibles} de ${amigos.length}.` : ''
      }`}
    >
      <Block className="space-y-3 !mt-3">
        <Segmented strong rounded>
          <SegmentedButton active={vista === 'semana'} onClick={() => elegirVista('semana')}>
            Semana
          </SegmentedButton>
          <SegmentedButton active={vista === 'mes'} onClick={() => elegirVista('mes')}>
            Mes
          </SegmentedButton>
        </Segmented>

        <div className="flex gap-2">
          <Button small rounded outline className="flex-1" onClick={anterior}>
            Anterior
          </Button>
          <Button small rounded outline className="flex-1" onClick={actual}>
            {vista === 'semana' ? 'Esta' : 'Este'}
          </Button>
          <Button small rounded outline className="flex-1" onClick={siguiente}>
            Siguiente
          </Button>
        </div>

        {amigos.length > 0 && (
          <Button small rounded tonal onClick={() => setElegir((abierto) => !abierto)}>
            {elegir ? 'Cerrar filtro' : 'Elegir amigos'}
          </Button>
        )}
      </Block>

      {amigos.length > 0 && elegir && (
        <List strong inset className="!mt-0">
          <ListItem
            link
            title="Ver todos"
            onClick={() => guardarOcultos(new Set())}
          />
          {amigos.map((amigo) => {
            const clave = claveDe(amigo)
            return (
              <ListItem
                key={clave}
                label
                title={amigo.nombre}
                media={
                  <Checkbox
                    component="div"
                    checked={!ocultos.has(clave)}
                    onChange={() => alternar(clave)}
                  />
                }
              />
            )
          })}
        </List>
      )}

      {error && (
        <Block>
          <p className="text-[13px] text-red-500">{error}</p>
        </Block>
      )}

      {cargando && (
        <Block className="flex items-center gap-3">
          <Preloader />
          <span className="text-[13px] opacity-60">
            Leyendo {vista === 'mes' ? 'el mes' : 'la semana'} en Garmin…
          </span>
        </Block>
      )}

      {calendario && !cargando && (
        <div className={`px-4 pb-4 ${vista === 'mes' ? 'semana-garmin mes' : 'semana-garmin'}`}>
          {calendario.dias.map((dia) => {
            const delDia = dia.amigos.filter((amigo) => !ocultos.has(claveDe(amigo)))
            const cargaron = delDia.filter((amigo) => amigo.cargo).length

            return (
              <Card
                key={dia.fecha}
                className="dia-garmin !m-0"
                contentWrapPadding={vista === 'mes' ? 'p-1.5' : 'p-3'}
              >
                <h3>
                  <span className="dia-semana">{fechaCorta(dia.fecha)}</span>
                  <span className="dia-mes">{Number(dia.fecha.slice(8))}</span>
                  <span className="sutil">
                    {' '}
                    · {cargaron}/{delDia.length}
                  </span>
                </h3>
                {delDia.length === 0 ? (
                  <p className="sutil">Nadie elegido.</p>
                ) : (
                  <div className="mini-grilla mt-2">
                    {delDia.map((amigo) =>
                      vista === 'mes' ? (
                        <Badge
                          key={claveDe(amigo)}
                          colors={amigo.cargo ? COLOR_CARGO : COLOR_VACIO}
                          className="max-w-full truncate"
                        >
                          {amigo.nombre}
                        </Badge>
                      ) : (
                        <Chip key={claveDe(amigo)} colors={colorChip(amigo.cargo)}>
                          {amigo.nombre}
                        </Chip>
                      ),
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </MarcoPagina>
  )
}
