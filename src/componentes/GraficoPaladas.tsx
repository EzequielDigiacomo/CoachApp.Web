import { useEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react'
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

/** Cuanto se acerca la linea de tiempo con cada muesca de la rueda. */
const PASO_ZOOM = 0.82

/** El ancho visible mas chico al que se puede llegar, en segundos. */
const ANCHO_MINIMO = 4

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
 *
 * La rueda del mouse acerca la linea de tiempo y, ya con zoom, apretar y
 * arrastrar corre la ventana. El doble clic vuelve al trabajo entero.
 */
export function GraficoPaladas({ trabajo }: { trabajo: TrabajoDto }) {
  const puntos = armarPuntos(trabajo)
  const marcas = armarMarcas(trabajo)

  /** El eje llega hasta donde llega la ultima muestra o el ultimo parcial. */
  const tiempoMaximo = Math.max(puntos.at(-1)?.t ?? 0, marcas.at(-1)?.t ?? 0)

  /** Parcial sobre el que esta parado el puntero, si hay alguno. */
  const [parcialActivo, setParcialActivo] = useState<number | null>(null)
  /** Posicion del puntero dentro del grafico, para colgar el cartel de arriba. */
  const [posicionPuntero, setPosicionPuntero] = useState<number | null>(null)
  /** Ventana visible del eje de tiempo. null quiere decir "el trabajo entero". */
  const [zoom, setZoom] = useState<[number, number] | null>(null)
  /** true mientras se corre la ventana con el boton del mouse apretado. */
  const [arrastrando, setArrastrando] = useState(false)

  const contenedor = useRef<HTMLDivElement>(null)
  /** De donde salio el arrastre que esta en curso, en segundos y en pixeles. */
  const arrastre = useRef<{ x: number; desde: number; hasta: number } | null>(null)
  /** El pellizco en curso: la distancia entre los dedos y donde apuntan. */
  const pellizco = useRef<{ distancia: number; fraccion: number } | null>(null)

  // Cada trabajo empieza de cero: el zoom que habia era del que se miraba antes.
  useEffect(() => {
    setZoom(null)
  }, [trabajo.id])

  /**
   * La rueda acerca y aleja la linea de tiempo. El listener va a mano porque
   * React registra `wheel` como pasivo y ahi `preventDefault` no corre: sin
   * frenarlo, el modal de atras se desplaza al mismo tiempo.
   */
  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) {
      return
    }

    function alGirar(evento: WheelEvent) {
      // El area dibujada es la regla del tiempo y el svg entero dice si la rueda
      // esta sobre el grafico o sobre la leyenda, donde tiene que seguir siendo
      // scroll. Se relee del contenedor para no depender de la referencia viva.
      const raiz = contenedor.current
      const area = areaDibujada(raiz)
      const dibujo = raiz?.querySelector('.recharts-surface')

      if (!area || !dibujo || !dibujo.contains(evento.target as Node)) {
        return
      }

      evento.preventDefault()

      // 0 en el borde izquierdo del area y 1 en el derecho: ahi queda el puntero.
      const fraccion = Math.min(Math.max((evento.clientX - area.left) / area.width, 0), 1)

      setZoom((actual) => {
        const [desde, hasta] = actual ?? [0, tiempoMaximo]
        const ancho = hasta - desde
        const nuevoAncho = recortarVentana(
          desde,
          ancho * (evento.deltaY < 0 ? PASO_ZOOM : 1 / PASO_ZOOM),
          tiempoMaximo,
        )[1] - desde

        // Alejar del todo devuelve el rango completo, ya redondeado a los bordes.
        if (nuevoAncho >= tiempoMaximo) {
          return null
        }

        // Se acerca hacia donde esta el puntero, no hacia el centro.
        const centro = desde + fraccion * ancho
        return recortarVentana(centro - fraccion * nuevoAncho, nuevoAncho, tiempoMaximo)
      })
    }

    nodo.addEventListener('wheel', alGirar, { passive: false })
    return () => nodo.removeEventListener('wheel', alGirar)
  }, [tiempoMaximo])

  /**
   * En el celular no hay rueda: el zoom se hace con dos dedos. Un dedo tiene que
   * seguir desplazando el modal, asi que el gesto se toma recien cuando hay dos,
   * y ahi se frena el scroll para que no se lleve puesto el pellizco.
   */
  useEffect(() => {
    const raiz = contenedor.current
    if (!raiz) {
      return
    }

    function alApoyar(evento: TouchEvent) {
      const nodo = contenedor.current

      // Un dedo no es pellizco: solo se olvida el gesto anterior. El arrastre
      // que pudo haber empezado ese dedo se deja quieto.
      if (evento.touches.length !== 2 || !nodo || !sobreElDibujo(nodo, evento.target)) {
        pellizco.current = null
        return
      }

      // Con dos dedos el gesto pasa a ser el pellizco, no el arrastre.
      arrastre.current = null
      setArrastrando(false)
      pellizco.current = pellizcoDe(nodo, evento)
    }

    function alPellizcar(evento: TouchEvent) {
      const nodo = contenedor.current
      const anterior = pellizco.current
      const actual = nodo ? pellizcoDe(nodo, evento) : null

      if (!anterior || !actual || actual.distancia === 0) {
        return
      }

      evento.preventDefault()

      setZoom((ventana) => {
        const [desde, hasta] = ventana ?? [0, tiempoMaximo]
        const ancho = hasta - desde

        // Separa los dedos y se acerca; los junta y se aleja.
        const nuevoAncho =
          recortarVentana(desde, ancho * (anterior.distancia / actual.distancia), tiempoMaximo)[1] -
          desde

        // Al alejarse del todo vuelve el rango completo, redondeado a los bordes.
        if (nuevoAncho >= tiempoMaximo) {
          return null
        }

        // El tiempo que estaba entre los dedos sigue entre los dedos.
        const centro = desde + anterior.fraccion * ancho
        return recortarVentana(centro - actual.fraccion * nuevoAncho, nuevoAncho, tiempoMaximo)
      })

      pellizco.current = actual
    }

    function alLevantarDedo(evento: TouchEvent) {
      if (evento.touches.length < 2) {
        pellizco.current = null
      }
    }

    raiz.addEventListener('touchstart', alApoyar, { passive: false })
    raiz.addEventListener('touchmove', alPellizcar, { passive: false })
    raiz.addEventListener('touchend', alLevantarDedo)
    raiz.addEventListener('touchcancel', alLevantarDedo)

    return () => {
      raiz.removeEventListener('touchstart', alApoyar)
      raiz.removeEventListener('touchmove', alPellizcar)
      raiz.removeEventListener('touchend', alLevantarDedo)
      raiz.removeEventListener('touchcancel', alLevantarDedo)
    }
  }, [tiempoMaximo])

  if (puntos.length === 0) {
    return (
      <p className="sutil grafico-vacio">
        Este trabajo no tiene paladas por minuto cargadas para graficar.
      </p>
    )
  }

  const dominio: [number, number] = zoom ?? [0, tiempoMaximo]

  /** Solo lo que cae en la ventana: lo de afuera se dibujaria fuera del area. */
  const dentro = (t: number) => t >= dominio[0] && t <= dominio[1]

  const marcasAdentro = marcas.filter((marca) => dentro(marca.t))
  const muestrasAdentro = puntos.filter((punto) => dentro(punto.t))

  // El formateador de arriba necesita saber que metros van en cada tiempo.
  const metrosPorTiempo = new Map(marcasAdentro.map((marca) => [marca.t, `${marca.distancia} m`]))

  // Con zoom, el eje de ppm se reescala a lo que se ve: si no, acercarse a un
  // tramo no agranda nada de lo que importa.
  const rangoPpm: [number | string, number | string] = zoom
    ? rangoDePpm(muestrasAdentro.length > 0 ? muestrasAdentro : puntos)
    : ['dataMin - 10', 'dataMax + 10']

  /** Con zoom, apretar y arrastrar corre la ventana a lo largo del trabajo. */
  function alApretar(evento: EventoPuntero<HTMLDivElement>) {
    if (!zoom) {
      return
    }

    arrastre.current = { x: evento.clientX, desde: zoom[0], hasta: zoom[1] }
    evento.currentTarget.setPointerCapture(evento.pointerId)
    setArrastrando(true)
  }

  function alMoverArrastre(evento: EventoPuntero<HTMLDivElement>) {
    const actual = arrastre.current
    const area = areaDibujada(contenedor.current)

    // Con dos dedos manda el pellizco: el arrastre de uno solo se descarta.
    if (!actual || !area || pellizco.current) {
      return
    }

    // Cuantos segundos entran en un pixel con la ventana que se esta corriendo.
    const porPixel = (actual.hasta - actual.desde) / area.width
    const corrimiento = (evento.clientX - actual.x) * porPixel
    setZoom(
      recortarVentana(actual.desde - corrimiento, actual.hasta - actual.desde, tiempoMaximo),
    )
  }

  function alSoltar() {
    arrastre.current = null
    setArrastrando(false)
  }

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
    <div
      className={`grafico${zoom ? ' con-zoom' : ''}${arrastrando ? ' arrastrando' : ''}`}
      ref={contenedor}
      onPointerDown={alApretar}
      onPointerMove={alMoverArrastre}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onDoubleClick={() => setZoom(null)}
    >
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
              siempre, ademas de las redondeadas para leer los tramos. Con zoom
              se recalculan sobre la ventana que se esta viendo. */}
          <XAxis
            xAxisId="tiempo"
            dataKey="t"
            type="number"
            domain={dominio}
            allowDataOverflow={zoom !== null}
            ticks={marcasInferiores(dominio[0], dominio[1], marcas)}
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
            domain={dominio}
            allowDataOverflow={zoom !== null}
            ticks={marcasAdentro.map((marca) => marca.t)}
            tickFormatter={(t: number) => metrosPorTiempo.get(t) ?? ''}
            interval={0}
            tick={{ fill: COLOR_METROS, fontSize: 11, fontWeight: 600 }}
            tickMargin={8}
            stroke={COLOR_GRILLA}
            height={26}
          />

          <YAxis
            yAxisId="ppm"
            domain={rangoPpm}
            allowDataOverflow={zoom !== null}
            tick={{ fill: COLOR_EJE, fontSize: 12 }}
            tickMargin={6}
            stroke={COLOR_GRILLA}
            width={40}
          />

          {/* El corte de cada tramo, en el tiempo exacto del parcial. Van antes
              que la serie para quedar por detras de la linea de ppm. */}
          {marcas.map((marca, indice) =>
            dentro(marca.t) ? (
              <ReferenceLine
                key={`parcial-${marca.t}`}
                xAxisId="tiempo"
                yAxisId="ppm"
                x={marca.t}
                stroke={parcialActivo === indice ? COLOR_PARCIAL_ACTIVO : COLOR_PARCIAL}
                strokeDasharray="5 4"
              />
            ) : null,
          )}

          {/* El momento exacto de cada toma de ppm. */}
          {muestrasAdentro.map((punto) => (
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
          {marcas.map((marca, indice) =>
            dentro(marca.t) ? (
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
            ) : null,
          )}

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
        tiempo, y arriba de todo están los metros. Con la rueda del mouse (o con dos dedos, en el
        celular) te acercás a un tramo, y arrastrando te corrés; el doble clic vuelve a ver todo.
      </p>

      {zoom && (
        <button type="button" className="boton-fantasma grafico-ver-todo" onClick={() => setZoom(null)}>
          Ver todo el trabajo
        </button>
      )}
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

/**
 * El area donde se dibuja la serie, sin los ejes: su borde izquierdo es el
 * tiempo 0 de la ventana y su ancho, el tiempo maximo. Se lee del cuadriculado,
 * que la ocupa entera, para saber que tiempo cae debajo del puntero.
 */
function areaDibujada(nodo: HTMLElement | null): DOMRect | null {
  const area = nodo?.querySelector('.recharts-cartesian-grid')?.getBoundingClientRect()

  return area && area.width > 0 && area.height > 0 ? area : null
}

/** true si el gesto empezo sobre el dibujo y no sobre la leyenda o el pie. */
function sobreElDibujo(nodo: HTMLElement, objetivo: EventTarget | null): boolean {
  const dibujo = nodo.querySelector('.recharts-surface')

  return dibujo !== null && dibujo.contains(objetivo as Node)
}

/**
 * Como esta el pellizco: que tan separados estan los dedos y en que punto del
 * tiempo (0 a 1 dentro del area) queda el medio de los dos.
 */
function pellizcoDe(
  nodo: HTMLElement,
  evento: TouchEvent,
): { distancia: number; fraccion: number } | null {
  const area = areaDibujada(nodo)
  const [uno, otro] = [evento.touches[0], evento.touches[1]]

  if (!area || !uno || !otro) {
    return null
  }

  const medio = (uno.clientX + otro.clientX) / 2

  return {
    distancia: Math.hypot(uno.clientX - otro.clientX, uno.clientY - otro.clientY),
    fraccion: Math.min(Math.max((medio - area.left) / area.width, 0), 1),
  }
}

/** Encaja una ventana de ancho fijo dentro del trabajo, sin pasarse de los bordes. */
function recortarVentana(inicio: number, ancho: number, maximo: number): [number, number] {
  const acotado = Math.min(Math.max(ancho, Math.min(ANCHO_MINIMO, maximo)), maximo)
  const desde = Math.min(Math.max(inicio, 0), Math.max(maximo - acotado, 0))

  return [desde, desde + acotado]
}

/** El rango del eje de ppm para las muestras que se estan viendo, con un aire. */
function rangoDePpm(muestras: PuntoGrafico[]): [number, number] {
  let minimo = Infinity
  let maximo = -Infinity

  for (const muestra of muestras) {
    minimo = Math.min(minimo, muestra.ppm)
    maximo = Math.max(maximo, muestra.ppm)
  }

  const aire = Math.max((maximo - minimo) * 0.15, 4)

  return [Math.floor(minimo - aire), Math.ceil(maximo + aire)]
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
 * Se calculan sobre la ventana visible, asi con zoom se ve una escala mas fina:
 * los parciales que caen fuera quedan afuera. Las redondas que caerian pegadas a
 * un parcial se descartan para no amontonar.
 */
function marcasInferiores(desde: number, hasta: number, parciales: MarcaParcial[]): number[] {
  const ancho = hasta - desde
  const paso = [5, 10, 15, 30, 60, 120, 300, 600].find((p) => ancho / p <= 8) ?? 900

  const redondas: number[] = []
  for (let t = Math.ceil(desde / paso) * paso; t <= hasta - paso / 2; t += paso) {
    redondas.push(t)
  }

  const tiemposParcial = parciales
    .filter((marca) => marca.t >= desde && marca.t <= hasta)
    .map((marca) => marca.t)

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
