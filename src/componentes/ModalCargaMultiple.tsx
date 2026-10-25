import { useState } from 'react'
import { ApiError } from '../api/cliente'
import { etiquetaTipoTrabajo, trabajosApi } from '../api/entrenamientos'
import type { AtletaEnEntrenamientoDto, GuardarTrabajoRequest, TipoTrabajo } from '../tipos/api'
import { horaActual } from '../util/fechas'
import { confirmar } from './Confirmacion'
import { Modal } from './Modal'
import {
  FormularioTrabajo,
  armarRequest,
  nuevoFormulario,
  type FormTrabajo,
} from './FormularioTrabajo'
import { NombreAtleta, textoAtleta } from './NombreAtleta'

interface Props {
  entrenamientoId: number
  /** Tipo fijo de la sesion. */
  tipoSesion: TipoTrabajo
  /** Los atletas elegidos en la tabla de la sesion, hasta cinco. */
  atletas: AtletaEnEntrenamientoDto[]
  onCerrar: () => void
  /** Avisa al detalle de la sesion que cambiaron los trabajos cargados. */
  onCambio: () => void
}

interface Carga {
  atleta: AtletaEnEntrenamientoDto
  form: FormTrabajo
}

/**
 * Carga de trabajos para varios atletas a la vez. El tipo lo fija la sesion;
 * la hora y las observaciones son de la tanda; cada atleta carga sus marcas.
 */
export function ModalCargaMultiple({
  entrenamientoId,
  tipoSesion,
  atletas,
  onCerrar,
  onCambio,
}: Props) {
  const [hora, setHora] = useState(() => horaActual())
  const [observaciones, setObservaciones] = useState('')
  const [cargas, setCargas] = useState<Carga[]>(() =>
    atletas.map((atleta) => ({
      atleta,
      form: { ...nuevoFormulario(tipoSesion), horaInicio: hora },
    })),
  )
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alIntentarCerrar() {
    return confirmar('¿Cancelar la carga? Se pierde lo que no guardaste?', {
      aceptar: 'Cancelar carga',
    })
  }

  /** La hora es de la tanda, asi que se copia en cada formulario. */
  function cambiarHora(valor: string) {
    setHora(valor)
    setCargas((previas) => previas.map((c) => ({ ...c, form: { ...c.form, horaInicio: valor } })))
  }

  function cambiarObservaciones(valor: string) {
    setObservaciones(valor)
    setCargas((previas) =>
      previas.map((c) => ({ ...c, form: { ...c.form, observaciones: valor } })),
    )
  }

  function actualizarForm(atletaId: number, form: FormTrabajo) {
    setCargas((previas) =>
      previas.map((c) => (c.atleta.atletaId === atletaId ? { ...c, form } : c)),
    )
  }

  async function guardar() {
    setError(null)

    const pedidos: { atletaId: number; nombre: string; datos: GuardarTrabajoRequest }[] = []

    for (const carga of cargas) {
      const armado = armarRequest({ ...carga.form, tipo: tipoSesion })
      if ('error' in armado) {
        setError(`${nombreDe(carga.atleta)}: ${armado.error}`)
        return
      }

      pedidos.push({
        atletaId: carga.atleta.atletaId,
        nombre: nombreDe(carga.atleta),
        datos: { ...armado.datos, tipo: tipoSesion },
      })
    }

    setOcupado(true)

    const guardados: number[] = []
    const fallas: { atletaId: number; texto: string }[] = []

    for (const pedido of pedidos) {
      try {
        await trabajosApi.crear(entrenamientoId, pedido.atletaId, pedido.datos)
        guardados.push(pedido.atletaId)
      } catch (e) {
        fallas.push({
          atletaId: pedido.atletaId,
          texto: `${pedido.nombre}: ${e instanceof ApiError ? e.message : 'error al guardar'}`,
        })
      }
    }

    setOcupado(false)

    if (fallas.length === 0) {
      onCambio()
      onCerrar()
      return
    }

    onCambio()

    if (guardados.length === 0) {
      setError(`No se pudo guardar: ${fallas.map((f) => f.texto).join(' · ')}`)
      return
    }

    const fallados = new Set(fallas.map((f) => f.atletaId))
    setCargas((previas) => previas.filter((c) => fallados.has(c.atleta.atletaId)))
    setError(
      `Se guardaron ${guardados.length} de ${pedidos.length}. No se pudieron guardar: ${fallas
        .map((f) => f.texto)
        .join(' · ')}`,
    )
  }

  return (
    <Modal
      titulo="Carga múltiple de trabajos"
      subtitulo={`${cargas.length} ${cargas.length === 1 ? 'atleta' : 'atletas'} · ${etiquetaTipoTrabajo(tipoSesion)}`}
      ancho="grande"
      alIntentarCerrar={alIntentarCerrar}
      onCerrar={onCerrar}
    >
      {error && <p className="error">{error}</p>}

      <div className="carga-multiple">
        <div className="tarjeta carga-multiple-comun">
          <p className="sutil">
            Tipo de la sesión: {etiquetaTipoTrabajo(tipoSesion)}. La hora y las observaciones valen
            para toda la tanda.
          </p>

          <div className="grilla">
            <label>
              Hora de trabajo
              <input
                inputMode="numeric"
                value={hora}
                onChange={(e) => cambiarHora(e.target.value)}
                placeholder="09:30"
              />
            </label>

            <label>
              Observaciones
              <input
                value={observaciones}
                onChange={(e) => cambiarObservaciones(e.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
        </div>

        {cargas.map((carga, indice) => (
          <section className="tarjeta carga-atleta" key={carga.atleta.atletaId}>
            <h4 className="carga-atleta-titulo">
              <NombreAtleta
                nombre={textoAtleta(carga.atleta.apellido, carga.atleta.nombre)}
                color={carga.atleta.color}
              />
              <span className="sutil">
                {' '}
                · {carga.atleta.dni} · {carga.atleta.edad} años
              </span>
            </h4>

            <FormularioTrabajo
              form={carga.form}
              mostrarCabecera={false}
              mostrarAcciones={false}
              tipoFijo
              autoFocus={indice === 0}
              onCambiar={(form) => actualizarForm(carga.atleta.atletaId, form)}
            />
          </section>
        ))}
      </div>

      <div className="form-acciones carga-multiple-acciones">
        <button
          type="button"
          className="boton-fantasma"
          disabled={ocupado}
          onClick={() => {
            void alIntentarCerrar().then((ok) => {
              if (ok) {
                onCerrar()
              }
            })
          }}
        >
          Cancelar
        </button>
        <button type="button" className="boton" disabled={ocupado} onClick={() => void guardar()}>
          {ocupado
            ? 'Guardando…'
            : `Guardar ${cargas.length === 1 ? 'trabajo' : `${cargas.length} trabajos`}`}
        </button>
      </div>
    </Modal>
  )
}

function nombreDe(atleta: AtletaEnEntrenamientoDto): string {
  return `${atleta.apellido}, ${atleta.nombre}`
}
