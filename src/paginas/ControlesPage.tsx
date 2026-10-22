import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/cliente'
import { controlesApi } from '../api/controles'
import { atletasApi } from '../api/entrenamientos'
import { useAuth } from '../auth/contextoAuth'
import {
  armarGuardarControlAgua,
  armarGuardarControlesAgua,
  FormularioControlAgua,
  formularioAguaVacio,
  formularioDesdeControlAgua,
  type FormControlAgua,
} from '../componentes/FormularioControlAgua'
import {
  armarGuardarControl,
  FormularioControlGim,
  formularioControlVacio,
  formularioDesdeControl,
  type FormControlGim,
} from '../componentes/FormularioControlGim'
import { NombreAtleta } from '../componentes/NombreAtleta'
import { VistaControlAgua } from '../componentes/VistaControlAgua'
import { VistaControlGim } from '../componentes/VistaControlGim'
import { esStaff, type AtletaDto, type ControlDto, type TipoTrabajo } from '../tipos/api'
import { hoyISO } from '../util/fechas'

type TipoMenu = 'gimnasio' | 'tierra' | 'agua'

const TIPOS_MENU: { slug: TipoMenu; etiqueta: string; api: TipoTrabajo }[] = [
  { slug: 'gimnasio', etiqueta: 'Gimnasio', api: 'Gimnasio' },
  { slug: 'tierra', etiqueta: 'Tierra', api: 'Tierra' },
  { slug: 'agua', etiqueta: 'Agua', api: 'Agua' },
]

function slugValido(valor: string | undefined): valor is TipoMenu {
  return valor === 'gimnasio' || valor === 'tierra' || valor === 'agua'
}

/**
 * Modulo Controles: menu lateral Gim/Tierra/Agua.
 * Staff carga controles de gim; el atleta solo lee los suyos.
 */
