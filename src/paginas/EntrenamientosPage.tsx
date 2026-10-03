import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/cliente'
import { entrenamientosApi, etiquetaTurno } from '../api/entrenamientos'
import { ModalImportarPlanilla } from '../componentes/ModalImportarPlanilla'
import type { CrearEntrenamientoRequest, EntrenamientoDto, Turno } from '../tipos/api'
import { esPasado, fechaCorta, fechaLarga, hoyISO } from '../util/fechas'

const SESIONES = [1, 2, 3, 4, 5]

export function EntrenamientosPage() {
  const navegar = useNavigate()

  const [entrenamientos, setEntrenamientos] = useState<EntrenamientoDto[]>([])
  // La vista arranca sin filtro de fecha a proposito: mostrar todo lo cargado
  // de una, y que el entrenador acote si quiere.
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [turno, setTurno] = useState<Turno | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      setEntrenamientos(
        await entrenamientosApi.listar({
          desde: desde || undefined,
          hasta: hasta || undefined,
          turno: turno || undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los entrenamientos.')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, turno])

  useEffect(() => {
    void cargar()
  }, [cargar])

  /** Agrupa las sesiones por dia para leerlas como una agenda. */
  const porFecha = useMemo(() => {
    const grupos = new Map<string, EntrenamientoDto[]>()

    for (const entrenamiento of entrenamientos) {
      const lista = grupos.get(entrenamiento.fecha) ?? []
      lista.push(entrenamiento)
      grupos.set(entrenamiento.fecha, lista)
    }

    return [...grupos.entries()]
  }, [entrenamientos])

  function creado(nuevo: EntrenamientoDto) {
    setMostrarForm(false)
    navegar(`/entrenamientos/${nuevo.id}`)
  }

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>Entrenamientos</h2>
        <button type="button" className="boton" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? 'Cancelar' : 'Nueva sesión'}
        </button>
      </div>

      {mostrarForm && <FormularioEntrenamiento onCreado={creado} />}

      <div className="tarjeta filtros">
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>

        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>

        <label>
          Turno
          <select value={turno} onChange={(e) => setTurno(e.target.value as Turno | '')}>
            <option value="">Todos</option>
            <option value="Manana">Mañana</option>
            <option value="Tarde">Tarde</option>
          </select>
        </label>

        <button type="button" className="boton-fantasma" onClick={() => { setDesde(''); setHasta(''); setTurno('') }}>
          Ver todo
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : entrenamientos.length === 0 ? (
        <p className="sutil">No hay sesiones cargadas para esos filtros.</p>
      ) : (
        <div className="agenda">
          {porFecha.map(([fecha, sesiones]) => (
            <section className="dia" key={fecha}>
              <h3 className={esPasado(fecha) ? 'titulo-dia pasado' : 'titulo-dia'}>
                {fechaLarga(fecha)}
                <span className="sutil"> · {fechaCorta(fecha)}</span>
              </h3>

              <div className="sesiones">
                {sesiones.map((sesion) => (
                  <Link className="tarjeta sesion" key={sesion.id} to={`/entrenamientos/${sesion.id}`}>
                    <div className="sesion-titulo">
                      <span className="etiqueta-sesion">Sesión {sesion.sesion}</span>
                      <span className="turno">{etiquetaTurno(sesion.turno)}</span>
                    </div>

                    {sesion.descripcion && <p className="sutil">{sesion.descripcion}</p>}

                    <div className="sesion-pie">
                      <span className="sutil">
                        {sesion.cantidadAtletas === 0
                          ? 'Sin atletas'
                          : `${sesion.cantidadPresentes}/${sesion.cantidadAtletas} presentes`}
                      </span>
                      {sesion.club && <span className="sutil">{sesion.club}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function FormularioEntrenamiento({ onCreado }: { onCreado: (nuevo: EntrenamientoDto) => void }) {
  const [datos, setDatos] = useState<CrearEntrenamientoRequest>({
    fecha: hoyISO(),
    turno: 'Manana',
    sesion: 1,
    descripcion: '',
    club: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mostrarPlanilla, setMostrarPlanilla] = useState(false)

  // El backend guarda la descripcion hasta 500 caracteres: se avisa antes de
  // intentar guardar, en vez de que el error aparezca al enviar.
  const descripcionLarga = (datos.descripcion?.length ?? 0) > 500

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      onCreado(await entrenamientosApi.crear(datos))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la sesión.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <form className="tarjeta formulario" onSubmit={guardar}>
        <div className="grilla">
          <label>
            Fecha
            <input
              type="date"
              value={datos.fecha}
              onChange={(e) => setDatos((d) => ({ ...d, fecha: e.target.value }))}
              required
            />
          </label>

          <label>
            Turno
            <select
              value={datos.turno}
              onChange={(e) => setDatos((d) => ({ ...d, turno: e.target.value as Turno }))}
            >
              <option value="Manana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
          </label>

          <label>
            Sesión
            <select
              value={datos.sesion}
              onChange={(e) => setDatos((d) => ({ ...d, sesion: Number(e.target.value) }))}
            >
              {SESIONES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label>
            Club
            <input
              value={datos.club ?? ''}
              onChange={(e) => setDatos((d) => ({ ...d, club: e.target.value }))}
            />
          </label>
        </div>

        <div className="campo-descripcion">
          <label>
            Descripción
            <input
              value={datos.descripcion ?? ''}
              onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
              placeholder="Trabajo de velocidad, fondo, técnica…"
            />
          </label>

          <button
            type="button"
            className="boton-fantasma"
            onClick={() => setMostrarPlanilla(true)}
          >
            Traer de la planilla
          </button>
        </div>

        {descripcionLarga && (
          <p className="error">
            La descripción tiene {datos.descripcion?.length ?? 0} caracteres y el límite es 500.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="boton" disabled={guardando || descripcionLarga}>
          {guardando ? 'Creando…' : 'Crear sesión'}
        </button>
      </form>

      {/* El modal trae su propio formulario, asi que va fuera de este: los
          formularios anidados no son HTML valido. */}
      {mostrarPlanilla && (
        <ModalImportarPlanilla
          onElegir={(texto) => {
            setDatos((d) => ({ ...d, descripcion: texto }))
            setMostrarPlanilla(false)
          }}
          onCerrar={() => setMostrarPlanilla(false)}
        />
      )}
    </>
  )
}
