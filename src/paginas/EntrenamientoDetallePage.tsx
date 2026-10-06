import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/cliente'
import { atletasApi, entrenamientosApi, etiquetaTurno } from '../api/entrenamientos'
import { garminApi } from '../api/garmin'
import { ModalTrabajos } from '../componentes/ModalTrabajos'
import { ModalVincularGarmin } from '../componentes/ModalVincularGarmin'
import type {
  ActividadGarminDto,
  AtletaDto,
  AtletaEnEntrenamientoDto,
  EntrenamientoDto,
  EstadoGarminDto,
} from '../tipos/api'
import { fechaLarga, fechaNumerica } from '../util/fechas'

export function EntrenamientoDetallePage() {
  const { id } = useParams()
  const navegar = useNavigate()
  const entrenamientoId = Number(id)

  const [entrenamiento, setEntrenamiento] = useState<EntrenamientoDto | null>(null)
  const [catalogo, setCatalogo] = useState<AtletaDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [buscando, setBuscando] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(false)

  /** Atleta cuyos trabajos se estan viendo en el modal. */
  const [enTrabajos, setEnTrabajos] = useState<AtletaEnEntrenamientoDto | null>(null)
  const [garmin, setGarmin] = useState<EstadoGarminDto | null>(null)
  const [vinculando, setVinculando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [avisosGarmin, setAvisosGarmin] = useState<string[]>([])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      const [sesion, atletas] = await Promise.all([
        entrenamientosApi.obtener(entrenamientoId),
        atletasApi.listar(),
      ])
      setEntrenamiento(sesion)
      setCatalogo(atletas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la sesión.')
    } finally {
      setCargando(false)
    }
  }, [entrenamientoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    void garminApi
      .estado()
      .then(setGarmin)
      .catch(() => setGarmin({ vinculada: false, nombre: null }))

    function alVincular(evento: Event) {
      const estado = (evento as CustomEvent<EstadoGarminDto>).detail
      if (estado) {
        setGarmin(estado)
      }
    }

    window.addEventListener('coachapp:garmin', alVincular)
    return () => window.removeEventListener('coachapp:garmin', alVincular)
  }, [])

  /**
   * Refresca la sesion sin pasar por el estado de carga: se usa cuando el modal
   * de trabajos cambia algo, para no vaciar la pantalla que esta detras.
   */
  const refrescar = useCallback(async () => {
    try {
      setEntrenamiento(await entrenamientosApi.obtener(entrenamientoId))
    } catch {
      // Si falla queda lo que ya estaba en pantalla; el modal ya avisa de sus errores.
    }
  }, [entrenamientoId])

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
    setError(null)

    try {
      setEntrenamiento(await accion())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo completar la operación.')
    } finally {
      setOcupado(false)
    }
  }

  function marcar(atleta: AtletaEnEntrenamientoDto, asistio: boolean | null) {
    // Tocar el estado ya activo lo revierte a "sin marcar".
    const nuevo = atleta.asistio === asistio ? null : asistio
    void ejecutar(() => entrenamientosApi.marcarAsistencia(entrenamientoId, atleta.atletaId, nuevo))
  }

  function agregar(atletaId: number) {
    void ejecutar(() => entrenamientosApi.agregarAtletas(entrenamientoId, [atletaId]))
  }

  function quitar(atleta: AtletaEnEntrenamientoDto) {
    void ejecutar(() => entrenamientosApi.quitarAtleta(entrenamientoId, atleta.atletaId))

    // Si se estaba viendo sus trabajos, el modal ya no tiene sentido.
    setEnTrabajos((actual) => (actual?.atletaId === atleta.atletaId ? null : actual))
  }

  function abrirTrabajos(atleta: AtletaEnEntrenamientoDto) {
    setEnTrabajos(atleta)
  }

  async function traerGarmin() {
    setSincronizando(true)
    setError(null)
    setAvisosGarmin([])

    try {
      const resultado = await garminApi.sincronizar(entrenamientoId)
      setEntrenamiento(resultado.entrenamiento)
      setAvisosGarmin(resultado.avisos)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron leer las actividades de Garmin.')
    } finally {
      setSincronizando(false)
    }
  }

  async function desvincularGarmin() {
    if (!window.confirm('¿Desvincular la cuenta de Garmin? Las actividades ya guardadas se conservan.')) {
      return
    }

    try {
      await garminApi.desvincular()
      const estado = { vinculada: false, nombre: null }
      setGarmin(estado)
      window.dispatchEvent(new CustomEvent('coachapp:garmin', { detail: estado }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo desvincular Garmin.')
    }
  }

  async function eliminarSesion() {
    if (!window.confirm('¿Eliminar la sesión? Se pierden las asistencias marcadas.')) {
      return
    }

    try {
      await entrenamientosApi.eliminar(entrenamientoId)
      navegar('/entrenamientos', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar la sesión.')
    }
  }

  if (cargando) {
    return <p className="sutil">Cargando…</p>
  }

  if (!entrenamiento) {
    return (
      <div className="pagina">
        <p className="error">{error ?? 'No se encontró la sesión.'}</p>
        <Link className="boton-fantasma" to="/entrenamientos">
          Volver
        </Link>
      </div>
    )
  }

  const presentes = entrenamiento.cantidadPresentes
  const ausentes = entrenamiento.cantidadAusentes
  const sinMarcar = entrenamiento.cantidadSinMarcar

  return (
    <div className="pagina">
      <Link className="volver" to="/entrenamientos">
        ← Entrenamientos
      </Link>

      <div className="tarjeta cabecera-sesion">
        <div>
          <h2>{fechaLarga(entrenamiento.fecha)}</h2>
          <p className="sutil">
            {fechaNumerica(entrenamiento.fecha)} · {etiquetaTurno(entrenamiento.turno)} ·
            Sesión {entrenamiento.sesion}
            {entrenamiento.club && ` · ${entrenamiento.club}`}
          </p>
          {garmin?.vinculada && (
            <p className="sutil">
              Garmin vinculado{garmin.nombre ? `: ${garmin.nombre}` : ''}
              {' · '}
              <button type="button" className="enlace-texto" onClick={() => void desvincularGarmin()}>
                Desvincular
              </button>
            </p>
          )}
        </div>

        <div className="acciones-cabecera">
          {garmin?.vinculada ? (
            <button
              type="button"
              className="boton"
              disabled={sincronizando || ocupado}
              onClick={() => void traerGarmin()}
            >
              {sincronizando ? 'Trayendo…' : 'Traer de Garmin'}
            </button>
          ) : (
            <button type="button" className="boton" onClick={() => setVinculando(true)}>
              Vincular Garmin
            </button>
          )}
          <button type="button" className="boton-fantasma peligro" onClick={() => void eliminarSesion()}>
            Eliminar
          </button>
        </div>
      </div>

      {entrenamiento.descripcion && (
        <div className="tarjeta">
          <p>{entrenamiento.descripcion}</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {avisosGarmin.length > 0 && (
        <div className="tarjeta">
          {avisosGarmin.map((aviso) => (
            <p key={aviso} className="sutil">
              {aviso}
            </p>
          ))}
        </div>
      )}

      <div className="encabezado">
        <h3 className="titulo-seccion">
          Atletas
          <span className="sutil">
            {' '}
            · {entrenamiento.cantidadAtletas} asignados · {presentes} presentes
            {ausentes > 0 && ` · ${ausentes} ${ausentes === 1 ? 'ausente' : 'ausentes'}`}
            {sinMarcar > 0 && ` · ${sinMarcar} sin marcar`}
          </span>
        </h3>

        <button type="button" className="boton" onClick={() => setPanelAbierto((v) => !v)}>
          {panelAbierto ? 'Cerrar' : 'Agregar atletas'}
        </button>
      </div>

      {panelAbierto && (
        <div className="tarjeta">
          <input
            className="busqueda"
            placeholder="Buscar atleta para agregar"
            value={buscando}
            onChange={(e) => setBuscando(e.target.value)}
            autoFocus
          />

          {disponibles.length === 0 ? (
            <p className="sutil">
              {catalogo.length === 0
                ? 'No hay atletas cargados todavía.'
                : 'No queda ningún atleta por agregar con esa búsqueda.'}
            </p>
          ) : (
            <ul className="lista-disponibles">
              {disponibles.map((atleta) => (
                <li key={atleta.id}>
                  <span>
                    {atleta.apellido}, {atleta.nombre}
                    <span className="sutil"> · {atleta.dni} · {atleta.edad} años</span>
                  </span>
                  <button
                    type="button"
                    className="boton-fantasma"
                    disabled={ocupado}
                    onClick={() => agregar(atleta.id)}
                  >
                    Agregar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {entrenamiento.atletas.length === 0 ? (
        <p className="sutil">Todavía no hay atletas asignados a esta sesión.</p>
      ) : (
        <div className="tarjeta sin-relleno">
          <table className="tabla">
            <thead>
              <tr>
                <th>Apellido y nombre</th>
                <th>Asistencia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entrenamiento.atletas.map((atleta) => (
                <tr
                  key={atleta.atletaId}
                  className="fila-clicable"
                  title="Ver los trabajos del atleta"
                  onClick={() => abrirTrabajos(atleta)}
                >
                  <td>
                    {atleta.apellido}, {atleta.nombre}
                    {(atleta.categorias ?? []).map((categoria) => (
                      <span className="etiqueta" key={categoria}>
                        {categoria}
                      </span>
                    ))}
                    <span className="sutil bloque">
                      {atleta.dni} · {atleta.edad} años
                      {atleta.cantidadTrabajos > 0 &&
                        ` · ${atleta.cantidadTrabajos} ${atleta.cantidadTrabajos === 1 ? 'trabajo' : 'trabajos'}`}
                    </span>
                    {atleta.garmin && (
                      <span className="sutil bloque">
                        {textoActividadGarmin(atleta.garmin)}
                      </span>
                    )}
                  </td>

                  <td>
                    <div className="asistencia">
                      <button
                        type="button"
                        className={atleta.asistio === true ? 'chip activo-presente' : 'chip'}
                        disabled={ocupado}
                        onClick={(evento) => {
                          // La fila abre el modal: los botones de adentro no.
                          evento.stopPropagation()
                          marcar(atleta, true)
                        }}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        className={atleta.asistio === false ? 'chip activo-ausente' : 'chip'}
                        disabled={ocupado}
                        onClick={(evento) => {
                          evento.stopPropagation()
                          marcar(atleta, false)
                        }}
                      >
                        Ausente
                      </button>
                      {atleta.asistio === null && <span className="sutil">sin marcar</span>}
                    </div>
                  </td>

                  <td className="derecha">
                    <div className="acciones-fila">
                      {atleta.garmin && (
                        <a
                          className="boton-fantasma"
                          href={atleta.garmin.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(evento) => evento.stopPropagation()}
                        >
                          Garmin
                        </a>
                      )}
                      <button
                        type="button"
                        className="boton-fantasma"
                        onClick={(evento) => {
                          evento.stopPropagation()
                          abrirTrabajos(atleta)
                        }}
                      >
                        Trabajos
                      </button>
                      <button
                        type="button"
                        className="boton-fantasma"
                        disabled={ocupado}
                        onClick={(evento) => {
                          evento.stopPropagation()
                          quitar(atleta)
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {enTrabajos && (
        <ModalTrabajos
          entrenamientoId={entrenamientoId}
          atleta={enTrabajos}
          onCerrar={() => setEnTrabajos(null)}
          onCambio={() => void refrescar()}
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
    </div>
  )
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
