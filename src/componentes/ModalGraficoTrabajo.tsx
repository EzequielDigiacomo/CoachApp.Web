import { lazy, Suspense } from 'react'
import { etiquetaTipoTrabajo } from '../api/entrenamientos'
import type { TrabajoDto } from '../tipos/api'
import { Modal } from './Modal'

/**
 * recharts es pesado, asi que el grafico se descarga recien cuando alguien lo
 * abre. El marco del modal, en cambio, sale al instante y ya tiene su tamano.
 */
const GraficoPaladas = lazy(() =>
  import('./GraficoPaladas').then((modulo) => ({ default: modulo.GraficoPaladas })),
)

const GraficoVelocidad = lazy(() =>
  import('./GraficoVelocidad').then((modulo) => ({ default: modulo.GraficoVelocidad })),
)

interface Props {
  trabajo: TrabajoDto
  /** paladas: ppm a lo largo del tiempo. velocidad: km/h de cada parcial. */
  modo?: 'paladas' | 'velocidad'
  /** Queda por delante cuando se abre desde otro modal, como el de trabajos. */
  apilado?: boolean
  onCerrar: () => void
}

/**
 * El trabajo en un grafico: ppm y distancia a lo largo del tiempo. Es el mismo
 * marco de modal que el resto, para que se vea del mismo tamaño.
 */
export function ModalGraficoTrabajo({
  trabajo,
  modo = 'paladas',
  apilado = false,
  onCerrar,
}: Props) {
  const hora = trabajo.horaInicio ? ` · ${trabajo.horaInicio} h` : ''
  const detalle = modo === 'velocidad' ? 'distancia, tiempo y km/h' : 'paladas por minuto y distancia'

  return (
    <Modal
      titulo={modo === 'velocidad' ? 'Velocidad del trabajo' : 'Gráfico del trabajo'}
      subtitulo={`${etiquetaTipoTrabajo(trabajo.tipo)}${hora} · ${detalle}`}
      apilado={apilado}
      onCerrar={onCerrar}
    >
      <Suspense fallback={<p className="sutil grafico-vacio">Cargando gráfico…</p>}>
        {modo === 'velocidad' ? (
          <GraficoVelocidad trabajo={trabajo} />
        ) : (
          <GraficoPaladas trabajo={trabajo} />
        )}
      </Suspense>
    </Modal>
  )
}
