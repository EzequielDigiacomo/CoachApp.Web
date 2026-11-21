import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { entrenamientosApi, etiquetaTipoTrabajo, etiquetaTurno } from '../api/entrenamientos'
import { useAuth } from '../auth/contextoAuth'
import { ModalImportarPlanilla } from '../componentes/ModalImportarPlanilla'
import {
  esStaff,
  type CrearEntrenamientoRequest,
  type EntrenamientoDto,
  type FiltrosEntrenamiento,
  type TipoTrabajo,
  type Turno,
} from '../tipos/api'
import { esPasado, fechaCorta, fechaLarga, hoyISO } from '../util/fechas'

const SESIONES = [1, 2, 3, 4, 5]

export function EntrenamientosPage() {
  const navegar = useNavigate()
  const consultas = useQueryClient()
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)

  // La vista arranca sin filtro de fecha a proposito: mostrar lo cargado
  // de una, y que el entrenador acote si quiere.
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [turno, setTurno] = useState<Turno | ''>('')
  const [mostrarForm, setMostrarForm] = useState(false)

  const filtros: FiltrosEntrenamiento = useMemo(
    () => ({
      desde: desde || undefined,
      hasta: hasta || undefined,
      turno: turno || undefined,
    }),
    [desde, hasta, turno],
  )
  const filtrosDiferidos = useDeferredValue(filtros)

  const listado = useQuery({
    queryKey: clavesConsulta.entrenamientos(filtrosDiferidos),
    queryFn: ({ signal }) => entrenamientosApi.listar(filtrosDiferidos, { signal }),
  })

  const entrenamientos = listado.data ?? []
  const error = listado.isError
    ? mensajeApi(listado.error, 'No se pudieron cargar los entrenamientos.')
    : null

  /** Agrupa las sesiones por dia para leerlas como una agenda. */
  const porFecha = useMemo(() => {
    const grupos = new Map<string, EntrenamientoDto[]>()

    for (const entrenamiento of entrenamientos) {
      const lista = grupos.get(entrenamiento.fecha) ?? []
      lista.push(entrenamiento)
      grupos.set(entrenamiento.fecha, lista)
    }

    return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [entrenamientos])

  function creado(nuevo: EntrenamientoDto) {
    setMostrarForm(false)
    void consultas.invalidateQueries({ queryKey: ['entrenamientos'] })
    navegar(`/entrenamientos/${nuevo.id}`)
  }

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>Entrenamientos</h2>
        {staff && (
          <button type="button" className="boton" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? 'Cancelar' : 'Nueva sesión'}
          </button>
        )}
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

        <button
          type="button"
          className="boton-fantasma"
          onClick={() => {
            setDesde('')
            setHasta('')
            setTurno('')
          }}
        >
          Ver todo
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {listado.isPending ? (
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
                {sesiones.map((item) => (
                  <Link className="tarjeta sesion" key={item.id} to={`/entrenamientos/${item.id}`}>
                    <div className="sesion-titulo">
                      <span className="etiqueta-sesion">Sesión {item.sesion}</span>
                      <span className="turno">{etiquetaTurno(item.turno)}</span>
                      <span
                        className={`etiqueta-tipo-sesion tipo-${(item.tipo ?? 'Agua').toLowerCase()}`}
                      >
                        {etiquetaTipoTrabajo(item.tipo ?? 'Agua')}
                      </span>
                    </div>

                    {item.descripcion && <p className="sutil">{item.descripcion}</p>}

                    <div className="sesion-pie">
                      {staff && (
                        <span className="sutil">
                          {item.cantidadAtletas === 0
                            ? 'Sin atletas'
                            : `${item.cantidadPresentes}/${item.cantidadAtletas} presentes`}
                        </span>
                      )}
                      {item.club && <span className="sutil">{item.club}</span>}
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
    tipo: 'Agua',
    descripcion: '',
    club: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [mostrarPlanilla, setMostrarPlanilla] = useState(false)

  const crear = useMutation({
    mutationFn: (pedido: CrearEntrenamientoRequest) => entrenamientosApi.crear(pedido),
    onSuccess: (nuevo) => onCreado(nuevo),
    onError: (e) => setError(mensajeApi(e, 'No se pudo crear la sesión.')),
  })

  // El backend guarda la descripcion hasta 500 caracteres: se avisa antes de
  // intentar guardar, en vez de que el error aparezca al enviar.
  const descripcionLarga = (datos.descripcion?.length ?? 0) > 500

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    crear.mutate(datos)
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
            Tipo
            <select
              value={datos.tipo}
              onChange={(e) => setDatos((d) => ({ ...d, tipo: e.target.value as TipoTrabajo }))}
              required
            >
              <option value="Gimnasio">Gimnasio</option>
              <option value="Tierra">Tierra</option>
              <option value="Agua">Agua</option>
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

        <button type="submit" className="boton" disabled={crear.isPending || descripcionLarga}>
          {crear.isPending ? 'Creando…' : 'Crear sesión'}
        </button>
      </form>

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
