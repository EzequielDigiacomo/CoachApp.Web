import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { anotacionesApi, contextoAnotacion, fechaNota } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { atletasApi, etiquetaTipoTrabajo, etiquetaTurno, trabajosApi } from '../api/entrenamientos'
import { Modal } from '../componentes/Modal'
import { ModalAnotaciones } from '../componentes/ModalAnotaciones'
import { ModalGraficoTrabajo } from '../componentes/ModalGraficoTrabajo'
import { TarjetaTrabajo } from '../componentes/TarjetaTrabajo'
import { TextoConEnlaces } from '../componentes/TextoConEnlaces'
import type { AnotacionDto, AtletaDto, TrabajoDto, Turno } from '../tipos/api'
import { fechaLarga, fechaNumerica } from '../util/fechas'

/** Una sesion con todos los trabajos que hizo el atleta ese dia. */
interface GrupoSesion {
  entrenamientoId: number
  fecha: string | null
  turno: Turno | null
  sesion: number | null
  trabajos: TrabajoDto[]
}

/**
 * Historial de un atleta: sus trabajos en todas las sesiones, de lo mas nuevo
 * a lo mas viejo, con las anotaciones que tenga escritas en cada uno.
 */
export function AtletaHistorialPage() {
  const { id } = useParams()
  const atletaId = Number(id)

  const [atleta, setAtleta] = useState<AtletaDto | null>(null)
  const [trabajos, setTrabajos] = useState<TrabajoDto[]>([])
  const [notas, setNotas] = useState<AnotacionDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarNotas, setMostrarNotas] = useState(false)
  /** Sesion cuyas grillas se estan viendo. */
  const [sesionAbierta, setSesionAbierta] = useState<GrupoSesion | null>(null)
  /** Trabajo cuyo grafico de ppm y distancia se esta viendo. */
  const [trabajoParaGrafico, setTrabajoParaGrafico] = useState<TrabajoDto | null>(null)

  const cargar = useCallback(async () => {
    if (!Number.isInteger(atletaId) || atletaId <= 0) {
      setError('El atleta indicado no es válido.')
      setCargando(false)
      return
    }

    setCargando(true)
    setError(null)

    try {
      const [datosAtleta, historial, anotaciones] = await Promise.all([
        atletasApi.obtener(atletaId),
        trabajosApi.historial(atletaId),
        anotacionesApi.listar({ atletaId }),
      ])

      setAtleta(datosAtleta)
      setTrabajos(historial)
      setNotas(anotaciones)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el historial.')
    } finally {
      setCargando(false)
    }
  }, [atletaId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // El backend devuelve los trabajos del mas nuevo al mas viejo, asi que las
  // sesiones quedan contiguas y en orden: se agrupan de una sola pasada.
  const grupos = useMemo(() => {
    const armados: GrupoSesion[] = []

    for (const trabajo of trabajos) {
      const ultimo = armados[armados.length - 1]

      if (ultimo && ultimo.entrenamientoId === trabajo.entrenamientoId) {
        ultimo.trabajos.push(trabajo)
      } else {
        armados.push({
          entrenamientoId: trabajo.entrenamientoId,
          fecha: trabajo.entrenamientoFecha,
          turno: trabajo.entrenamientoTurno,
          sesion: trabajo.entrenamientoSesion,
          trabajos: [trabajo],
        })
      }
    }

    return armados
  }, [trabajos])

  /** Las notas que cuelgan de cada trabajo, para mostrarlas dentro de su tarjeta. */
  const notasPorTrabajo = useMemo(() => {
    const mapa = new Map<number, AnotacionDto[]>()

    for (const nota of notas) {
      if (nota.trabajoId === null) {
        continue
      }

      const lista = mapa.get(nota.trabajoId) ?? []
      lista.push(nota)
      mapa.set(nota.trabajoId, lista)
    }

    return mapa
  }, [notas])

  /** Las notas que no cuelgan de un trabajo: del atleta o de una sesion. */
  const notasSueltas = useMemo(() => notas.filter((nota) => nota.trabajoId === null), [notas])

  const resumen = useMemo(() => {
    const contar = (tipo: TrabajoDto['tipo']) => trabajos.filter((t) => t.tipo === tipo).length

    return {
      total: trabajos.length,
      sesiones: grupos.length,
      gimnasio: contar('Gimnasio'),
      tierra: contar('Tierra'),
      agua: contar('Agua'),
    }
  }, [trabajos, grupos])

  return (
    <div className="pagina">
      <Link className="volver" to="/atletas">
        ← Volver a atletas
      </Link>

      <div className="encabezado">
        <div>
          <h2>
            {atleta ? `${atleta.apellido}, ${atleta.nombre}` : 'Historial'}
            {(atleta?.categorias ?? []).map((categoria) => (
              <span className="etiqueta" key={categoria}>
                {categoria}
              </span>
            ))}
          </h2>
          {atleta && (
            <p className="sutil">
              DNI {atleta.dni} · {atleta.edad} años
              {atleta.club ? ` · ${atleta.club}` : ''}
              {!atleta.activo && ' · dado de baja'}
            </p>
          )}
        </div>

        <button type="button" className="boton" onClick={() => setMostrarNotas(true)}>
          Anotaciones
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : trabajos.length === 0 ? (
        <p className="sutil">Este atleta todavía no tiene trabajos cargados.</p>
      ) : (
        <>
          <div className="resumen">
            <Dato titulo="Trabajos" valor={resumen.total} />
            <Dato titulo="Sesiones" valor={resumen.sesiones} />
            <Dato titulo="Gimnasio" valor={resumen.gimnasio} />
            <Dato titulo="Tierra" valor={resumen.tierra} />
            <Dato titulo="Agua" valor={resumen.agua} />
          </div>

          <div className="sesiones">
            {grupos.map((grupo) => (
              <button
                type="button"
                className="tarjeta sesion"
                key={grupo.entrenamientoId}
                onClick={() => setSesionAbierta(grupo)}
              >
                <div>
                  <p className="sesion-fecha">
                    {grupo.fecha ? fechaLarga(grupo.fecha) : 'Sesión'}
                  </p>
                  <p className="sutil">
                    {grupo.fecha && fechaNumerica(grupo.fecha)}
                    {grupo.turno && ` · ${etiquetaTurno(grupo.turno)}`}
                    {grupo.sesion !== null && ` · Sesión ${grupo.sesion}`}
                  </p>
                </div>
                <span className="sutil">{resumenTrabajos(grupo)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {notasSueltas.length > 0 && (
        <section>
          <h3 className="titulo-dia">Anotaciones del atleta</h3>
          <ul className="notas-lista ancho">
            {notasSueltas.map((nota) => (
              <li className="nota" key={nota.id}>
                <div className="nota-cabecera">
                  {nota.titulo && (
                  <strong>
                    <TextoConEnlaces texto={nota.titulo} />
                  </strong>
                )}
                  <span className="sutil">{fechaNota(nota)}</span>
                </div>

                {contextoAnotacion(nota).length > 1 && (
                  <p className="contexto">
                    {contextoAnotacion(nota)
                      .slice(1)
                      .map((parte) => (
                        <span className="etiqueta-contexto" key={parte}>
                          {parte}
                        </span>
                      ))}
                  </p>
                )}

                <p className="nota-texto">
                  <TextoConEnlaces texto={nota.texto} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sesionAbierta && (
        <Modal
          titulo={sesionAbierta.fecha ? fechaLarga(sesionAbierta.fecha) : 'Sesión'}
          subtitulo={[
            sesionAbierta.fecha ? fechaNumerica(sesionAbierta.fecha) : null,
            sesionAbierta.turno ? etiquetaTurno(sesionAbierta.turno) : null,
            sesionAbierta.sesion !== null ? `Sesión ${sesionAbierta.sesion}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          ancho="grande"
          pausado={trabajoParaGrafico !== null}
          onCerrar={() => {
            setSesionAbierta(null)
            setTrabajoParaGrafico(null)
          }}
        >
          <div className="trabajos">
            {sesionAbierta.trabajos.map((trabajo) => (
              <TarjetaTrabajo
                trabajo={trabajo}
                key={trabajo.id}
                onGrafico={() => setTrabajoParaGrafico(trabajo)}
              >
                <NotasDelTrabajo notas={notasPorTrabajo.get(trabajo.id) ?? []} />
              </TarjetaTrabajo>
            ))}
          </div>
          <p className="sutil sesion-ir">
            <Link to={`/entrenamientos/${sesionAbierta.entrenamientoId}`}>Abrir la sesión</Link>
          </p>
        </Modal>
      )}

      {mostrarNotas && atleta && (
        <ModalAnotaciones
          titulo="Anotaciones del atleta"
          subtitulo={`${atleta.apellido}, ${atleta.nombre}`}
          contexto={{ atletaId }}
          onCerrar={() => setMostrarNotas(false)}
          onCambio={() => void cargar()}
        />
      )}

      {trabajoParaGrafico && (
        <ModalGraficoTrabajo
          trabajo={trabajoParaGrafico}
          apilado={sesionAbierta !== null}
          onCerrar={() => setTrabajoParaGrafico(null)}
        />
      )}
    </div>
  )
}

function resumenTrabajos(grupo: GrupoSesion): string {
  const cantidad = grupo.trabajos.length
  const partes = [`${cantidad} ${cantidad === 1 ? 'trabajo' : 'trabajos'}`]

  for (const tipo of ['Agua', 'Tierra', 'Gimnasio'] as const) {
    const delTipo = grupo.trabajos.filter((trabajo) => trabajo.tipo === tipo).length
    if (delTipo > 0) {
      partes.push(`${delTipo} ${etiquetaTipoTrabajo(tipo).toLowerCase()}`)
    }
  }

  return partes.join(' · ')
}

function Dato({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="dato">
      <span className="dato-valor">{valor}</span>
      <span className="sutil">{titulo}</span>
    </div>
  )
}

/** Las notas que se escribieron sobre un trabajo, dentro de su tarjeta. */
function NotasDelTrabajo({ notas }: { notas: AnotacionDto[] }) {
  if (notas.length === 0) {
    return null
  }

  return (
    <div className="notas-trabajo">
      <h6 className="titulo-seccion">
        {notas.length === 1 ? 'Anotación' : `Anotaciones (${notas.length})`}
      </h6>

      <ul className="notas-lista">
        {notas.map((nota) => (
          <li className="nota chica" key={nota.id}>
            <div className="nota-cabecera">
              {nota.titulo && (
                <strong>
                  <TextoConEnlaces texto={nota.titulo} />
                </strong>
              )}
              <span className="sutil">{fechaNota(nota)}</span>
            </div>
            <p className="nota-texto">
              <TextoConEnlaces texto={nota.texto} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
