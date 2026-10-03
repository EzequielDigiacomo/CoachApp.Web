import { esTrabajoDeAgua, esTrabajoDeGimnasio, etiquetaTipoTrabajo } from '../api/entrenamientos'
import type { PaladaDto, TrabajoDto } from '../tipos/api'

interface Props {
  trabajo: TrabajoDto
  /** Botones de la cabecera: editar, eliminar, anotaciones. */
  acciones?: React.ReactNode
  /**
   * Si viene, se muestra el boton que abre el grafico de ppm y distancia.
   * Los padres lo manejan asi cada uno decide donde vive su modal.
   */
  onGrafico?: () => void
  /** Contenido extra al pie de la tarjeta, como las notas del historial. */
  children?: React.ReactNode
}

/**
 * Un trabajo con su detalle: tabla de parciales para tierra y agua, o los
 * ejercicios con sus series para gimnasio. La usan el modal de trabajos y el
 * historial del atleta, asi el detalle se ve igual en los dos lados.
 */
export function TarjetaTrabajo({ trabajo, acciones, onGrafico, children }: Props) {
  const gimnasio = esTrabajoDeGimnasio(trabajo.tipo)

  // Las paladas son propias del agua: en tierra la tabla se queda con sus
  // cuatro columnas de siempre y no se muestra una columna vacia.
  const agua = esTrabajoDeAgua(trabajo.tipo)

  // El grafico es de ppm, y las ppm son propias del agua: sin muestras no hay
  // nada que dibujar, asi que el boton solo aparece cuando hay al menos una.
  const puedeGraficar = onGrafico !== undefined && agua && trabajo.paladas.length > 0

  const totalSeries = trabajo.ejercicios.reduce((suma, e) => suma + e.series.length, 0)
  const ultimo = trabajo.parciales[trabajo.parciales.length - 1]

  return (
    <article className="trabajo">
      <header className="trabajo-cabecera">
        <span className={`etiqueta-tipo tipo-${trabajo.tipo.toLowerCase()}`}>
          {etiquetaTipoTrabajo(trabajo.tipo)}
        </span>
        <strong>{trabajo.horaInicio ? `${trabajo.horaInicio} h` : 'Sin hora'}</strong>

        {gimnasio ? (
          <span className="sutil">
            {trabajo.ejercicios.length} {trabajo.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}
            {' · '}
            {totalSeries} {totalSeries === 1 ? 'serie' : 'series'}
          </span>
        ) : (
          <>
            <span className="sutil">
              {trabajo.parciales.length} {trabajo.parciales.length === 1 ? 'parcial' : 'parciales'}
            </span>
            {ultimo && (
              <span className="sutil">
                · última marca {ultimo.distanciaMetros} m en {ultimo.tiempo}
              </span>
            )}
          </>
        )}

        {(acciones || puedeGraficar) && (
          <div className="trabajo-acciones">
            {puedeGraficar && (
              <button
                type="button"
                className="boton-fantasma"
                onClick={onGrafico}
                title="Ver ppm y distancia a lo largo del tiempo"
              >
                Gráfico
              </button>
            )}
            {acciones}
          </div>
        )}
      </header>

      {trabajo.observaciones && <p className="sutil">{trabajo.observaciones}</p>}

      {gimnasio ? (
        <div className="ejercicios">
          {trabajo.ejercicios.map((ejercicio) => (
            <section className="ejercicio" key={ejercicio.id}>
              <h5 className="ejercicio-titulo">
                <span className="parcial-numero">{ejercicio.orden}</span>
                {ejercicio.nombre}
              </h5>
              <div className="tabla-scroll">
                <table className="tabla tabla-series">
                  <thead>
                    <tr>
                      <th title="Orden de la serie">#</th>
                      <th>Reps</th>
                      <th>%</th>
                      <th>Kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ejercicio.series.map((serie) => (
                      <tr key={serie.id}>
                        <td className="mono sutil">{serie.orden}</td>
                        <td className="mono">{serie.repeticiones}</td>
                        <td className="mono">{serie.porcentaje ?? '—'}</td>
                        <td className="mono">{serie.pesoKg ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="tabla-scroll">
          <table className={`tabla tabla-parciales${agua ? ' con-paladas' : ''}`}>
            <thead>
              <tr>
                <th title="Orden en que se tomó con el cronómetro">#</th>
                <th>Distancia</th>
                {agua && <th title="Paladas por minuto tomadas en ese tramo">Ppm</th>}
                <th>Tiempo</th>
                <th title="Diferencia con el parcial anterior">Dif.</th>
              </tr>
            </thead>
            <tbody>
              {trabajo.parciales.map((parcial) => (
                <tr key={parcial.id}>
                  <td className="mono">{parcial.orden}</td>
                  <td>{parcial.distanciaMetros} m</td>
                  {agua && (
                    <td className="celda-paladas">
                      <Paladas paladas={parcial.paladas} />
                    </td>
                  )}
                  <td className="mono">{parcial.tiempo}</td>
                  <td className="mono sutil">{parcial.parcial ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {children}
    </article>
  )
}

/**
 * Las muestras de ppm que cayeron en este parcial, cada una con el momento en
 * que se tomó. Puede haber varias en un mismo tramo, asi que se apilan.
 */
function Paladas({ paladas }: { paladas: PaladaDto[] }) {
  if (paladas.length === 0) {
    return <span className="sutil">—</span>
  }

  return (
    <span className="paladas">
      {paladas.map((palada) => (
        <span className="palada" key={palada.id}>
          <strong className="mono">{palada.ppm}</strong>
          <small className="sutil">{palada.tiempo}</small>
        </span>
      ))}
    </span>
  )
}