export function ControlesPage() {
  const { tipo: tipoParam } = useParams()
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)

  if (!slugValido(tipoParam)) {
    return <Navigate to="/controles/gimnasio" replace />
  }

  const tipoActual = TIPOS_MENU.find((t) => t.slug === tipoParam)!

  return (
    <div className="pagina controles-pagina">
      <div className="encabezado">
        <div>
          <h2>Controles</h2>
          <p className="sutil">
            {staff
              ? 'Cargá controles por atleta, fuera de las sesiones.'
              : 'Tus controles cargados por el entrenador.'}
          </p>
        </div>
      </div>

      <div className="controles-layout">
        <aside className="controles-menu">
          <nav>
            {TIPOS_MENU.map((item) => (
              <NavLink
                key={item.slug}
                to={`/controles/${item.slug}`}
                className={({ isActive }) => (isActive ? 'activo' : undefined)}
              >
                {item.etiqueta}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="controles-panel">
          {tipoActual.slug === 'gimnasio' ? (
            <PanelGimnasio staff={staff} />
          ) : tipoActual.slug === 'agua' ? (
            <PanelAgua staff={staff} />
          ) : (
            <p className="sutil">Controles de {tipoActual.etiqueta.toLowerCase()}: próximamente.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function PanelGimnasio({ staff }: { staff: boolean }) {
  const [atletas, setAtletas] = useState<AtletaDto[]>([])
  const [controles, setControles] = useState<ControlDto[]>([])
  const [atletaId, setAtletaId] = useState('')
  const [form, setForm] = useState<FormControlGim>(() => formularioControlVacio(hoyISO()))
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      if (staff) {
        const id = atletaId ? Number(atletaId) : undefined
        setControles(
          await controlesApi.listar({
            atletaId: id,
            tipo: 'Gimnasio',
          }),
        )
      } else {
        setControles(await controlesApi.mios('Gimnasio'))
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los controles.')
    } finally {
      setCargando(false)
    }
  }, [staff, atletaId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (!staff) {
      return
    }

    void atletasApi
      .listar()
      .then(setAtletas)
      .catch(() => setAtletas([]))
  }, [staff])

  const atletasActivos = useMemo(
    () => atletas.filter((a) => a.activo).sort((a, b) => a.apellido.localeCompare(b.apellido)),
    [atletas],
  )

  function abrirNuevo() {
    setForm(formularioControlVacio(hoyISO(), atletaId))
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(control: ControlDto) {
    setForm(formularioDesdeControl(control))
    setMostrarForm(true)
    setError(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setForm(formularioControlVacio(hoyISO(), atletaId))
    setError(null)
  }

  async function guardar() {
    const armado = armarGuardarControl(form)
    if ('error' in armado) {
      setError(armado.error)
      return
    }

    setOcupado(true)
    setError(null)

    try {
      if (form.id) {
        await controlesApi.actualizar(form.id, armado.datos)
      } else {
        await controlesApi.crear(armado.datos)
      }

      if (staff && String(armado.datos.atletaId) !== atletaId) {
        setAtletaId(String(armado.datos.atletaId))
      }

      cerrarForm()
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el control.')
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(control: ControlDto) {
    if (!window.confirm('¿Eliminar este control de gimnasio?')) {
      return
    }

    setOcupado(true)
    setError(null)

    try {
      await controlesApi.eliminar(control.id)
      if (form.id === control.id) {
        cerrarForm()
      }
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar el control.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="controles-gim">
      {staff && (
        <div className="controles-acciones">
          <label>
            Atleta
            <select value={atletaId} onChange={(e) => setAtletaId(e.target.value)}>
              <option value="">Todos</option>
              {atletasActivos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="boton" onClick={abrirNuevo}>
            Nuevo control
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {mostrarForm && staff && (
        <div className="tarjeta">
          <h3>{form.id ? 'Editar control' : 'Nuevo control de gim'}</h3>
          <FormularioControlGim
            form={form}
            onChange={setForm}
            atletas={atletasActivos}
            atletaFijo={form.id != null}
          />
          <div className="acciones-form">
            <button type="button" className="boton" disabled={ocupado} onClick={() => void guardar()}>
              {ocupado ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="boton-fantasma" disabled={ocupado} onClick={cerrarForm}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : (
        <>
          <VistaControlGim
            controles={controles}
            vacio={
              staff
                ? atletaId
                  ? 'Este atleta todavía no tiene controles de gimnasio.'
                  : 'Todavía no hay controles de gimnasio. Elegí un atleta o creá uno nuevo.'
                : 'Todavía no tenés controles de gimnasio cargados.'
            }
          />

          {staff && controles.length > 0 && (
            <ListaAdminControles
              controles={controles}
              ocupado={ocupado}
              onEditar={abrirEditar}
              onEliminar={(c) => void eliminar(c)}
            />
          )}
        </>
      )}
    </div>
  )
}

function PanelAgua({ staff }: { staff: boolean }) {
  const [atletas, setAtletas] = useState<AtletaDto[]>([])
  const [controles, setControles] = useState<ControlDto[]>([])
  const [atletaId, setAtletaId] = useState('')
  const [form, setForm] = useState<FormControlAgua>(() => formularioAguaVacio(hoyISO()))
  const [mostrarForm, setMostrarForm] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)

    try {
      if (staff) {
        const id = atletaId ? Number(atletaId) : undefined
        setControles(await controlesApi.listar({ atletaId: id, tipo: 'Agua' }))
      } else {
        setControles(await controlesApi.mios('Agua'))
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los controles.')
    } finally {
      setCargando(false)
    }
  }, [staff, atletaId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    if (!staff) {
      return
    }

    void atletasApi
      .listar()
      .then(setAtletas)
      .catch(() => setAtletas([]))
  }, [staff])

  const atletasActivos = useMemo(
    () => atletas.filter((a) => a.activo).sort((a, b) => a.apellido.localeCompare(b.apellido)),
    [atletas],
  )

  function abrirNuevo() {
    setForm(formularioAguaVacio(hoyISO(), atletaId))
    setMostrarForm(true)
    setError(null)
  }

  function abrirEditar(control: ControlDto) {
    setForm(formularioDesdeControlAgua(control))
    setMostrarForm(true)
    setError(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setForm(formularioAguaVacio(hoyISO(), atletaId))
    setError(null)
  }

  async function guardar() {
    setOcupado(true)
    setError(null)

    try {
      if (form.id) {
        const armado = armarGuardarControlAgua(form)
        if ('error' in armado) {
          setError(armado.error)
          return
        }
        await controlesApi.actualizar(form.id, armado.datos)
        if (staff && String(armado.datos.atletaId) !== atletaId) {
          setAtletaId(String(armado.datos.atletaId))
        }
      } else {
        const armado = armarGuardarControlesAgua(form)
        if ('error' in armado) {
          setError(armado.error)
          return
        }

        for (const pedido of armado.pedidos) {
          await controlesApi.crear(pedido)
        }

        if (staff && String(armado.pedidos[0].atletaId) !== atletaId) {
          setAtletaId(String(armado.pedidos[0].atletaId))
        }
      }

      cerrarForm()
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el control.')
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(control: ControlDto) {
    if (!window.confirm('¿Eliminar este control de agua?')) {
      return
    }

    setOcupado(true)
    setError(null)

    try {
      await controlesApi.eliminar(control.id)
      if (form.id === control.id) {
        cerrarForm()
      }
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar el control.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="controles-gim">
      {staff && (
        <div className="controles-acciones">
          <label>
            Atleta
            <select value={atletaId} onChange={(e) => setAtletaId(e.target.value)}>
              <option value="">Todos</option>
              {atletasActivos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="boton" onClick={abrirNuevo}>
            Nuevo control
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {mostrarForm && staff && (
        <div className="tarjeta">
          <h3>{form.id ? 'Editar control' : 'Nuevo control de agua'}</h3>
          <FormularioControlAgua
            form={form}
            onChange={setForm}
            atletas={atletasActivos}
            atletaFijo={form.id != null}
          />
          <div className="acciones-form">
            <button type="button" className="boton" disabled={ocupado} onClick={() => void guardar()}>
              {ocupado
                ? 'Guardando…'
                : form.id
                  ? 'Guardar'
                  : form.distancias.length > 1
                    ? `Guardar ${form.distancias.length} controles`
                    : 'Guardar'}
            </button>
            <button type="button" className="boton-fantasma" disabled={ocupado} onClick={cerrarForm}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : (
        <>
          <VistaControlAgua
            controles={controles}
            vacio={
              staff
                ? atletaId
                  ? 'Este atleta todavía no tiene controles de agua.'
                  : 'Todavía no hay controles de agua. Elegí un atleta o creá uno nuevo.'
                : 'Todavía no tenés controles de agua cargados.'
            }
          />

          {staff && controles.length > 0 && (
            <ListaAdminControles
              controles={controles}
              ocupado={ocupado}
              onEditar={abrirEditar}
              onEliminar={(c) => void eliminar(c)}
            />
          )}
        </>
      )}
    </div>
  )
}

function ListaAdminControles({
  controles,
  ocupado,
  onEditar,
  onEliminar,
}: {
  controles: ControlDto[]
  ocupado: boolean
  onEditar: (c: ControlDto) => void
  onEliminar: (c: ControlDto) => void
}) {
  return (
    <ul className="controles-admin-lista">
      {controles.map((c) => (
        <li key={c.id}>
          <span className="sutil">
            #{c.id} ·{' '}
            <NombreAtleta
              nombre={c.atletaNombre ?? `Atleta ${c.atletaId}`}
              color={c.atletaColor}
            />{' '}
            · {c.fecha}
          </span>
          <span className="acciones-fila">
            <button type="button" className="boton-fantasma" onClick={() => onEditar(c)}>
              Editar
            </button>
            <button
              type="button"
              className="boton-fantasma"
              disabled={ocupado}
              onClick={() => onEliminar(c)}
            >
              Eliminar
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}
