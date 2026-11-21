import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { Badge, Block, BlockTitle, Button, List, ListInput, ListItem, Preloader } from 'konsta/react'
import { Link, useNavigate } from 'react-router-dom'
import { mensajeApi } from '../api/cliente'
import { clavesConsulta } from '../api/clavesConsulta'
import { entrenamientosApi, etiquetaTipoTrabajo, etiquetaTurno } from '../api/entrenamientos'
import { useAuth } from '../auth/contextoAuth'
import { ModalImportarPlanilla } from '../componentes/ModalImportarPlanilla'
import { linkRouter } from '../ui/konstaRouter'
import { MarcoPagina } from '../ui/MarcoPagina'
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

/** Color de la etiqueta según el tipo de trabajo de la sesión. */
const COLOR_TIPO: Record<string, string> = {
  Gimnasio: 'bg-orange-500',
  Tierra: 'bg-amber-700',
  Agua: 'bg-sky-500',
}

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
    <MarcoPagina
      titulo="Entrenamientos"
      right={
        staff ? (
          <Button inline small rounded onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? 'Cancelar' : 'Nueva sesión'}
          </Button>
        ) : undefined
      }
    >
      {mostrarForm && <FormularioEntrenamiento onCreado={creado} />}

      <List strong inset>
        <ListInput
          label="Desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        <ListInput
          label="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
        />
        <ListInput
          label="Turno"
          type="select"
          dropdown
          value={turno}
          onChange={(e) => setTurno(e.target.value as Turno | '')}
        >
          <option value="">Todos</option>
          <option value="Manana">Mañana</option>
          <option value="Tarde">Tarde</option>
        </ListInput>
      </List>

      <Block className="!mt-0">
        <Button
          type="button"
          rounded
          tonal
          onClick={() => {
            setDesde('')
            setHasta('')
            setTurno('')
          }}
        >
          Ver todo
        </Button>
      </Block>

      {error && (
        <Block>
          <p className="text-red-500">{error}</p>
        </Block>
      )}

      {listado.isPending ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : entrenamientos.length === 0 ? (
        <Block>
          <p className="opacity-60">No hay sesiones cargadas para esos filtros.</p>
        </Block>
      ) : (
        porFecha.map(([fecha, sesiones]) => (
          <div key={fecha}>
            <BlockTitle className={esPasado(fecha) ? 'opacity-60' : undefined}>
              {fechaLarga(fecha)}
              <span className="font-normal opacity-60"> · {fechaCorta(fecha)}</span>
            </BlockTitle>

            <List strong inset>
              {sesiones.map((item) => {
                const tipo = item.tipo ?? 'Agua'
                const detalle = [
                  staff
                    ? item.cantidadAtletas === 0
                      ? 'Sin atletas'
                      : `${item.cantidadPresentes}/${item.cantidadAtletas} presentes`
                    : null,
                  item.club,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <ListItem
                    key={item.id}
                    link
                    linkComponent={linkRouter(Link)}
                    linkProps={{ to: `/entrenamientos/${item.id}` }}
                    title={`Sesión ${item.sesion} · ${etiquetaTurno(item.turno)}`}
                    subtitle={item.descripcion || undefined}
                    footer={detalle || undefined}
                    after={
                      <Badge colors={{ bg: COLOR_TIPO[tipo] ?? 'bg-primary' }}>
                        {etiquetaTipoTrabajo(tipo)}
                      </Badge>
                    }
                  />
                )
              })}
            </List>
          </div>
        ))
      )}
    </MarcoPagina>
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
      <form onSubmit={guardar}>
        <List strong inset>
          <ListInput
            label="Fecha"
            type="date"
            value={datos.fecha}
            onChange={(e) => setDatos((d) => ({ ...d, fecha: e.target.value }))}
            required
          />
          <ListInput
            label="Turno"
            type="select"
            dropdown
            value={datos.turno}
            onChange={(e) => setDatos((d) => ({ ...d, turno: e.target.value as Turno }))}
          >
            <option value="Manana">Mañana</option>
            <option value="Tarde">Tarde</option>
          </ListInput>
          <ListInput
            label="Sesión"
            type="select"
            dropdown
            value={datos.sesion}
            onChange={(e) => setDatos((d) => ({ ...d, sesion: Number(e.target.value) }))}
          >
            {SESIONES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </ListInput>
          <ListInput
            label="Tipo"
            type="select"
            dropdown
            value={datos.tipo}
            onChange={(e) => setDatos((d) => ({ ...d, tipo: e.target.value as TipoTrabajo }))}
            required
          >
            <option value="Gimnasio">Gimnasio</option>
            <option value="Tierra">Tierra</option>
            <option value="Agua">Agua</option>
          </ListInput>
          <ListInput
            label="Club"
            type="text"
            value={datos.club ?? ''}
            onChange={(e) => setDatos((d) => ({ ...d, club: e.target.value }))}
          />
          <ListInput
            label="Descripción"
            type="text"
            value={datos.descripcion ?? ''}
            onChange={(e) => setDatos((d) => ({ ...d, descripcion: e.target.value }))}
            placeholder="Trabajo de velocidad, fondo, técnica…"
          />
        </List>

        <Block className="space-y-2 !mt-0">
          <Button type="button" rounded tonal onClick={() => setMostrarPlanilla(true)}>
            Traer de la planilla
          </Button>

          {descripcionLarga && (
            <p className="text-red-500">
              La descripción tiene {datos.descripcion?.length ?? 0} caracteres y el límite es 500.
            </p>
          )}

          {error && <p className="text-red-500">{error}</p>}

          <Button type="submit" rounded disabled={crear.isPending || descripcionLarga}>
            {crear.isPending ? 'Creando…' : 'Crear sesión'}
          </Button>
        </Block>
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
