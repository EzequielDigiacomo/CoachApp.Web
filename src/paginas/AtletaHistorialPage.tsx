import {
  Badge,
  Block,
  BlockTitle,
  Button,
  Card,
  Chip,
  List,
  ListItem,
  Preloader,
} from 'konsta/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { anotacionesApi, contextoAnotacion, fechaNota } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { controlesApi } from '../api/controles'
import { asistenciaApi, atletasApi, etiquetaTipoTrabajo, etiquetaTurno, trabajosApi } from '../api/entrenamientos'
import { Modal } from '../componentes/Modal'
import { ModalAnotaciones } from '../componentes/ModalAnotaciones'
import { ModalGraficoTrabajo } from '../componentes/ModalGraficoTrabajo'
import { TarjetaTrabajo } from '../componentes/TarjetaTrabajo'
import { TextoConEnlaces } from '../componentes/TextoConEnlaces'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import { VistaControlAgua } from '../componentes/VistaControlAgua'
import { VistaControlGim } from '../componentes/VistaControlGim'
import { VistaControlTierra } from '../componentes/VistaControlTierra'
import type {
  AnotacionDto,
  AtletaDto,
  ControlDto,
  SesionHistorialDto,
  TipoTrabajo,
  TrabajoDto,
  Turno,
} from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'
import { fechaLarga, fechaNumerica } from '../util/fechas'

