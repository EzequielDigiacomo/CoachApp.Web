import {
  Block,
  BlockTitle,
  Button,
  Card,
  List,
  ListInput,
  ListItem,
  Preloader,
  Segmented,
  SegmentedButton,
} from 'konsta/react'
import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { mensajeApi } from '../api/cliente'
import { controlesApi } from '../api/controles'
import { useAuth } from '../auth/contextoAuth'
import { useControlesPanel } from '../hooks/useControlesPanel'
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
import {
  armarGuardarControlTierra,
  armarGuardarControlesTierra,
  FormularioControlTierra,
  formularioDesdeControlTierra,
  formularioTierraVacio,
  type FormControlTierra,
} from '../componentes/FormularioControlTierra'
import { confirmar } from '../componentes/Confirmacion'
import { NombreAtleta } from '../componentes/NombreAtleta'
import { VistaControlAgua } from '../componentes/VistaControlAgua'
import { VistaControlGim } from '../componentes/VistaControlGim'
import { VistaControlTierra } from '../componentes/VistaControlTierra'
import { esStaff, type AtletaDto, type ControlDto, type TipoTrabajo } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'
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
 * Modulo Controles: segmented Gim/Tierra/Agua.
 * Staff carga controles de gim; el atleta solo lee los suyos.
 */
export function ControlesPage() {
  const { tipo: tipoParam } = useParams()
  const navegar = useNavigate()
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)

  if (!slugValido(tipoParam)) {
    return <Navigate to="/controles/gimnasio" replace />
  }

  const tipoActual = TIPOS_MENU.find((t) => t.slug === tipoParam)!

  return (
    <MarcoPagina
      titulo="Controles"
      subtitulo={
        staff
          ? 'Cargá controles por atleta, fuera de las sesiones.'
          : 'Tus controles cargados por el entrenador.'
      }
    >
      <Block className="!mt-3 !mb-2">
        <Segmented strong rounded>
          {TIPOS_MENU.map((item) => (
            <SegmentedButton
              key={item.slug}
              active={item.slug === tipoActual.slug}
              onClick={() => navegar(`/controles/${item.slug}`)}
            >
              {item.etiqueta}
            </SegmentedButton>
          ))}
        </Segmented>
      </Block>

      {tipoActual.slug === 'gimnasio' ? (
        <PanelGimnasio staff={staff} />
      ) : tipoActual.slug === 'tierra' ? (
        <PanelTierra staff={staff} />
      ) : tipoActual.slug === 'agua' ? (
        <PanelAgua staff={staff} />
      ) : (
        <Block>
          <p className="text-[13px] opacity-60">
            Controles de {tipoActual.etiqueta.toLowerCase()}: próximamente.
          </p>
        </Block>
      )}
    </MarcoPagina>
  )
}

/** Selector de atleta + boton de alta (solo staff). */
function BarraControles({
  atletaId,
  onAtleta,
  atletas,
  onNuevo,
}: {
  atletaId: string
  onAtleta: (id: string) => void
  atletas: AtletaDto[]
  onNuevo: () => void
}) {
  return (
    <>
      <List strong inset className="!my-2">
        <ListInput
          label="Atleta"
          type="select"
          dropdown
          value={atletaId}
          onChange={(e) => onAtleta((e.target as HTMLSelectElement).value)}
        >
          <option value="">Todos</option>
          {atletas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.apellido}, {a.nombre}
            </option>
          ))}
        </ListInput>
      </List>
      <Block className="!my-2">
        <Button rounded onClick={onNuevo}>
          Nuevo control
        </Button>
      </Block>
    </>
  )
}

function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) {
    return null
  }

  return (
    <Block className="!my-2">
      <p className="text-[13px] text-red-500">{texto}</p>
    </Block>
  )
}

/** Card con el formulario de alta/edicion y sus botones. */
function TarjetaForm({
  titulo,
  textoGuardar,
  ocupado,
  onGuardar,
  onCancelar,
  children,
}: {
  titulo: string
  textoGuardar: string
  ocupado: boolean
  onGuardar: () => void
  onCancelar: () => void
  children: ReactNode
}) {
  return (
    <Card header={<span className="font-semibold">{titulo}</span>} headerDivider>
      {children}
      <div className="mt-4 flex gap-2">
        <Button rounded className="flex-1" disabled={ocupado} onClick={onGuardar}>
          {textoGuardar}
        </Button>
        <Button rounded outline className="flex-1" disabled={ocupado} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </Card>
  )
}

function CargandoBloque() {
  return (
    <Block className="flex items-center gap-3">
      <Preloader />
      <span className="text-[13px] opacity-60">Cargando…</span>
    </Block>
  )
}

