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
import { formatearTiempo, kilometrosPorHora, parsearTiempo, textoKmh } from '../util/tiempos'

const COLOR_LINEA = '#2563eb'
/** Naranja, para que el promedio no se confunda con la curva azul de los parciales. */
const COLOR_PROMEDIO = '#ea580c'
const COLOR_EJE = '#6b7280'
const COLOR_GRILLA = '#d9dde3'
const COLOR_METROS = '#1c1f24'

/** Un instante de la curva. La velocidad se mantiene durante el parcial. */
interface PuntoCurva {
  /** Segundos desde el inicio del trabajo. */
  t: number
  kmh: number
  /** Metros de este parcial. */
  distancia: number
  /** Lo que duró este parcial. */
  tiempo: string
  /** Metros acumulados al llegar a este instante. */
  acumulado: number
  /** El último punto solo cierra la curva, no es un parcial nuevo. */
  cierre: boolean
}

/** Donde termina un parcial, para marcar los metros arriba. */
interface MarcaDistancia {
  t: number
  distancia: number
}

/**
 * Curva de velocidad sobre el tiempo. El eje X es el reloj del trabajo y el
 * eje Y, los km/h. Arriba van los metros acumulados al terminar cada parcial.
 * No hace falta que el trabajo tenga paladas.
 */
export function GraficoVelocidad({ trabajo }: { trabajo: TrabajoDto }) {
  const { puntos, marcas } = armarCurva(trabajo)

  if (puntos.length === 0) {
    return (
      <p className="sutil grafico-vacio">
        Este trabajo no tiene parciales con distancia y tiempo para graficar.
      </p>
    )
  }

  const tiempoMaximo = puntos[puntos.length - 1].t
  const distanciaTotal = marcas[marcas.length - 1]?.distancia ?? 0
  const promedio = tiempoMaximo > 0 ? distanciaTotal / 1000 / (tiempoMaximo / 3600) : null
  const velocidades = puntos.map((punto) => punto.kmh)
  const minimo = Math.min(...velocidades, promedio ?? Infinity)
  const maximo = Math.max(...velocidades, promedio ?? 0)
  const metrosPorTiempo = new Map(marcas.map((marca) => [marca.t, `${marca.distancia.toLocaleString('es-AR')} m`]))

  return (
    <div className="grafico">
      <ResponsiveContainer width="100%" height={330}>
        <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={COLOR_GRILLA} strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, tiempoMaximo]}
            tickFormatter={(segundos: number) => formatearTiempo(segundos * 100)}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            tickMargin={8}
            stroke={COLOR_GRILLA}
          />
          <XAxis
            xAxisId="metros"
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
            domain={[Math.max(0, Math.floor(minimo - 1)), Math.ceil(maximo + 1)]}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            tickMargin={6}
            stroke={COLOR_GRILLA}
            width={40}
          />
          <Tooltip content={<TooltipVelocidad />} />
          <Line
            type="stepAfter"
            dataKey="kmh"
            name="km/h"
            stroke={COLOR_LINEA}
            strokeWidth={2}
            dot={{ r: 4, fill: COLOR_LINEA }}
            activeDot={{ r: 6 }}
          />
          {promedio !== null && (
            <ReferenceLine
              y={promedio}
              stroke={COLOR_PROMEDIO}
              strokeWidth={2.5}
              label={{
                value: `promedio ${textoKmh(promedio)}`,
                fill: COLOR_PROMEDIO,
                fontSize: 12,
                fontWeight: 700,
                position: 'insideTopRight',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <ul className="grafico-leyenda">
        <li>
          <span className="grafico-swatch swatch-ppm" />
          Velocidad (km/h)
        </li>
        <li>
          <span className="grafico-swatch swatch-promedio" />
          Promedio{promedio !== null ? ` ${textoKmh(promedio)} km/h` : ''}
        </li>
      </ul>

      <p className="sutil grafico-pie">
        La curva es la velocidad a lo largo del tiempo: se mantiene mientras dura el parcial y
        cambia al empezar el siguiente. Abajo está el reloj y arriba, los metros acumulados.
        {promedio !== null ? ` El promedio del trabajo es ${textoKmh(promedio)} km/h.` : ''}
      </p>
    </div>
  )
}

function armarCurva(trabajo: TrabajoDto): { puntos: PuntoCurva[]; marcas: MarcaDistancia[] } {
  const ordenados = [...trabajo.parciales].sort((a, b) => a.orden - b.orden)
  const puntos: PuntoCurva[] = []
  const marcas: MarcaDistancia[] = []
  let t = 0
  let acumulado = 0

  for (const parcial of ordenados) {
    const kmh = kilometrosPorHora(parcial.distanciaMetros, parcial.tiempo)
    const centesimas = parsearTiempo(parcial.tiempo)
    if (kmh === null || centesimas === null) {
      continue
    }

    puntos.push({
      t,
      kmh,
      distancia: parcial.distanciaMetros,
      tiempo: parcial.tiempo,
      acumulado,
      cierre: false,
    })

    t += centesimas / 100
    acumulado += parcial.distanciaMetros
    marcas.push({ t, distancia: acumulado })
  }

  const ultimo = puntos[puntos.length - 1]
  if (ultimo) {
    // Cierra el último parcial: la velocidad sigue hasta el tiempo final.
    puntos.push({ ...ultimo, t, acumulado, cierre: true })
  }

  return { puntos, marcas }
}

function TooltipVelocidad({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: PuntoCurva }>
}) {
  const punto = payload?.[0]?.payload
  if (!active || !punto) {
    return null
  }

  if (punto.cierre) {
    return (
      <div className="grafico-tooltip">
        <strong>
          {punto.acumulado.toLocaleString('es-AR')} m · {formatearTiempo(punto.t * 100)}
        </strong>
        <span>Fin del trabajo</span>
      </div>
    )
  }

  return (
    <div className="grafico-tooltip">
      <strong>
        {punto.distancia.toLocaleString('es-AR')} m en {punto.tiempo}
      </strong>
      <span>{textoKmh(punto.kmh)} km/h</span>
      <span className="sutil">A los {formatearTiempo(punto.t * 100)}</span>
    </div>
  )
}
