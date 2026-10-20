import type { ControlDto, ControlEjercicioDto } from '../tipos/api'
import { fechaLarga, fechaNumerica } from '../util/fechas'
import { grillaPorcentajes, textoKilos } from '../util/rm'

/** Lectura de controles de gim: series cargadas y grilla % del 1RM. */
export function VistaControlGim({
  controles,
  vacio = 'Todavía no hay controles de gimnasio.',
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
            {control.atletaNombre && <span className="sutil">{control.atletaNombre}</span>}
          </header>

          {control.observaciones && <p className="sutil">{control.observaciones}</p>}

          <div className="control-ejercicios">
            {control.ejercicios.map((ejercicio) => (
              <EjercicioVista key={ejercicio.id} ejercicio={ejercicio} />
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function EjercicioVista({ ejercicio }: { ejercicio: ControlEjercicioDto }) {
  const unoRm = ejercicio.series.find((s) => s.esUnoRm)?.pesoKg
  const grilla = unoRm != null ? grillaPorcentajes(unoRm) : []

  return (
    <div className="control-ejercicio">
      <h4>{ejercicio.nombre}</h4>

      <ul className="control-series">
        {ejercicio.series.map((serie) => (
          <li key={serie.id}>
            <span>
              {textoKilos(serie.pesoKg)} kg × {serie.repeticiones}
            </span>
            {serie.esUnoRm && <span className="etiqueta">1RM</span>}
          </li>
        ))}
      </ul>

      {grilla.length > 0 && (
        <div className="grilla-rm" aria-label={`Porcentajes de ${ejercicio.nombre}`}>
          {grilla.map((fila) => (
            <div className="grilla-rm-celda" key={fila.porcentaje}>
              <span className="grilla-rm-pct">{fila.porcentaje}%</span>
              <span className="grilla-rm-kg">{textoKilos(fila.kilos)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
