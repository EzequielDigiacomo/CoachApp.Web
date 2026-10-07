import { useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrabajoDto } from '../tipos/api'
import { formatearTiempo, parsearTiempo } from '../util/tiempos'

/** El azul de la app, para la linea de ppm. */
const COLOR_PPM = '#2563eb'

/** Linea vertical de cada muestra de ppm: tenue, porque son muchas. */
const COLOR_MUESTRA = '#2563eb'
const OPACIDAD_MUESTRA = 0.4

/** Linea vertical de cada parcial: mas marcada, porque corta los tramos. */
const COLOR_PARCIAL = '#94a3b8'
/** La del parcial que se esta mirando se resalta. */
const COLOR_PARCIAL_ACTIVO = '#1c1f24'

const COLOR_EJE = '#6b7280'
const COLOR_GRILLA = '#d9dde3'
/** Los metros van en el gris del texto, mas oscuro que las marcas de tiempo. */
const COLOR_METROS = '#1c1f24'

/** Un punto del grafico: una muestra de ppm en su tiempo. */
interface PuntoGrafico {
  /** Segundos desde el inicio del trabajo, que es la coordenada X. */
  t: number
  ppm: number
}

/** Donde se tomo un parcial, para marcarlo arriba del eje X. */
interface MarcaParcial {
  t: number
  distancia: number
  /** Numero del parcial, de 1 en adelante. */
  numero: number
  /** Reloj acumulado al terminar este parcial ("3:53"). */
  tiempo: string
  /** Cuanto duro este parcial ("2:00"). */
  parcial: string | null
}

/**
 * Paladas por minuto a lo largo del trabajo. Cada muestra y cada parcial llevan
 * su linea vertical, asi se ve en que momento del tramo se tomo cada palada.
 * El tiempo de cada parcial se marca siempre abajo, para poder leerlo.
 */
