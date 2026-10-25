import { useMemo, useState } from 'react'
import type {
  ActividadPreviewGarminDto,
  AtletaPreviewGarminDto,
  ImportarGarminRequest,
  PreviewGarminDto,
} from '../tipos/api'
import { NombreAtleta, textoAtleta } from './NombreAtleta'
import { Modal } from './Modal'

interface Props {
  preview: PreviewGarminDto
  ocupado: boolean
  onCerrar: () => void
  onConfirmar: (pedido: ImportarGarminRequest) => void
}

type Seleccion = Record<number, Record<number, Set<number>>>

function seleccionInicial(atletas: AtletaPreviewGarminDto[]): Seleccion {
  const sel: Seleccion = {}

  for (const atleta of atletas) {
    sel[atleta.atletaId] = {}
    const coinciden = atleta.actividades.filter((a) => a.coincideTipoSesion)
    const base = coinciden.length > 0 ? coinciden : atleta.actividades.slice(0, 1)

    for (const act of base) {
      sel[atleta.atletaId][act.actividadId] = new Set(act.tramos.map((t) => t.indice))
    }
  }

  return sel
}

/** Elige qué actividades y series de Garmin guardar en la sesión. */
export function ModalImportarGarmin({ preview, ocupado, onCerrar, onConfirmar }: Props) {
  const [seleccion, setSeleccion] = useState<Seleccion>(() => seleccionInicial(preview.atletas))

  const resumen = useMemo(() => {
    let actividades = 0
    let series = 0
    for (const porAct of Object.values(seleccion)) {
      for (const indices of Object.values(porAct)) {
        if (indices.size > 0) {
          actividades += 1
          series += indices.size
        }
      }
    }
    return { actividades, series }
  }, [seleccion])

  function toggleActividad(atletaId: number, actividad: ActividadPreviewGarminDto) {
    setSeleccion((prev) => {
      const delAtleta = { ...(prev[atletaId] ?? {}) }
      if (delAtleta[actividad.actividadId]?.size) {
        delete delAtleta[actividad.actividadId]
      } else {
        delAtleta[actividad.actividadId] = new Set(actividad.tramos.map((t) => t.indice))
      }
      return { ...prev, [atletaId]: delAtleta }
    })
  }

  function toggleTramo(atletaId: number, actividadId: number, indice: number, totalTramos: number[]) {
    setSeleccion((prev) => {
      const delAtleta = { ...(prev[atletaId] ?? {}) }
      const actual = new Set(delAtleta[actividadId] ?? [])
      if (actual.has(indice)) {
        actual.delete(indice)
      } else {
        actual.add(indice)
      }

      if (actual.size === 0) {
        delete delAtleta[actividadId]
      } else {
        // Si no habia actividad marcada y solo se tildo un tramo, arranca con ese.
        if (!delAtleta[actividadId] && actual.size === 1 && totalTramos.length > 0) {
          delAtleta[actividadId] = actual
        } else {
          delAtleta[actividadId] = actual
        }
      }

      return { ...prev, [atletaId]: delAtleta }
    })
  }

  function armarPedido(): ImportarGarminRequest {
    return {
      atletas: preview.atletas
        .map((atleta) => {
          const porAct = seleccion[atleta.atletaId] ?? {}
          const actividades = Object.entries(porAct)
            .filter(([, indices]) => indices.size > 0)
            .map(([actividadId, indices]) => ({
              actividadId: Number(actividadId),
              indicesTramos: [...indices].sort((a, b) => a - b),
            }))
          return { atletaId: atleta.atletaId, actividades }
        })
        .filter((a) => a.actividades.length > 0),
    }
  }

  return (
    <Modal
      titulo="Importar de Garmin"
      subtitulo="Elegí las actividades y series a guardar."
      ancho="grande"
      onCerrar={onCerrar}
    >
      {preview.avisos.length > 0 && (
        <ul className="garmin-avisos">
          {preview.avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      )}

      <div className="garmin-importar">
        {preview.atletas.map((atleta) => (
          <section className="tarjeta garmin-atleta" key={atleta.atletaId}>
            <h4>
              <NombreAtleta
                nombre={textoAtleta(atleta.apellido, atleta.nombre)}
              />
            </h4>

            {atleta.actividades.map((actividad) => {
              const indices = seleccion[atleta.atletaId]?.[actividad.actividadId]
              const marcada = Boolean(indices && indices.size > 0)

              return (
                <div className="garmin-actividad" key={actividad.actividadId}>
                  <label className="garmin-actividad-cabecera">
                    <input
                      type="checkbox"
                      checked={marcada}
                      disabled={ocupado}
                      onChange={() => toggleActividad(atleta.atletaId, actividad)}
                    />
                    <span>
                      <strong>{actividad.nombre}</strong>
                      <span className="sutil">
                        {' '}
                        · {[actividad.tipo, actividad.inicio, textoDistancia(actividad.distanciaMetros)]
                          .filter(Boolean)
                          .join(' · ')}
                        {actividad.coincideTipoSesion ? ' · tipo de sesión' : ''}
                      </span>
                    </span>
                  </label>

                  {actividad.tramos.length > 0 && (
                    <ul className="garmin-tramos">
                      {actividad.tramos.map((tramo) => (
                        <li key={tramo.indice}>
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(indices?.has(tramo.indice))}
                              disabled={ocupado}
                              onChange={() =>
                                toggleTramo(
                                  atleta.atletaId,
                                  actividad.actividadId,
                                  tramo.indice,
                                  actividad.tramos.map((t) => t.indice),
                                )
                              }
                            />
                            <span>
                              Serie {tramo.indice + 1}: {tramo.metros.toLocaleString('es-AR')} m ·{' '}
                              {tramo.tiempo}
                              {tramo.ppm != null ? ` · ${tramo.ppm} ppm` : ''}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </div>

      <div className="form-acciones">
        <button type="button" className="boton-fantasma" disabled={ocupado} onClick={onCerrar}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton"
          disabled={ocupado || resumen.actividades === 0}
          onClick={() => onConfirmar(armarPedido())}
        >
          {ocupado
            ? 'Importando…'
            : `Guardar ${resumen.actividades} ${resumen.actividades === 1 ? 'actividad' : 'actividades'} (${resumen.series} ${resumen.series === 1 ? 'serie' : 'series'})`}
        </button>
      </div>
    </Modal>
  )
}

function textoDistancia(metros: number | null): string | null {
  if (metros == null) {
    return null
  }
  return `${Math.round(metros).toLocaleString('es-AR')} m`
}

/** Arma el pedido de import automatico cuando no hace falta elegir. */
export function pedidoAutoImport(preview: PreviewGarminDto): ImportarGarminRequest {
  return {
    atletas: preview.atletas.map((atleta) => {
      const coinciden = atleta.actividades.filter((a) => a.coincideTipoSesion)
      const elegidas = coinciden.length > 0 ? coinciden : atleta.actividades.slice(0, 1)
      return {
        atletaId: atleta.atletaId,
        actividades: elegidas.map((a) => ({
          actividadId: a.actividadId,
          indicesTramos: a.tramos.map((t) => t.indice),
        })),
      }
    }),
  }
}