/** Una sesion del historial. Presente y ausente entran aunque no haya trabajos. */
interface GrupoSesion {
  entrenamientoId: number
  fecha: string | null
  turno: Turno | null
  sesion: number | null
  tipo: TipoTrabajo | null
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
  const [controlesGim, setControlesGim] = useState<ControlDto[]>([])
  const [controlesTierra, setControlesTierra] = useState<ControlDto[]>([])
  const [controlesAgua, setControlesAgua] = useState<ControlDto[]>([])
  const [asistencias, setAsistencias] = useState<SesionHistorialDto[]>([])
  const [notas, setNotas] = useState<AnotacionDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarNotas, setMostrarNotas] = useState(false)
  /** Sesion cuyas grillas se estan viendo. */
  const [sesionAbierta, setSesionAbierta] = useState<GrupoSesion | null>(null)
  /** Trabajo cuyo grafico de ppm y distancia se esta viendo. */
  const [trabajoParaGrafico, setTrabajoParaGrafico] = useState<TrabajoDto | null>(null)
  /** Trabajo cuyo grafico de velocidad se esta viendo. */
  const [trabajoParaVelocidad, setTrabajoParaVelocidad] = useState<TrabajoDto | null>(null)

  const cargar = useCallback(async () => {
    if (!Number.isInteger(atletaId) || atletaId <= 0) {
      setError('El atleta indicado no es válido.')
      setCargando(false)
      return
    }

    setCargando(true)
    setError(null)

    try {
      const [datosAtleta, historial, sesiones, anotaciones, gim, tierra, agua] = await Promise.all([
        atletasApi.obtener(atletaId),
        trabajosApi.historial(atletaId),
        asistenciaApi.historial(atletaId).catch(() => [] as SesionHistorialDto[]),
        anotacionesApi.listar({ atletaId }),
        controlesApi.listar({ atletaId, tipo: 'Gimnasio' }).catch(() => [] as ControlDto[]),
        controlesApi.listar({ atletaId, tipo: 'Tierra' }).catch(() => [] as ControlDto[]),
        controlesApi.listar({ atletaId, tipo: 'Agua' }).catch(() => [] as ControlDto[]),
      ])

      setAtleta(datosAtleta)
      setTrabajos(historial)
      setAsistencias(sesiones)
      setNotas(anotaciones)
      setControlesGim(gim)
      setControlesTierra(tierra)
      setControlesAgua(agua)
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
    <MarcoPagina
      titulo="Historial"
      atras="/atletas"
      right={
        <Button small rounded onClick={() => setMostrarNotas(true)}>
          Anotaciones
        </Button>
      }
    >
      {atleta && (
        <Block strong inset className="!mt-3">
          <div className="text-[20px] font-semibold">
            <NombreAtleta nombre={textoAtleta(atleta.apellido, atleta.nombre)} color={atleta.color} />
          </div>
          <p className="mt-1 text-[13px] opacity-60">
            DNI {atleta.dni} · {atleta.edad} años
            {atleta.club ? ` · ${atleta.club}` : ''}
            {!atleta.activo && ' · dado de baja'}
          </p>
          {(atleta.categorias ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(atleta.categorias ?? []).map((categoria) => (
                <Chip key={categoria} outline>
                  {categoria}
                </Chip>
              ))}
            </div>
          )}
        </Block>
      )}

      {error && (
        <Block>
          <p className="text-[13px] text-red-500">{error}</p>
        </Block>
      )}

      {!cargando && (
        <>
          <BlockTitle>Controles de gim</BlockTitle>
          <div className="px-4 pb-2">
            <VistaControlGim
              controles={controlesGim}
              vacio="Todavía no hay controles de gimnasio cargados para este atleta."
            />
          </div>
          <BlockTitle>Controles de tierra</BlockTitle>
          <div className="px-4 pb-2">
            <VistaControlTierra
              controles={controlesTierra}
              vacio="Todavía no hay controles de tierra cargados para este atleta."
            />
          </div>
          <BlockTitle>Controles de agua</BlockTitle>
          <div className="px-4 pb-2">
            <VistaControlAgua
              controles={controlesAgua}
              mostrarDiferenciaTestigo
              vacio="Todavía no hay controles de agua cargados para este atleta."
            />
          </div>
        </>
      )}

      {cargando ? (
        <Block className="flex items-center gap-3">
          <Preloader />
          <span className="text-[13px] opacity-60">Cargando…</span>
        </Block>
      ) : grupos.length === 0 ? (
        <Block>
          <p className="text-[13px] opacity-60">
            Este atleta todavía no tiene sesiones en el historial.
          </p>
        </Block>
      ) : (
        <>
          <BlockTitle>Resumen</BlockTitle>
          <div className="grid grid-cols-3 gap-2 px-4 sm:grid-cols-5">
            <Dato titulo="Trabajos" valor={resumen.total} />
            <Dato titulo="Sesiones" valor={`${resumen.presentes}/${resumen.marcadas}`} />
            <Dato titulo="Gimnasio" valor={resumen.gimnasio} />
            <Dato titulo="Tierra" valor={resumen.tierra} />
            <Dato titulo="Agua" valor={resumen.agua} />
          </div>

          <BlockTitle>Sesiones</BlockTitle>
          <List strong inset>
            {grupos.map((grupo) => (
              <ListItem
                key={grupo.entrenamientoId}
                link
                onClick={() => setSesionAbierta(grupo)}
                title={grupo.fecha ? fechaLarga(grupo.fecha) : 'Sesión'}
                subtitle={[
                  grupo.fecha ? fechaNumerica(grupo.fecha) : null,
                  grupo.turno ? etiquetaTurno(grupo.turno) : null,
                  grupo.sesion !== null ? `Sesión ${grupo.sesion}` : null,
                  grupo.tipo ? etiquetaTipoTrabajo(grupo.tipo) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                text={resumenTrabajos(grupo)}
                after={
                  grupo.asistio === true ? (
                    <Badge colors={{ bg: 'bg-green-500' }}>Presente</Badge>
                  ) : grupo.asistio === false ? (
                    <Badge colors={{ bg: 'bg-red-500' }}>Ausente</Badge>
                  ) : undefined
                }
              />
            ))}
          </List>
        </>
      )}

      {notasSueltas.length > 0 && (
        <>
          <BlockTitle>Anotaciones del atleta</BlockTitle>
          {notasSueltas.map((nota) => (
            <Card
              key={nota.id}
              header={
                nota.titulo ? (
                  <strong>
                    <TextoConEnlaces texto={nota.titulo} />
                  </strong>
                ) : undefined
              }
              footer={fechaNota(nota)}
            >
              {contextoAnotacion(nota).length > 1 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {contextoAnotacion(nota)
                    .slice(1)
                    .map((parte) => (
                      <Chip key={parte} outline>
                        {parte}
                      </Chip>
                    ))}
                </div>
              )}
              <p className="whitespace-pre-wrap">
                <TextoConEnlaces texto={nota.texto} />
              </p>
            </Card>
          ))}
        </>
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
          pausado={trabajoParaGrafico !== null || trabajoParaVelocidad !== null}
          onCerrar={() => {
            setSesionAbierta(null)
            setTrabajoParaGrafico(null)
            setTrabajoParaVelocidad(null)
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
                onVelocidad={() => setTrabajoParaVelocidad(trabajo)}
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
          subtitulo={
            <NombreAtleta
              nombre={textoAtleta(atleta.apellido, atleta.nombre)}
              color={atleta.color}
            />
          }
          contexto={{ atletaId }}
          onCerrar={() => setMostrarNotas(false)}
          onCambio={() => void cargar()}
        />
      )}

      {trabajoParaVelocidad && (
        <ModalGraficoTrabajo
          trabajo={trabajoParaVelocidad}
          modo="velocidad"
          apilado={sesionAbierta !== null}
          onCerrar={() => setTrabajoParaVelocidad(null)}
        />
      )}

      {trabajoParaGrafico && (
        <ModalGraficoTrabajo
          trabajo={trabajoParaGrafico}
          apilado={sesionAbierta !== null}
          onCerrar={() => setTrabajoParaGrafico(null)}
        />
      )}
    </MarcoPagina>
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
      tipo: asistencia.tipo ?? null,
      asistio: asistencia.asistio,
      trabajos: [],
    })
  }

  for (const trabajo of trabajos) {
    const grupo = mapa.get(trabajo.entrenamientoId)
    if (grupo) {
      grupo.trabajos.push(trabajo)
      if (!grupo.tipo) {
        grupo.tipo = trabajo.tipo
      }
      continue
    }

    mapa.set(trabajo.entrenamientoId, {
      entrenamientoId: trabajo.entrenamientoId,
      fecha: trabajo.entrenamientoFecha,
      turno: trabajo.entrenamientoTurno,
      sesion: trabajo.entrenamientoSesion,
      tipo: trabajo.tipo,
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
    <Card className="!m-0" contentWrapPadding="p-2">
      <div className="text-center">
        <div className="text-[20px] font-semibold">{valor}</div>
        <div className="text-[12px] opacity-60">{titulo}</div>
      </div>
    </Card>
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
