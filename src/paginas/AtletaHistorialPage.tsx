import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { anotacionesApi, contextoAnotacion, fechaNota } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { asistenciaApi, atletasApi, etiquetaTipoTrabajo, etiquetaTurno, trabajosApi } from '../api/entrenamientos'
import { Modal } from '../componentes/Modal'
import { ModalAnotaciones } from '../componentes/ModalAnotaciones'
import { ModalGraficoTrabajo } from '../componentes/ModalGraficoTrabajo'
import { TarjetaTrabajo } from '../componentes/TarjetaTrabajo'
import { TextoConEnlaces } from '../componentes/TextoConEnlaces'
import type { AnotacionDto, AtletaDto, SesionHistorialDto, TrabajoDto, Turno } from '../tipos/api'
import { fechaLarga, fechaNumerica } from '../util/fechas'

/** Una sesion del historial. Presente y ausente entran aunque no haya trabajos. */
interface GrupoSesion {
  entrenamientoId: number
  fecha: string | null
  turno: Turno | null
  sesion: number | null
  /** null si la asistencia no se marco y la sesion entro por sus trabajos. */
  asistio: boolean | null
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
  const [asistencias, setAsistencias] = useState<SesionHistorialDto[]>([])
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
      const [datosAtleta, historial, sesiones, anotaciones] = await Promise.all([
        atletasApi.obtener(atletaId),
        trabajosApi.historial(atletaId),
        asistenciaApi.historial(atletaId).catch(() => [] as SesionHistorialDto[]),
        anotacionesApi.listar({ atletaId }),
      ])

      setAtleta(datosAtleta)
      setTrabajos(historial)
      setAsistencias(sesiones)
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

  const grupos = useMemo(() => armarGrupos(asistencias, trabajos), [asistencias, trabajos])

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

    const presentes = grupos.filter((grupo) => grupo.asistio === true).length
    const marcadas = grupos.filter((grupo) => grupo.asistio !== null).length

    return {
      total: trabajos.length,
      presentes,
      marcadas,
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
      ) : grupos.length === 0 ? (
        <p className="sutil">Este atleta todavía no tiene sesiones en el historial.</p>
      ) : (
        <>
          <div className="resumen">
            <Dato titulo="Trabajos" valor={resumen.total} />
            <Dato titulo="Sesiones" valor={`${resumen.presentes}/${resumen.marcadas}`} />
            <Dato titulo="Gimnasio" valor={resumen.gimnasio} />
            <Dato titulo="Tierra" valor={resumen.tierra} />
            <Dato titulo="Agua" valor={resumen.agua} />
          </div>

          <div className="sesiones">
            {grupos.map((grupo) => (
              <button
                type="button"
                className={`tarjeta sesion${grupo.asistio === false ? ' ausente' : ''}`}
                key={grupo.entrenamientoId}
                onClick={() => setSesionAbierta(grupo)}
              >
                <div>
                  <p className="sesion-fecha">
                    {grupo.fecha ? fechaLarga(grupo.fecha) : 'Sesión'}
                    {grupo.asistio === true && <span className="etiqueta presente">Presente</span>}
                    {grupo.asistio === false && <span className="etiqueta ausente">Ausente</span>}
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
            {sesionAbierta.trabajos.length === 0 && (
              <p className="sutil">No hay trabajos cargados en esta sesión.</p>
            )}
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

function armarGrupos(asistencias: SesionHistorialDto[], trabajos: TrabajoDto[]): GrupoSesion[] {
  const mapa = new Map<number, GrupoSesion>()

  for (const asistencia of asistencias) {
    mapa.set(asistencia.entrenamientoId, {
      entrenamientoId: asistencia.entrenamientoId,
      fecha: asistencia.fecha,
      turno: asistencia.turno,
      sesion: asistencia.sesion,
      asistio: asistencia.asistio,
      trabajos: [],
    })
  }

  for (const trabajo of trabajos) {
    const grupo = mapa.get(trabajo.entrenamientoId)
    if (grupo) {
      grupo.trabajos.push(trabajo)
      continue
    }

    mapa.set(trabajo.entrenamientoId, {
      entrenamientoId: trabajo.entrenamientoId,
      fecha: trabajo.entrenamientoFecha,
      turno: trabajo.entrenamientoTurno,
      sesion: trabajo.entrenamientoSesion,
      asistio: null,
      trabajos: [trabajo],
    })
  }

  return [...mapa.values()].sort(compararSesiones)
}

function compararSesiones(a: GrupoSesion, b: GrupoSesion): number {
  const fecha = (b.fecha ?? '').localeCompare(a.fecha ?? '')
  if (fecha !== 0) {
    return fecha
  }

  const turno = Number(b.turno === 'Tarde') - Number(a.turno === 'Tarde')
  if (turno !== 0) {
    return turno
  }

  return (b.sesion ?? 0) - (a.sesion ?? 0)
}

function resumenTrabajos(grupo: GrupoSesion): string {
  const cantidad = grupo.trabajos.length
  if (cantidad === 0) {
    return grupo.asistio === false ? 'Ausente' : 'Sin trabajos'
  }
  const partes = [`${cantidad} ${cantidad === 1 ? 'trabajo' : 'trabajos'}`]

  for (const tipo of ['Agua', 'Tierra', 'Gimnasio'] as const) {
    const delTipo = grupo.trabajos.filter((trabajo) => trabajo.tipo === tipo).length
    if (delTipo > 0) {
      partes.push(`${delTipo} ${etiquetaTipoTrabajo(tipo).toLowerCase()}`)
    }
  }

  return partes.join(' · ')
}

function Dato({ titulo, valor }: { titulo: string; valor: number | string }) {
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
