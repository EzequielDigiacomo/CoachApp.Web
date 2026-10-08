import { useState } from 'react'
import { ApiError } from '../api/cliente'
import { etiquetaTipoTrabajo, trabajosApi } from '../api/entrenamientos'
import type { AtletaEnEntrenamientoDto, GuardarTrabajoRequest, TipoTrabajo } from '../tipos/api'
import { horaActual } from '../util/fechas'
import { Modal } from './Modal'
import {
  FormularioTrabajo,
  TIPOS,
  armarRequest,
  cambiarTipoDe,
  nuevoFormulario,
  type FormTrabajo,
} from './FormularioTrabajo'

interface Props {
  entrenamientoId: number
  /** Los atletas elegidos en la tabla de la sesion, hasta cinco. */
  atletas: AtletaEnEntrenamientoDto[]
  onCerrar: () => void
  /** Avisa al detalle de la sesion que cambiaron los trabajos cargados. */
  onCambio: () => void
}

/** Tipo con el que arranca la carga. Las ppm son de agua, el caso mas completo. */
const TIPO_INICIAL: TipoTrabajo = 'Agua'

interface Carga {
  atleta: AtletaEnEntrenamientoDto
  form: FormTrabajo
}

/**
 * Carga de trabajos para varios atletas a la vez. El tipo, la hora y las
 * observaciones son de la tanda entera; cada atleta carga sus propias
 * distancias, tiempos y ppm, porque el cronometro trae todo en una sola toma.
 * Un solo boton guarda los trabajos de todos.
 */
export function ModalCargaMultiple({ entrenamientoId, atletas, onCerrar, onCambio }: Props) {
  const [tipo, setTipo] = useState<TipoTrabajo>(TIPO_INICIAL)
  const [hora, setHora] = useState(() => horaActual())
  const [observaciones, setObservaciones] = useState('')
  const [cargas, setCargas] = useState<Carga[]>(() =>
    atletas.map((atleta) => ({
      atleta,
      form: { ...nuevoFormulario(TIPO_INICIAL), horaInicio: hora },
    })),
  )
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** El tipo es de la tanda: cambia la grilla de todos los formularios. */
  function cambiarTipo(nuevo: TipoTrabajo) {
    setTipo(nuevo)
    setCargas((previas) => previas.map((c) => ({ ...c, form: cambiarTipoDe(c.form, nuevo) })))
  }

  /** La hora tambien es de la tanda, asi que se copia en cada formulario. */
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

    // Primero se valida todo: si algo esta mal, no se guarda ningun trabajo.
    const pedidos: { atletaId: number; nombre: string; datos: GuardarTrabajoRequest }[] = []

    for (const carga of cargas) {
      const armado = armarRequest(carga.form)
      if ('error' in armado) {
        setError(`${nombreDe(carga.atleta)}: ${armado.error}`)
        return
      }

      pedidos.push({
        atletaId: carga.atleta.atletaId,
        nombre: nombreDe(carga.atleta),
        datos: armado.datos,
      })
    }

    setOcupado(true)

    const guardados: number[] = []
    const fallas: { atletaId: number; texto: string }[] = []

    // El backend guarda de a un atleta, asi que se manda uno por vez.
    for (const pedido of pedidos) {
      try {
        await trabajosApi.crear(entrenamientoId, pedido.atletaId, pedido.datos)
        guardados.push(pedido.atletaId)
      } catch (e) {
        fallas.push({
          atletaId: pedido.atletaId,
          texto: `${pedido.nombre}: ${e instanceof ApiError ? e.message : 'no se pudo guardar'}`,
        })
      }
    }

    setOcupado(false)

    if (guardados.length > 0) {
      onCambio()
    }

    if (fallas.length === 0) {
      onCerrar()
      return
    }

    // Quedan en pantalla solo los que fallaron, para no volver a guardar los
    // que ya entraron si se toca Guardar otra vez.
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
      subtitulo={`${cargas.length} ${cargas.length === 1 ? 'atleta' : 'atletas'} · un trabajo por atleta`}
      ancho="grande"
      onCerrar={onCerrar}
    >
      {error && <p className="error">{error}</p>}

      <div className="carga-multiple">
        <div className="tarjeta carga-multiple-comun">
          <p className="sutil">
            El tipo, la hora y las observaciones valen para toda la tanda. Cada atleta carga sus
            propias distancias, tiempos y ppm, y al final se guardan todos juntos.
          </p>

          <div className="grilla">
            <label>
              Tipo de trabajo
              <select value={tipo} onChange={(e) => cambiarTipo(e.target.value as TipoTrabajo)}>
                {TIPOS.map((opcion) => (
                  <option value={opcion} key={opcion}>
                    {etiquetaTipoTrabajo(opcion)}
                  </option>
                ))}
              </select>
            </label>

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
              {carga.atleta.apellido}, {carga.atleta.nombre}
              <span className="sutil">
                {' '}
                · {carga.atleta.dni} · {carga.atleta.edad} años
              </span>
            </h4>

            <FormularioTrabajo
              form={carga.form}
              mostrarCabecera={false}
              mostrarAcciones={false}
              autoFocus={indice === 0}
              onCambiar={(form) => actualizarForm(carga.atleta.atletaId, form)}
            />
          </section>
        ))}
      </div>

      <div className="form-acciones carga-multiple-acciones">
        <button type="button" className="boton-fantasma" disabled={ocupado} onClick={onCerrar}>
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
