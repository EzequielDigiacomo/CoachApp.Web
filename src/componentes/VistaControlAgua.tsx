import type { ControlDto } from '../tipos/api'
import { fechaLarga, fechaNumerica } from '../util/fechas'
import { NombreAtleta } from './NombreAtleta'

/** Lectura de controles de agua: distancia, tiempos, velocidad y categoria. */
export function VistaControlAgua({
  controles,
  vacio = 'Todavía no hay controles de agua.',
}: {
  controles: ControlDto[]
  vacio?: string
}) {
  if (controles.length === 0) {
    return <p className="sutil">{vacio}</p>
  }

  return (
    <div className="controles-lista">
      {controles.map((control) => (
        <article className="tarjeta control-tarjeta" key={control.id}>
          <header className="control-cabecera">
            <div>
              <strong>{fechaLarga(control.fecha)}</strong>
              <p className="sutil">{fechaNumerica(control.fecha)}</p>
            </div>
            {control.atletaNombre && (
              <NombreAtleta
                className="sutil"
                nombre={control.atletaNombre}
                color={control.atletaColor}
              />
            )}
          </header>

          {control.observaciones && <p className="sutil">{control.observaciones}</p>}

          <div className="control-agua-datos">
            <Dato etiqueta="Distancia" valor={control.distanciaMetros != null ? `${control.distanciaMetros} m` : '—'} />
            <Dato etiqueta="Tiempo" valor={control.tiempo ?? '—'} />
            <Dato
              etiqueta="Testigo"
              valor={
                control.tiempoTestigo
                  ? `${control.tiempoTestigo}${control.anioTestigo ? ` (${control.anioTestigo})` : ''}`
                  : '—'
              }
            />
            <Dato
              etiqueta="Velocidad"
              valor={
                control.velocidadKmh != null
                  ? `${control.velocidadKmh.toLocaleString('es-AR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })} km/h`
                  : '—'
              }
            />
            <Dato etiqueta="Categoría" valor={control.categoria ?? '—'} />
            <Dato etiqueta="vs testigo" valor={control.diferenciaTestigo ?? '—'} />
          </div>
        </article>
      ))}
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="control-agua-dato">
      <span className="sutil">{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  )
}
