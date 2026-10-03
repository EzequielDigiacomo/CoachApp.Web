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

interface Props {
  trabajo: TrabajoDto
  /** Queda por delante cuando se abre desde otro modal, como el de trabajos. */
  apilado?: boolean
  onCerrar: () => void
}

/**
 * El trabajo en un grafico: ppm y distancia a lo largo del tiempo. Es el mismo
 * marco de modal que el resto, para que se vea del mismo tamaño.
 */
export function ModalGraficoTrabajo({ trabajo, apilado = false, onCerrar }: Props) {
  const hora = trabajo.horaInicio ? ` · ${trabajo.horaInicio} h` : ''

  return (
    <Modal
      titulo="Gráfico del trabajo"
      subtitulo={`${etiquetaTipoTrabajo(trabajo.tipo)}${hora} · paladas por minuto y distancia`}
      apilado={apilado}
      onCerrar={onCerrar}
    >
      <Suspense fallback={<p className="sutil grafico-vacio">Cargando gráfico…</p>}>
        <GraficoPaladas trabajo={trabajo} />
      </Suspense>
    </Modal>
  )
}