function PanelGimnasio({ staff }: { staff: boolean }) {
  const [atletaId, setAtletaId] = useState('')
  const [form, setForm] = useState<FormControlGim>(() => formularioControlVacio(hoyISO()))
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const { controles, cargando, errorLista, atletasActivos, refrescarControles } =
    useControlesPanel('Gimnasio', staff, atletaId)

  const error = errorLista ?? errorAccion

  function abrirNuevo() {
    setForm(formularioControlVacio(hoyISO(), atletaId))
    setMostrarForm(true)
    setErrorAccion(null)
  }

  function abrirEditar(control: ControlDto) {
    setForm(formularioDesdeControl(control))
    setMostrarForm(true)
    setErrorAccion(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setForm(formularioControlVacio(hoyISO(), atletaId))
    setErrorAccion(null)
  }

  async function guardar() {
    const armado = armarGuardarControl(form)
    if ('error' in armado) {
      setErrorAccion(armado.error)
      return
    }

    setOcupado(true)
    setErrorAccion(null)

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
      await refrescarControles()
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo guardar el control.'))
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(control: ControlDto) {
    if (!(await confirmar('¿Eliminar este control de gimnasio?', { peligro: true, aceptar: 'Eliminar' }))) {
      return
    }

    setOcupado(true)
    setErrorAccion(null)

    try {
      await controlesApi.eliminar(control.id)
      if (form.id === control.id) {
        cerrarForm()
      }
      await refrescarControles()
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo eliminar el control.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {staff && (
        <BarraControles
          atletaId={atletaId}
          onAtleta={setAtletaId}
          atletas={atletasActivos}
          onNuevo={abrirNuevo}
        />
      )}

      <MensajeError texto={error} />

      {mostrarForm && staff && (
        <TarjetaForm
          titulo={form.id ? 'Editar control' : 'Nuevo control de gim'}
          textoGuardar={ocupado ? 'Guardando…' : 'Guardar'}
          ocupado={ocupado}
          onGuardar={() => void guardar()}
          onCancelar={cerrarForm}
        >
          <FormularioControlGim
            form={form}
            onChange={setForm}
            atletas={atletasActivos}
            atletaFijo={form.id != null}
          />
        </TarjetaForm>
      )}

      {cargando ? (
        <CargandoBloque />
      ) : (
        <>
          <div className="px-4 pb-3">
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
          </div>

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
    </>
  )
}

function PanelTierra({ staff }: { staff: boolean }) {
  const [atletaId, setAtletaId] = useState('')
  const [form, setForm] = useState<FormControlTierra>(() => formularioTierraVacio(hoyISO()))
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const { controles, cargando, errorLista, atletasActivos, refrescarControles } =
    useControlesPanel('Tierra', staff, atletaId)

  const error = errorLista ?? errorAccion

  function abrirNuevo() {
    setForm(formularioTierraVacio(hoyISO(), atletaId))
    setMostrarForm(true)
    setErrorAccion(null)
  }

  function abrirEditar(control: ControlDto) {
    setForm(formularioDesdeControlTierra(control))
    setMostrarForm(true)
    setErrorAccion(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setForm(formularioTierraVacio(hoyISO(), atletaId))
    setErrorAccion(null)
  }

  async function guardar() {
    setOcupado(true)
    setErrorAccion(null)

    try {
      if (form.id) {
        const armado = armarGuardarControlTierra(form)
        if ('error' in armado) {
          setErrorAccion(armado.error)
          return
        }
        await controlesApi.actualizar(form.id, armado.datos)
        if (staff && String(armado.datos.atletaId) !== atletaId) {
          setAtletaId(String(armado.datos.atletaId))
        }
      } else {
        const armado = armarGuardarControlesTierra(form)
        if ('error' in armado) {
          setErrorAccion(armado.error)
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
      await refrescarControles()
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo guardar el control.'))
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(control: ControlDto) {
    if (!(await confirmar('¿Eliminar este control de tierra?', { peligro: true, aceptar: 'Eliminar' }))) {
      return
    }

    setOcupado(true)
    setErrorAccion(null)

    try {
      await controlesApi.eliminar(control.id)
      if (form.id === control.id) {
        cerrarForm()
      }
      await refrescarControles()
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo eliminar el control.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {staff && (
        <BarraControles
          atletaId={atletaId}
          onAtleta={setAtletaId}
          atletas={atletasActivos}
          onNuevo={abrirNuevo}
        />
      )}

      <MensajeError texto={error} />

      {mostrarForm && staff && (
        <TarjetaForm
          titulo={form.id ? 'Editar control' : 'Nuevo control de tierra'}
          textoGuardar={
            ocupado
              ? 'Guardando…'
              : form.id
                ? 'Guardar'
                : form.distancias.length > 1
                  ? `Guardar ${form.distancias.length} controles`
                  : 'Guardar'
          }
          ocupado={ocupado}
          onGuardar={() => void guardar()}
          onCancelar={cerrarForm}
        >
          <FormularioControlTierra
            form={form}
            onChange={setForm}
            atletas={atletasActivos}
            atletaFijo={form.id != null}
          />
        </TarjetaForm>
      )}

      {cargando ? (
        <CargandoBloque />
      ) : (
        <>
          <div className="px-4 pb-3">
            <VistaControlTierra
              controles={controles}
              vacio={
                staff
                  ? atletaId
                    ? 'Este atleta todavía no tiene controles de tierra.'
                    : 'Todavía no hay controles de tierra. Elegí un atleta o creá uno nuevo.'
                  : 'Todavía no tenés controles de tierra cargados.'
              }
            />
          </div>

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
    </>
  )
}

function PanelAgua({ staff }: { staff: boolean }) {
  const [atletaId, setAtletaId] = useState('')
  const [form, setForm] = useState<FormControlAgua>(() => formularioAguaVacio(hoyISO()))
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const { controles, cargando, errorLista, atletasActivos, refrescarControles } =
    useControlesPanel('Agua', staff, atletaId)

  const error = errorLista ?? errorAccion

  function abrirNuevo() {
    setForm(formularioAguaVacio(hoyISO(), atletaId))
    setMostrarForm(true)
    setErrorAccion(null)
  }

  function abrirEditar(control: ControlDto) {
    setForm(formularioDesdeControlAgua(control))
    setMostrarForm(true)
    setErrorAccion(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setForm(formularioAguaVacio(hoyISO(), atletaId))
    setErrorAccion(null)
  }

  async function guardar() {
    setOcupado(true)
    setErrorAccion(null)

    try {
      if (form.id) {
        const armado = armarGuardarControlAgua(form)
        if ('error' in armado) {
          setErrorAccion(armado.error)
          return
        }
        await controlesApi.actualizar(form.id, armado.datos)
        if (staff && String(armado.datos.atletaId) !== atletaId) {
          setAtletaId(String(armado.datos.atletaId))
        }
      } else {
        const armado = armarGuardarControlesAgua(form)
        if ('error' in armado) {
          setErrorAccion(armado.error)
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
      await refrescarControles()
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo guardar el control.'))
    } finally {
      setOcupado(false)
    }
  }

  async function eliminar(control: ControlDto) {
    if (!(await confirmar('¿Eliminar este control de agua?', { peligro: true, aceptar: 'Eliminar' }))) {
      return
    }

    setOcupado(true)
    setErrorAccion(null)

    try {
      await controlesApi.eliminar(control.id)
      if (form.id === control.id) {
        cerrarForm()
      }
      await refrescarControles()
    } catch (e) {
      setErrorAccion(mensajeApi(e, 'No se pudo eliminar el control.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      {staff && (
        <BarraControles
          atletaId={atletaId}
          onAtleta={setAtletaId}
          atletas={atletasActivos}
          onNuevo={abrirNuevo}
        />
      )}

      <MensajeError texto={error} />

      {mostrarForm && staff && (
        <TarjetaForm
          titulo={form.id ? 'Editar control' : 'Nuevo control de agua'}
          textoGuardar={
            ocupado
              ? 'Guardando…'
              : form.id
                ? 'Guardar'
                : form.distancias.length > 1
                  ? `Guardar ${form.distancias.length} controles`
                  : 'Guardar'
          }
          ocupado={ocupado}
          onGuardar={() => void guardar()}
          onCancelar={cerrarForm}
        >
          <FormularioControlAgua
            form={form}
            onChange={setForm}
            atletas={atletasActivos}
            atletaFijo={form.id != null}
          />
        </TarjetaForm>
      )}

      {cargando ? (
        <CargandoBloque />
      ) : (
        <>
          <div className="px-4 pb-3">
            <VistaControlAgua
              controles={controles}
              mostrarDiferenciaTestigo={staff}
              vacio={
                staff
                  ? atletaId
                    ? 'Este atleta todavía no tiene controles de agua.'
                    : 'Todavía no hay controles de agua. Elegí un atleta o creá uno nuevo.'
                  : 'Todavía no tenés controles de agua cargados.'
              }
            />
          </div>

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
    </>
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
    <>
      <BlockTitle>Administrar controles</BlockTitle>
      <List strong inset>
        {controles.map((c) => (
          <ListItem
            key={c.id}
            title={
              <NombreAtleta
                nombre={c.atletaNombre ?? `Atleta ${c.atletaId}`}
                color={c.atletaColor}
              />
            }
            subtitle={`#${c.id} · ${c.fecha}${
              c.distanciaMetros != null ? ` · ${c.distanciaMetros} m` : ''
            }${c.tiempo ? ` · ${c.tiempo}` : ''}`}
            after={
              <span className="flex gap-1">
                <Button small clear inline onClick={() => onEditar(c)}>
                  Editar
                </Button>
                <Button
                  small
                  clear
                  inline
                  className="!text-red-500"
                  disabled={ocupado}
                  onClick={() => onEliminar(c)}
                >
                  Eliminar
                </Button>
              </span>
            }
          />
        ))}
      </List>
    </>
  )
}
