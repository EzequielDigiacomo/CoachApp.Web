import type { ControlDto, GuardarControlRequest } from '../tipos/api'
import { kilometrosPorHora, parsearTiempo, textoKmh } from '../util/tiempos'
import { CampoTiempo } from './CampoTiempo'

export interface BloqueDistanciaTierra {
  clave: number
  distanciaMetros: string
  tiempo: string
}

export interface FormControlTierra {
  id: number | null
  atletaId: string
  fecha: string
  observaciones: string
  distancias: BloqueDistanciaTierra[]
}

let proximaClave = 1

function clave(): number {
  return proximaClave++
}

function nuevoBloque(distancia = '1000'): BloqueDistanciaTierra {
  return { clave: clave(), distanciaMetros: distancia, tiempo: '' }
}

export function formularioTierraVacio(fecha: string, atletaId = ''): FormControlTierra {
  return {
    id: null,
    atletaId,
    fecha,
    observaciones: '',
    distancias: [nuevoBloque('1000')],
  }
}

export function formularioDesdeControlTierra(control: ControlDto): FormControlTierra {
  return {
    id: control.id,
    atletaId: String(control.atletaId),
    fecha: control.fecha,
    observaciones: control.observaciones ?? '',
    distancias: [
      {
        clave: clave(),
        distanciaMetros: control.distanciaMetros != null ? String(control.distanciaMetros) : '',
        tiempo: control.tiempo ?? '',
      },
    ],
  }
}

function armarBloque(
  bloque: BloqueDistanciaTierra,
  indice: number,
): { distanciaMetros: number; tiempo: string } | { error: string } {
  const etiqueta = `Distancia ${indice + 1}`
  const distanciaMetros = Number(bloque.distanciaMetros)
  if (!Number.isFinite(distanciaMetros) || distanciaMetros <= 0) {
    return { error: `${etiqueta}: indicá la distancia en metros.` }
  }

  if (!bloque.tiempo.trim() || parsearTiempo(bloque.tiempo) === null) {
    return { error: `${etiqueta}: el tiempo no es válido. Usá el formato m:ss,cc.` }
  }

  return { distanciaMetros, tiempo: bloque.tiempo.trim() }
}

export function armarGuardarControlesTierra(
  form: FormControlTierra,
): { pedidos: GuardarControlRequest[] } | { error: string } {
  const atletaId = Number(form.atletaId)
  if (!Number.isInteger(atletaId) || atletaId <= 0) {
    return { error: 'Elegí un atleta.' }
  }

  if (!form.fecha.trim()) {
    return { error: 'Indicá la fecha de realización.' }
  }

  if (form.distancias.length === 0) {
    return { error: 'Agregá al menos una distancia.' }
  }

  const pedidos: GuardarControlRequest[] = []
  for (let i = 0; i < form.distancias.length; i++) {
    const armado = armarBloque(form.distancias[i], i)
    if ('error' in armado) {
      return armado
    }

    pedidos.push({
      atletaId,
      tipo: 'Tierra',
      fecha: form.fecha,
      distanciaMetros: armado.distanciaMetros,
      tiempo: armado.tiempo,
      observaciones: form.observaciones.trim() || null,
      ejercicios: [],
    })
  }

  return { pedidos }
}

export function armarGuardarControlTierra(
  form: FormControlTierra,
): { datos: GuardarControlRequest } | { error: string } {
  const armado = armarGuardarControlesTierra(form)
  if ('error' in armado) {
    return armado
  }
  return { datos: armado.pedidos[0] }
}

interface Props {
  form: FormControlTierra
  onChange: (form: FormControlTierra) => void
  atletas: { id: number; nombre: string; apellido: string }[]
  atletaFijo?: boolean
}

export function FormularioControlTierra({ form, onChange, atletas, atletaFijo }: Props) {
  function setForm(parcial: Partial<FormControlTierra>) {
    onChange({ ...form, ...parcial })
  }

  function actualizarBloque(claveBloque: number, parcial: Partial<BloqueDistanciaTierra>) {
    setForm({
      distancias: form.distancias.map((b) => (b.clave === claveBloque ? { ...b, ...parcial } : b)),
    })
  }

  const editando = form.id != null

  return (
    <div className="formulario">
      <div className="grilla">
        <label>
          Atleta
          <select
            value={form.atletaId}
            disabled={atletaFijo}
            onChange={(e) => setForm({ atletaId: e.target.value })}
          >
            <option value="">Elegí un atleta…</option>
            {atletas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.apellido}, {a.nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fecha de realización
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ fecha: e.target.value })}
          />
        </label>
      </div>

      {form.distancias.map((bloque, indice) => (
        <div className="tarjeta control-bloque" key={bloque.clave}>
          <div className="encabezado-compacto">
            <strong>Distancia {indice + 1}</strong>
            {!editando && form.distancias.length > 1 && (
              <button
                type="button"
                className="boton-fantasma"
                onClick={() =>
                  setForm({
                    distancias: form.distancias.filter((b) => b.clave !== bloque.clave),
                  })
                }
              >
                Quitar
              </button>
            )}
          </div>

          <div className="grilla">
            <label>
              Distancia (m)
              <input
                inputMode="numeric"
                value={bloque.distanciaMetros}
                onChange={(e) => actualizarBloque(bloque.clave, { distanciaMetros: e.target.value })}
                placeholder="1000"
              />
            </label>

            <label>
              Tiempo
              <CampoTiempo
                valor={bloque.tiempo}
                onChange={(tiempo) => actualizarBloque(bloque.clave, { tiempo })}
              />
            </label>
          </div>

          <PreviewVelocidad distanciaMetros={bloque.distanciaMetros} tiempo={bloque.tiempo} />
        </div>
      ))}

      {!editando && (
        <button
          type="button"
          className="boton-fantasma"
          onClick={() => setForm({ distancias: [...form.distancias, nuevoBloque('500')] })}
        >
          + Agregar distancia
        </button>
      )}

      <label>
        Observaciones
        <input
          value={form.observaciones}
          maxLength={300}
          onChange={(e) => setForm({ observaciones: e.target.value })}
          placeholder="Opcional"
        />
      </label>
    </div>
  )
}

function PreviewVelocidad({ distanciaMetros, tiempo }: { distanciaMetros: string; tiempo: string }) {
  const metros = Number(distanciaMetros)
  const kmh =
    Number.isFinite(metros) && metros > 0 && tiempo.trim()
      ? kilometrosPorHora(metros, tiempo)
      : null

  return (
    <div className="control-agua-preview">
      <div>
        <span className="sutil">Velocidad promedio</span>
        <strong>{kmh != null ? `${textoKmh(kmh)} km/h` : '—'}</strong>
      </div>
    </div>
  )
}
