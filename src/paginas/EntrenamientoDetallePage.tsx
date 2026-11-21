import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Block,
  BlockTitle,
  Button,
  Checkbox,
  Chip,
  List,
  ListInput,
  ListItem,
  Preloader,
} from 'konsta/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { anotacionesApi } from '../api/anotaciones'
import { mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { atletasApi, entrenamientosApi, etiquetaTipoTrabajo, etiquetaTurno } from '../api/entrenamientos'
import { garminApi } from '../api/garmin'
import { equiposApi } from '../api/equipos'
import { confirmar } from '../componentes/Confirmacion'
import { ModalAnotaciones } from '../componentes/ModalAnotaciones'
import { ModalCargaEquipo } from '../componentes/ModalCargaEquipo'
import { ModalCargaMultiple } from '../componentes/ModalCargaMultiple'
import { ModalEditarSesion } from '../componentes/ModalEditarSesion'
import { ModalTrabajos } from '../componentes/ModalTrabajos'
import { ModalTrabajosEquipo } from '../componentes/ModalTrabajosEquipo'
import { ModalImportarGarmin } from '../componentes/ModalImportarGarmin'
import { ModalVincularGarmin } from '../componentes/ModalVincularGarmin'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import { TextoConEnlaces } from '../componentes/TextoConEnlaces'
import { useAuth } from '../auth/contextoAuth'
import { esStaff } from '../tipos/api'
import type {
  ActividadGarminDto,
  AtletaEnEntrenamientoDto,
  EntrenamientoDto,
  EquipoEnEntrenamientoDto,
  EstadoGarminDto,
  ImportarGarminRequest,
  PreviewGarminDto,
  ResumenTrabajoDto,
} from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'
import { fechaLarga, fechaNumerica } from '../util/fechas'

/** Cuantos atletas entran como maximo en una carga multiple. */
const MAXIMO_SELECCION = 5

export function EntrenamientoDetallePage() {
  const { id } = useParams()
  const navegar = useNavigate()
  const consultas = useQueryClient()
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const entrenamientoId = Number(id)
  const claveSesion = clavesConsulta.entrenamiento(entrenamientoId)
  const idValido = Number.isInteger(entrenamientoId) && entrenamientoId > 0

  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [buscando, setBuscando] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(false)

  /** Seleccion de atletas para la carga multiple: casillas en la tabla. */
  const [seleccionando, setSeleccionando] = useState(false)
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [cargaMultiple, setCargaMultiple] = useState(false)
  const [cargaEquipo, setCargaEquipo] = useState(false)
  const [editandoSesion, setEditandoSesion] = useState(false)

  /** Atleta cuyos trabajos se estan viendo en el modal. */
  const [enTrabajos, setEnTrabajos] = useState<AtletaEnEntrenamientoDto | null>(null)
  const [enTrabajosEquipo, setEnTrabajosEquipo] = useState<EquipoEnEntrenamientoDto | null>(null)
  const [vinculando, setVinculando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [avisosGarmin, setAvisosGarmin] = useState<string[]>([])
  const [previewGarmin, setPreviewGarmin] = useState<PreviewGarminDto | null>(null)
  const [importandoGarmin, setImportandoGarmin] = useState(false)
  const [anotando, setAnotando] = useState(false)
  /**
   * Cada toque de asistencia lleva un numero. Si la respuesta de uno viejo
   * llega despues, se descarta: la pantalla ya muestra el toque mas nuevo.
   */
  const marcaPendiente = useRef(new Map<number, number>())
  /** Atletas cuya marca se pinto y todavia no volvio de la API. */
  const marcasEnVuelo = useRef(new Set<number>())

  const sesionQuery = useQuery({
    queryKey: claveSesion,
    queryFn: ({ signal }) => entrenamientosApi.obtener(entrenamientoId, { signal }),
    enabled: idValido,
  })

  const catalogoQuery = useQuery({
    queryKey: clavesConsulta.atletas('', false),
    queryFn: ({ signal }) => atletasApi.listar(undefined, { signal }),
    enabled: staff && idValido,
  })

  const notasQuery = useQuery({
    queryKey: clavesConsulta.anotacionesSesion(entrenamientoId),
    queryFn: async ({ signal }) => {
      const notas = await anotacionesApi.listar({ entrenamientoId }, { signal })
      return notas.filter((nota) => nota.trabajoId == null)
    },
    enabled: staff && idValido,
  })

  const garminQuery = useQuery({
    queryKey: clavesConsulta.garminEstado,
    queryFn: ({ signal }) => garminApi.estado({ signal }),
    enabled: staff,
    retry: false,
  })

  const entrenamiento = sesionQuery.data ?? null
  const catalogo = catalogoQuery.data ?? []
  const notasSesion = notasQuery.data ?? []
  const garmin = garminQuery.data ?? null
  const cargando = sesionQuery.isPending
  const error =
    errorAccion ??
    (sesionQuery.isError
      ? mensajeApi(sesionQuery.error, 'No se pudo cargar la sesión.')
      : null)

  function setEntrenamiento(
    updater: EntrenamientoDto | null | ((actual: EntrenamientoDto | null) => EntrenamientoDto | null),
  ) {
    consultas.setQueryData<EntrenamientoDto>(claveSesion, (actual) => {
      const previo = actual ?? null
      const siguiente = typeof updater === 'function' ? updater(previo) : updater
      return siguiente ?? undefined
    })
  }

  function setGarmin(estado: EstadoGarminDto) {
    consultas.setQueryData(clavesConsulta.garminEstado, estado)
  }

  async function refrescar() {
    try {
      await consultas.fetchQuery({
        queryKey: claveSesion,
        queryFn: ({ signal }) => entrenamientosApi.obtener(entrenamientoId, { signal }),
      })
    } catch {
      // Si falla queda lo que ya estaba en pantalla; el modal ya avisa de sus errores.
    }
  }

  async function cargarNotas() {
    await consultas.invalidateQueries({
      queryKey: clavesConsulta.anotacionesSesion(entrenamientoId),
    })
  }

  useEffect(() => {
    if (!staff) {
      return
    }

    function alVincular(evento: Event) {
      const estado = (evento as CustomEvent<EstadoGarminDto>).detail
      if (estado) {
        consultas.setQueryData(clavesConsulta.garminEstado, estado)
      }
    }

    window.addEventListener('coachapp:garmin', alVincular)
    return () => window.removeEventListener('coachapp:garmin', alVincular)
  }, [staff, consultas])

  /** Atletas activos que todavia no estan en la sesion, filtrados por la busqueda. */
  const disponibles = useMemo(() => {
    if (!entrenamiento) {
      return []
    }

    const asignados = new Set(entrenamiento.atletas.map((a) => a.atletaId))
    const texto = buscando.trim().toLowerCase()

    return catalogo
      .filter((a) => !asignados.has(a.id))
      .filter(
        (a) =>
          !texto ||
          a.nombre.toLowerCase().includes(texto) ||
          a.apellido.toLowerCase().includes(texto) ||
          a.dni.includes(texto),
      )
      .sort((a, b) => a.apellido.localeCompare(b.apellido))
  }, [entrenamiento, catalogo, buscando])

  async function ejecutar(accion: () => Promise<EntrenamientoDto>) {
    setOcupado(true)
    setErrorAccion(null)

    try {
      setEntrenamiento(await accion())
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo completar la operación.'))
    } finally {
      setOcupado(false)
    }
  }

  function marcar(atleta: AtletaEnEntrenamientoDto, asistio: boolean | null) {
    // Tocar el estado ya activo lo revierte a "sin marcar".
    const nuevo = atleta.asistio === asistio ? null : asistio
    const anterior = atleta.asistio
    const ticket = (marcaPendiente.current.get(atleta.atletaId) ?? 0) + 1
    marcaPendiente.current.set(atleta.atletaId, ticket)

    // La marca se pinta al toque. Neon tarda, y el boton no tiene por que esperarla.
    marcasEnVuelo.current.add(atleta.atletaId)
    setErrorAccion(null)
    setEntrenamiento((actual) =>
      actual ? conAsistencia(actual, atleta.atletaId, nuevo) : actual,
    )

    void entrenamientosApi
      .marcarAsistencia(entrenamientoId, atleta.atletaId, nuevo)
      .then((sesionActualizada) => {
        setEntrenamiento((actual) => {
          if (marcaPendiente.current.get(atleta.atletaId) !== ticket) {
            return actual
          }

          marcasEnVuelo.current.delete(atleta.atletaId)
          return aplicarSesion(actual, sesionActualizada, marcasEnVuelo.current)
        })
      })
      .catch((e) => {
        if (marcaPendiente.current.get(atleta.atletaId) !== ticket) {
          return
        }

        marcasEnVuelo.current.delete(atleta.atletaId)
        setEntrenamiento((actual) =>
          actual ? conAsistencia(actual, atleta.atletaId, anterior) : actual,
        )
        setErrorAccion(mensajeApi(e, 'No se pudo marcar la asistencia.'))
      })
  }

  function agregar(atletaId: number) {
    void ejecutar(() => entrenamientosApi.agregarAtletas(entrenamientoId, [atletaId]))
  }

  function quitar(atleta: AtletaEnEntrenamientoDto) {
    void ejecutar(() => entrenamientosApi.quitarAtleta(entrenamientoId, atleta.atletaId))

    // Si se estaba viendo sus trabajos, el modal ya no tiene sentido.
    setEnTrabajos((actual) => (actual?.atletaId === atleta.atletaId ? null : actual))
  }

  async function quitarEquipo(equipo: EquipoEnEntrenamientoDto) {
    if (
      !(await confirmar(`¿Quitar ${equipo.etiqueta} de la sesión?`, {
        peligro: true,
        aceptar: 'Quitar',
      }))
    ) {
      return
    }

    void ejecutar(() => equiposApi.quitarDeSesion(entrenamientoId, equipo.id))
    setEnTrabajosEquipo((actual) => (actual?.id === equipo.id ? null : actual))
  }

  function abrirTrabajos(atleta: AtletaEnEntrenamientoDto) {
    setEnTrabajos(atleta)
  }

  /** Suma o saca al atleta de la seleccion, sin pasar del maximo. */
  function alternarSeleccion(atletaId: number) {
    setSeleccionados((previos) => {
      if (previos.includes(atletaId)) {
        return previos.filter((id) => id !== atletaId)
      }
      if (previos.length >= MAXIMO_SELECCION) {
        return previos
      }
      return [...previos, atletaId]
    })
  }

  function cerrarSeleccion() {
    setSeleccionando(false)
    setSeleccionados([])
  }

  async function traerGarmin() {
    setSincronizando(true)
    setErrorAccion(null)
    setAvisosGarmin([])
    setPreviewGarmin(null)

    try {
      const preview = await garminApi.preview(entrenamientoId)
      setAvisosGarmin(preview.avisos)

      if (preview.atletas.length === 0) {
        return
      }

      // Siempre mostramos el modal para elegir actividades y series.
      setPreviewGarmin(preview)
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudieron leer las actividades de Garmin.'))
    } finally {
      setSincronizando(false)
    }
  }

  async function confirmarImportGarmin(pedido: ImportarGarminRequest) {
    setImportandoGarmin(true)
    setErrorAccion(null)

    try {
      const resultado = await garminApi.importar(entrenamientoId, pedido)
      setEntrenamiento(resultado.entrenamiento)
      setAvisosGarmin(resultado.avisos)
      setPreviewGarmin(null)
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudieron importar las actividades de Garmin.'))
    } finally {
      setImportandoGarmin(false)
    }
  }

  async function desvincularGarmin() {
    if (
      !(await confirmar(
        '¿Desvincular la cuenta de Garmin? Las actividades ya guardadas se conservan.',
        { aceptar: 'Desvincular' },
      ))
    ) {
      return
    }

    try {
      await garminApi.desvincular()
      const estado = { vinculada: false, nombre: null }
      setGarmin(estado)
      window.dispatchEvent(new CustomEvent('coachapp:garmin', { detail: estado }))
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo desvincular Garmin.'))
    }
  }

  async function eliminarSesion() {
    if (
      !(await confirmar('¿Eliminar la sesión? Se pierden las asistencias marcadas.', {
        peligro: true,
        aceptar: 'Eliminar',
      }))
    ) {
      return
    }

    try {
      await entrenamientosApi.eliminar(entrenamientoId)
      void consultas.invalidateQueries({ queryKey: ['entrenamientos'] })
      navegar('/entrenamientos', { replace: true })
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo eliminar la sesión.'))
    }
  }

  if (cargando) {
    return (
      <MarcoPagina titulo="Entrenamiento" atras="/entrenamientos">
        <Block className="flex items-center gap-3">
          <Preloader />
          <span className="text-[13px] opacity-60">Cargando…</span>
        </Block>
      </MarcoPagina>
    )
  }

  if (!entrenamiento) {
    return (
      <MarcoPagina titulo="Entrenamiento" atras="/entrenamientos">
        <Block>
          <p className="text-[13px] text-red-500">{error ?? 'No se encontró la sesión.'}</p>
        </Block>
      </MarcoPagina>
    )
  }

  const presentes = entrenamiento.cantidadPresentes
  const ausentes = entrenamiento.cantidadAusentes
  const sinMarcar = entrenamiento.cantidadSinMarcar
  const esAgua = (entrenamiento.tipo ?? 'Agua') === 'Agua'
  const equipos = entrenamiento.equipos ?? []

  return (
    <MarcoPagina
      titulo={fechaLarga(entrenamiento.fecha)}
      subtitulo={`${fechaNumerica(entrenamiento.fecha)} · ${etiquetaTurno(entrenamiento.turno)} · Sesión ${entrenamiento.sesion} · ${etiquetaTipoTrabajo(entrenamiento.tipo ?? 'Agua')}${
        entrenamiento.club ? ` · ${entrenamiento.club}` : ''
      }`}
      atras="/entrenamientos"
    >
      {staff && (
        <Block className="!mt-3 space-y-2">
          {garmin?.vinculada && (
            <p className="text-[13px] opacity-70">
              Garmin vinculado{garmin.nombre ? `: ${garmin.nombre}` : ''}
              {' · '}
              <button
                type="button"
                className="text-primary"
                onClick={() => void desvincularGarmin()}
              >
                Desvincular
              </button>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button small rounded tonal inline onClick={() => setAnotando(true)}>
              Anotar
            </Button>
            {garmin?.vinculada ? (
              <Button
                small
                rounded
                inline
                disabled={sincronizando || importandoGarmin || ocupado}
                onClick={() => void traerGarmin()}
              >
                {sincronizando || importandoGarmin ? 'Trayendo…' : 'Traer de Garmin'}
              </Button>
            ) : (
              <Button small rounded inline onClick={() => setVinculando(true)}>
                Vincular Garmin
              </Button>
            )}
            <Button small rounded outline inline onClick={() => setEditandoSesion(true)}>
              Editar
            </Button>
            <Button
              small
              rounded
              outline
              inline
              className="!text-red-500 !border-red-500"
              onClick={() => void eliminarSesion()}
            >
              Eliminar
            </Button>
          </div>
        </Block>
      )}

      <Block strong inset className={staff ? undefined : '!mt-3'}>
        {entrenamiento.descripcion ? (
          <p className="whitespace-pre-wrap">{entrenamiento.descripcion}</p>
        ) : (
          <p className="text-[13px] opacity-60">Sin descripción.</p>
        )}
        {staff && (
          <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
            {notasSesion.length === 0 ? (
              <p className="text-[13px] opacity-60">Sin anotación.</p>
            ) : (
              notasSesion.map((nota) => (
                <div key={nota.id} className="mb-2 last:mb-0">
                  {nota.titulo && (
                    <p>
                      <strong>
                        <TextoConEnlaces texto={nota.titulo} />
                      </strong>
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">
                    <TextoConEnlaces texto={nota.texto} />
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </Block>

      {error && (
        <Block>
          <p className="text-[13px] text-red-500">{error}</p>
        </Block>
      )}

      {avisosGarmin.length > 0 && (
        <Block strong inset className="space-y-1">
          {avisosGarmin.map((aviso) => (
            <p key={aviso} className="text-[13px] opacity-70">
              {aviso}
            </p>
          ))}
        </Block>
      )}

      <BlockTitle>Atletas</BlockTitle>
      {staff && (
        <Block className="!my-2 text-[13px] opacity-70">
          {entrenamiento.cantidadAtletas} asignados · {presentes} presentes
          {ausentes > 0 && ` · ${ausentes} ${ausentes === 1 ? 'ausente' : 'ausentes'}`}
          {sinMarcar > 0 && ` · ${sinMarcar} sin marcar`}
        </Block>
      )}

      {staff && (
        <Block className="!my-2">
          <div className="flex flex-wrap items-center gap-2">
            {seleccionando ? (
              <>
                <span className="text-[13px] opacity-70">
                  {seleccionados.length} de {MAXIMO_SELECCION}
                </span>
                <Button
                  small
                  rounded
                  inline
                  disabled={seleccionados.length === 0}
                  onClick={() => setCargaMultiple(true)}
                >
                  Cargar{seleccionados.length > 0 ? ` (${seleccionados.length})` : ''}
                </Button>
                <Button small rounded outline inline onClick={cerrarSeleccion}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button small rounded outline inline onClick={() => setSeleccionando(true)}>
                Carga múltiple
              </Button>
            )}

            {esAgua && (
              <Button small rounded outline inline onClick={() => setCargaEquipo(true)}>
                Carga equipo
              </Button>
            )}
            <Button small rounded inline onClick={() => setPanelAbierto((v) => !v)}>
              {panelAbierto ? 'Cerrar' : 'Agregar atletas'}
            </Button>
          </div>
        </Block>
      )}

      {panelAbierto && (
        <>
          <List strong inset className="!my-2">
            <ListInput
              type="text"
              placeholder="Buscar atleta para agregar"
              value={buscando}
              onChange={(e) => setBuscando((e.target as HTMLInputElement).value)}
              autoFocus
            />
          </List>

          {disponibles.length === 0 ? (
            <Block>
              <p className="text-[13px] opacity-60">
                {catalogo.length === 0
                  ? 'No hay atletas cargados todavía.'
                  : 'No queda ningún atleta por agregar con esa búsqueda.'}
              </p>
            </Block>
          ) : (
            <List strong inset className="!my-2">
              {disponibles.map((atleta) => (
                <ListItem
                  key={atleta.id}
                  title={
                    <NombreAtleta
                      nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                      color={atleta.color}
                    />
                  }
                  subtitle={`${atleta.dni} · ${atleta.edad} años`}
                  after={
                    <Button
                      small
                      rounded
                      tonal
                      inline
                      disabled={ocupado}
                      onClick={() => agregar(atleta.id)}
                    >
                      Agregar
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </>
      )}

      {entrenamiento.atletas.length === 0 ? (
        <Block>
          <p className="text-[13px] opacity-60">
            Todavía no hay atletas asignados a esta sesión.
          </p>
        </Block>
      ) : (
        <List strong inset>
          {entrenamiento.atletas.map((atleta) => {
            const elegido = seleccionados.includes(atleta.atletaId)

            return (
              <ListItem
                key={atleta.atletaId}
                className="cursor-pointer"
                onClick={() =>
                  seleccionando ? alternarSeleccion(atleta.atletaId) : abrirTrabajos(atleta)
                }
                media={
                  seleccionando ? (
                    <Checkbox
                      component="div"
                      className="pointer-events-none"
                      checked={elegido}
                      disabled={!elegido && seleccionados.length >= MAXIMO_SELECCION}
                      readOnly
                      onChange={() => undefined}
                      aria-label={`Elegir a ${atleta.apellido}, ${atleta.nombre}`}
                    />
                  ) : undefined
                }
                title={
                  <span className="flex flex-wrap items-center gap-1">
                    <NombreAtleta
                      nombre={textoAtleta(atleta.apellido, atleta.nombre)}
                      color={atleta.color}
                    />
                    {(atleta.categorias ?? []).map((categoria) => (
                      <Badge key={categoria} colors={{ bg: 'bg-amber-500' }}>
                        {categoria}
                      </Badge>
                    ))}
                  </span>
                }
                subtitle={`${atleta.dni} · ${atleta.edad} años${
                  atleta.cantidadTrabajos > 0
                    ? ` · ${atleta.cantidadTrabajos} ${atleta.cantidadTrabajos === 1 ? 'trabajo' : 'trabajos'}`
                    : ''
                }`}
                innerChildren={
                  <div className="mt-1 space-y-1">
                    <ResumenTrabajos resumenes={atleta.resumenTrabajos ?? []} />
                    {atleta.garmin && (
                      <p className="text-[12px] opacity-60">{textoActividadGarmin(atleta.garmin)}</p>
                    )}

                    {/* La fila abre el modal: los controles de adentro no. */}
                    {staff && (
                      <div
                        className="flex flex-wrap items-center gap-1"
                        onClick={(evento) => evento.stopPropagation()}
                      >
                        <Chip
                          outline={atleta.asistio !== true}
                          colors={chipAsistencia(atleta.asistio === true, 'bg-green-500')}
                          className={ocupado ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
                          onClick={() => marcar(atleta, true)}
                        >
                          Presente
                        </Chip>
                        <Chip
                          outline={atleta.asistio !== false}
                          colors={chipAsistencia(atleta.asistio === false, 'bg-red-500')}
                          className={ocupado ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
                          onClick={() => marcar(atleta, false)}
                        >
                          Ausente
                        </Chip>
                        {atleta.asistio === null && (
                          <span className="text-[12px] opacity-60">sin marcar</span>
                        )}
                      </div>
                    )}

                    <div
                      className="-ml-2 flex flex-wrap items-center"
                      onClick={(evento) => evento.stopPropagation()}
                    >
                      {atleta.garmin && (
                        <Button
                          small
                          clear
                          inline
                          onClick={() =>
                            window.open(atleta.garmin?.url, '_blank', 'noopener,noreferrer')
                          }
                        >
                          Garmin
                        </Button>
                      )}
                      <Button small clear inline onClick={() => abrirTrabajos(atleta)}>
                        Trabajos
                      </Button>
                      {staff && (
                        <Button
                          small
                          clear
                          inline
                          className="!text-red-500"
                          disabled={ocupado}
                          onClick={() => quitar(atleta)}
                        >
                          Quitar
                        </Button>
                      )}
                    </div>
                  </div>
                }
              />
            )
          })}
        </List>
      )}

      {esAgua && equipos.length > 0 && (
        <>
          <BlockTitle>Equipos</BlockTitle>
          <List strong inset>
            {equipos.map((equipo) => {
              const propio =
                staff ||
                (sesion?.usuario.atletaId != null &&
                  equipo.miembros.some((m) => m.atletaId === sesion.usuario.atletaId))

              return (
                <ListItem
                  key={equipo.id}
                  className={propio ? 'cursor-pointer' : undefined}
                  onClick={() => {
                    if (propio) {
                      setEnTrabajosEquipo(equipo)
                    }
                  }}
                  title={<strong>{equipo.etiqueta}</strong>}
                  subtitle={`${equipo.miembros
                    .map((m) => `${m.apellido}, ${m.nombre}`)
                    .join(' · ')}${
                    equipo.cantidadTrabajos > 0
                      ? ` · ${equipo.cantidadTrabajos} ${equipo.cantidadTrabajos === 1 ? 'trabajo' : 'trabajos'}`
                      : ''
                  }`}
                  innerChildren={
                    <div className="mt-1 space-y-1">
                      <ResumenTrabajos resumenes={equipo.resumenTrabajos ?? []} />
                      <div
                        className="-ml-2 flex flex-wrap items-center"
                        onClick={(evento) => evento.stopPropagation()}
                      >
                        {propio && (
                          <Button small clear inline onClick={() => setEnTrabajosEquipo(equipo)}>
                            Trabajos
                          </Button>
                        )}
                        {staff && (
                          <Button
                            small
                            clear
                            inline
                            className="!text-red-500"
                            disabled={ocupado}
                            onClick={() => void quitarEquipo(equipo)}
                          >
                            Quitar
                          </Button>
                        )}
                      </div>
                    </div>
                  }
                />
              )
            })}
          </List>
        </>
      )}

      {enTrabajos && (
        <ModalTrabajos
          entrenamientoId={entrenamientoId}
          atleta={enTrabajos}
          tipoSesion={entrenamiento.tipo ?? 'Agua'}
          onCerrar={() => setEnTrabajos(null)}
          onCambio={() => void refrescar()}
        />
      )}

      {enTrabajosEquipo && (
        <ModalTrabajosEquipo
          entrenamientoId={entrenamientoId}
          equipo={enTrabajosEquipo}
          onCerrar={() => setEnTrabajosEquipo(null)}
          onCambio={() => void refrescar()}
        />
      )}

      {cargaEquipo && (
        <ModalCargaEquipo
          entrenamientoId={entrenamientoId}
          atletas={entrenamiento.atletas}
          onCerrar={() => setCargaEquipo(false)}
          onCargado={() => void refrescar()}
        />
      )}

      {editandoSesion && (
        <ModalEditarSesion
          entrenamiento={entrenamiento}
          onCerrar={() => setEditandoSesion(false)}
          onGuardado={(actualizado) => setEntrenamiento(actualizado)}
        />
      )}

      {cargaMultiple && (
        <ModalCargaMultiple
          entrenamientoId={entrenamientoId}
          tipoSesion={entrenamiento.tipo ?? 'Agua'}
          atletas={entrenamiento.atletas.filter((a) => seleccionados.includes(a.atletaId))}
          onCerrar={() => {
            setCargaMultiple(false)
            cerrarSeleccion()
          }}
          onCambio={() => void refrescar()}
        />
      )}

      {anotando && (
        <ModalAnotaciones
          titulo="Anotaciones de la sesión"
          subtitulo={`${fechaLarga(entrenamiento.fecha)} · ${etiquetaTurno(entrenamiento.turno)} · Sesión ${entrenamiento.sesion}`}
          contexto={{ entrenamientoId }}
          onCerrar={() => setAnotando(false)}
          onCambio={() => void cargarNotas()}
        />
      )}

      {vinculando && (
        <ModalVincularGarmin
          onCerrar={() => setVinculando(false)}
          onVinculada={(estado) => {
            setGarmin(estado)
            setVinculando(false)
            window.dispatchEvent(new CustomEvent('coachapp:garmin', { detail: estado }))
          }}
        />
      )}

      {previewGarmin && (
        <ModalImportarGarmin
          preview={previewGarmin}
          ocupado={importandoGarmin}
          onCerrar={() => setPreviewGarmin(null)}
          onConfirmar={(pedido) => void confirmarImportGarmin(pedido)}
        />
      )}
    </MarcoPagina>
  )
}

/** Colores del chip de asistencia: relleno solo si esta activo. */
function chipAsistencia(activo: boolean, fondo: string) {
  return activo
    ? {
        fillBgIos: fondo,
        fillBgMaterial: fondo,
        fillTextIos: 'text-white',
        fillTextMaterial: 'text-white',
      }
    : undefined
}

/**
 * Mini resumen de lo cargado en la sesion, para verlo sin abrir los trabajos.
 * En gimnasio se muestran los kg y, cuando hay mas de un ejercicio, la inicial
 * de cada uno delante de sus kilos. En tierra y agua, el mejor tiempo de los
 * parciales. Puede haber mas de un trabajo por atleta.
 */
function ResumenTrabajos({ resumenes }: { resumenes: ResumenTrabajoDto[] }) {
  const partes = resumenes.map(textoResumen).filter((texto) => texto !== '')

  if (partes.length === 0) {
    return null
  }

  return (
    <span className="flex flex-wrap gap-1">
      {partes.map((texto, indice) => (
        <span
          className="rounded-full bg-black/5 px-2 py-0.5 text-[12px] dark:bg-white/10"
          key={`${indice}-${texto}`}
        >
          {texto}
        </span>
      ))}
    </span>
  )
}

/** Texto de un trabajo para el resumen de la fila. */
function textoResumen(resumen: ResumenTrabajoDto): string {
  if (resumen.mejorTiempo) {
    return resumen.mejorTiempo
  }

  const variosEjercicios = resumen.ejercicios.length > 1

  return resumen.ejercicios
    .map((ejercicio) => {
      const kilos = ejercicio.kilos.map(textoKilos).join(', ')
      if (!variosEjercicios) {
        return kilos
      }

      const inicial = ejercicio.nombre.trim().charAt(0).toUpperCase()
      return inicial ? `${inicial}: ${kilos}` : kilos
    })
    .filter((texto) => texto !== '')
    .join(' · ')
}

/** Un peso en kilos, sin decimales de mas: 65 o 62,5. */
function textoKilos(kilos: number): string {
  return kilos.toLocaleString('es-AR', { maximumFractionDigits: 1 })
}

/**
 * Aplica la sesion que volvio de la API, pero deja quieta la asistencia de
 * los atletas que se marcaron despues y todavia no confirmaron.
 */
function aplicarSesion(
  local: EntrenamientoDto | null,
  servidor: EntrenamientoDto,
  enVuelo: Set<number>,
): EntrenamientoDto {
  if (!local || enVuelo.size === 0) {
    return servidor
  }

  const atletas = servidor.atletas.map((atleta) => {
    if (!enVuelo.has(atleta.atletaId)) {
      return atleta
    }

    const pintado = local.atletas.find((otro) => otro.atletaId === atleta.atletaId)
    return pintado ? { ...atleta, asistio: pintado.asistio } : atleta
  })

  return {
    ...servidor,
    atletas,
    cantidadPresentes: atletas.filter((atleta) => atleta.asistio === true).length,
    cantidadAusentes: atletas.filter((atleta) => atleta.asistio === false).length,
    cantidadSinMarcar: atletas.filter((atleta) => atleta.asistio === null).length,
  }
}

/** Pinta la asistencia de un atleta y recalcula los conteos de la cabecera. */
function conAsistencia(
  sesion: EntrenamientoDto,
  atletaId: number,
  asistio: boolean | null,
): EntrenamientoDto {
  const atletas = sesion.atletas.map((atleta) =>
    atleta.atletaId === atletaId ? { ...atleta, asistio } : atleta,
  )

  return {
    ...sesion,
    atletas,
    cantidadPresentes: atletas.filter((atleta) => atleta.asistio === true).length,
    cantidadAusentes: atletas.filter((atleta) => atleta.asistio === false).length,
    cantidadSinMarcar: atletas.filter((atleta) => atleta.asistio === null).length,
  }
}

/** Resumen corto de la actividad para la fila del atleta. */
function textoActividadGarmin(actividad: ActividadGarminDto): string {
  const partes = [actividad.nombre]

  if (actividad.tipo) {
    partes.push(actividad.tipo)
  }
  if (actividad.inicio) {
    partes.push(actividad.inicio)
  }
  if (actividad.distanciaMetros != null) {
    partes.push(textoDistancia(actividad.distanciaMetros))
  }
  if (actividad.duracionSegundos != null) {
    partes.push(textoDuracion(actividad.duracionSegundos))
  }
  if (actividad.fcPromedio != null) {
    partes.push(`FC ${actividad.fcPromedio}`)
  }
  if (actividad.cadencia != null) {
    partes.push(`${Math.round(actividad.cadencia)} ppm`)
  }
  if (actividad.calorias != null) {
    partes.push(`${actividad.calorias} kcal`)
  }

  return partes.join(' · ')
}

function textoDistancia(metros: number): string {
  if (metros >= 1000) {
    const km = metros / 1000
    return `${km.toLocaleString('es-AR', { maximumFractionDigits: 2 })} km`
  }

  return `${Math.round(metros)} m`
}

function textoDuracion(segundos: number): string {
  const total = Math.round(segundos)
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const resto = total % 60
  const ss = String(resto).padStart(2, '0')

  if (horas > 0) {
    return `${horas}:${String(minutos).padStart(2, '0')}:${ss}`
  }

  return `${minutos}:${ss}`
}