export function GraficoPaladas({ trabajo }: { trabajo: TrabajoDto }) {
  const puntos = armarPuntos(trabajo)
  const marcas = armarMarcas(trabajo)

  /** Parcial sobre el que esta parado el puntero, si hay alguno. */
  const [parcialActivo, setParcialActivo] = useState<number | null>(null)
  /** Posicion del puntero dentro del grafico, para colgar el cartel de arriba. */
  const [posicionPuntero, setPosicionPuntero] = useState<number | null>(null)

  const contenedor = useRef<HTMLDivElement>(null)

  if (puntos.length === 0) {
    return (
      <p className="sutil grafico-vacio">
        Este trabajo no tiene paladas por minuto cargadas para graficar.
      </p>
    )
  }

  // El eje llega hasta donde llega la ultima muestra o el ultimo parcial.
  const tiempoMaximo = Math.max(puntos[puntos.length - 1].t, marcas.at(-1)?.t ?? 0)

  // El formateador de arriba necesita saber que metros van en cada tiempo.
  const metrosPorTiempo = new Map(marcas.map((marca) => [marca.t, `${marca.distancia} m`]))

  /** Lee la posicion del puntero, venga como venga el evento de recharts. */
  function alEntrarParcial(indice: number, ...argumentos: unknown[]) {
    setParcialActivo(indice)

    const caja = contenedor.current?.getBoundingClientRect()
    if (!caja) {
      setPosicionPuntero(null)
      return
    }

    for (const argumento of argumentos) {
      if (argumento && typeof argumento === 'object' && 'clientX' in argumento) {
        const clientX = (argumento as { clientX?: unknown }).clientX
        if (typeof clientX === 'number') {
          setPosicionPuntero(clientX - caja.left)
          return
        }
      }
    }

    // Sin coordenada, el cartel se centra en vez de quedar pegado a un borde.
    setPosicionPuntero(null)
  }

  const marcaActiva = parcialActivo === null ? null : marcas[parcialActivo]

  return (
    <div className="grafico" ref={contenedor}>
      {marcaActiva && (
        <div
          className="parcial-cartel"
          style={
            posicionPuntero === null
              ? { left: '50%', transform: 'translateX(-50%)' }
              : { left: Math.min(Math.max(posicionPuntero, 76), 560), transform: 'translateX(-50%)' }
          }
        >
          <strong>
            Parcial {marcaActiva.numero} · {marcaActiva.distancia} m
          </strong>
          <span>
            Total <b className="mono">{marcaActiva.tiempo}</b>
          </span>
          {marcaActiva.parcial && (
            <span>
              Parcial <b className="mono">{marcaActiva.parcial}</b>
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={330}>
        <LineChart data={puntos} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          {/* Solo las horizontales: las verticales las pone cada dato, mas abajo. */}
          <CartesianGrid
            xAxisId="tiempo"
            yAxisId="ppm"
            vertical={false}
            stroke={COLOR_GRILLA}
            strokeDasharray="3 3"
          />

          {/* Abajo, los tiempos de carrera. Las marcas de cada parcial van
              siempre, ademas de las redondeadas para leer los tramos. */}
          <XAxis
            xAxisId="tiempo"
            dataKey="t"
            type="number"
            domain={[0, tiempoMaximo]}
            ticks={marcasInferiores(tiempoMaximo, marcas)}
            tickFormatter={segundosATexto}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            tickMargin={8}
            stroke={COLOR_GRILLA}
          />

          {/* Arriba, los metros de cada parcial marcados en su tiempo. Sin linea:
              son referencias de los tramos, no una serie medida. */}
          <XAxis
            xAxisId="metroscabecera"
            dataKey="t"
            type="number"
            orientation="top"
            domain={[0, tiempoMaximo]}
            ticks={marcas.map((marca) => marca.t)}
            tickFormatter={(t: number) => metrosPorTiempo.get(t) ?? ''}
            interval={0}
            tick={{ fill: COLOR_METROS, fontSize: 11, fontWeight: 600 }}
            tickMargin={8}
            stroke={COLOR_GRILLA}
            height={26}
          />

          <YAxis
            yAxisId="ppm"
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            tickMargin={6}
            stroke={COLOR_GRILLA}
            width={40}
          />

          {/* El corte de cada tramo, en el tiempo exacto del parcial. Van antes
              que la serie para quedar por detras de la linea de ppm. */}
          {marcas.map((marca, indice) => (
            <ReferenceLine
              key={`parcial-${marca.t}`}
              xAxisId="tiempo"
              yAxisId="ppm"
              x={marca.t}
              stroke={parcialActivo === indice ? COLOR_PARCIAL_ACTIVO : COLOR_PARCIAL}
              strokeDasharray="5 4"
            />
          ))}

          {/* El momento exacto de cada toma de ppm. */}
          {puntos.map((punto) => (
            <ReferenceLine
              key={`muestra-${punto.t}`}
              xAxisId="tiempo"
              yAxisId="ppm"
              x={punto.t}
              stroke={COLOR_MUESTRA}
              strokeOpacity={OPACIDAD_MUESTRA}
              strokeDasharray="2 3"
            />
          ))}

          {/* Zona de agarre de cada parcial: mas ancha que la linea para que sea
              facil pararse encima. Va al final para quedar por encima. */}
          {marcas.map((marca, indice) => (
            <ReferenceLine
              key={`agarre-${marca.t}`}
              xAxisId="tiempo"
              yAxisId="ppm"
              x={marca.t}
              stroke="transparent"
              strokeWidth={14}
              style={{ pointerEvents: 'stroke', cursor: 'help' }}
              onMouseEnter={(...argumentos: unknown[]) => alEntrarParcial(indice, ...argumentos)}
              onMouseLeave={() => setParcialActivo(null)}
            />
          ))}

          <Tooltip content={<TooltipPaladas />} />

          <Line
            xAxisId="tiempo"
            yAxisId="ppm"
            type="monotone"
            dataKey="ppm"
            name="PPM"
            stroke={COLOR_PPM}
            strokeWidth={2}
            dot={{ r: 4, fill: COLOR_PPM }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Leyenda propia: la de recharts no puede explicar las lineas verticales. */}
      <ul className="grafico-leyenda">
        <li>
          <span className="grafico-swatch swatch-ppm" />
          PPM
        </li>
        <li>
          <span className="grafico-swatch swatch-muestra" />
          Toma de ppm
        </li>
        <li>
          <span className="grafico-swatch swatch-parcial" />
          Parcial
        </li>
      </ul>

      <p className="sutil grafico-pie">
        Los puntos son las muestras reales de ppm y la línea, cómo se encadenan. Cada línea
        vertical punteada cae donde se tomó una muestra. Parate sobre la de un parcial para ver su
        tiempo, y arriba de todo están los metros.
      </p>
    </div>
  )
}

/** Las muestras de ppm, ordenadas por tiempo. */
function armarPuntos(trabajo: TrabajoDto): PuntoGrafico[] {
  return trabajo.paladas
    .map((palada) => ({ t: aSegundos(palada.tiempo), ppm: palada.ppm }))
    .filter((punto): punto is PuntoGrafico => punto.t !== null)
    .sort((a, b) => a.t - b.t)
}

/**
 * Los parciales en el reloj corrido. Cada tiempo guardado es la duracion del
 * tramo; la marca del grafico cae donde termina, sumando las anteriores.
 */
function armarMarcas(trabajo: TrabajoDto): MarcaParcial[] {
  const ordenados = [...trabajo.parciales].sort((a, b) => a.orden - b.orden)
  let acumulado = 0
  const marcas: MarcaParcial[] = []

  for (const parcial of ordenados) {
    const duracion = aSegundos(parcial.tiempo)
    if (duracion === null) {
      continue
    }

    acumulado += duracion
    marcas.push({
      t: acumulado,
      distancia: parcial.distanciaMetros,
      numero: parcial.orden,
      tiempo: formatearTiempo(acumulado * 100),
      parcial: parcial.tiempo,
    })
  }

  return marcas
}

/** Un tiempo escrito ("1:40") a segundos, que es lo que entiende el eje numerico. */
function aSegundos(texto: string): number | null {
  const centesimas = parsearTiempo(texto)
  return centesimas === null ? null : centesimas / 100
}

/** Las marcas del eje X van como tiempo de carrera, no como segundos crudos. */
function segundosATexto(segundos: number): string {
  return formatearTiempo(segundos * 100)
}

/**
 * Las marcas del eje de abajo: el tiempo de cada parcial va siempre, y entre
 * medio se agregan marcas redondas (0:30, 1:00, 1:30) para leer los tramos.
 * Las redondas que caerian pegadas a un parcial se descartan para no amontonar.
 */
function marcasInferiores(maximo: number, parciales: MarcaParcial[]): number[] {
  const paso = [15, 30, 60, 120, 300, 600].find((p) => maximo / p <= 8) ?? 900
  const tiemposParcial = parciales.map((marca) => marca.t)

  const redondas: number[] = [0]
  for (let t = paso; t <= maximo; t += paso) {
    redondas.push(t)
  }
  if (redondas[redondas.length - 1] !== maximo) {
    redondas.push(maximo)
  }

  const separadas = redondas.filter(
    (t) => tiemposParcial.every((parcial) => Math.abs(parcial - t) > 8),
  )

  return [...new Set([...tiemposParcial, ...separadas])].sort((a, b) => a - b)
}

/** Item del tooltip, con lo justo que se usa para no depender de los tipos de recharts. */
interface ItemTooltip {
  dataKey?: string | number
  value?: number | string | null
  color?: string
  /** El dato completo del punto: de aca sale el tiempo real de la muestra. */
  payload?: PuntoGrafico
}

/**
 * Tooltip del grafico: encabezado con el tiempo y las ppm de la muestra.
 * El tiempo se lee del propio punto y no del `label`, que con dos ejes X
 * llegaba como el indice de la fila y mostraba tiempos que no eran.
 */
function TooltipPaladas({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ItemTooltip[]
  label?: number | string
}) {
  const items = (payload ?? []).filter(
    (item) => item.value !== null && item.value !== undefined,
  )

  if (!active || items.length === 0) {
    return null
  }

  const segundos = items[0].payload?.t ?? Number(label)

  return (
    <div className="grafico-tooltip">
      <strong>{Number.isFinite(segundos) ? formatearTiempo(segundos * 100) : ''}</strong>

      {items.map((item) => (
        <span key={String(item.dataKey)} style={{ color: item.color }}>
          {item.value} ppm
        </span>
      ))}
    </div>
  )
}
