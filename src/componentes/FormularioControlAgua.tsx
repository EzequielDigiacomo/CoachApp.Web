import type { ControlDto, GuardarControlRequest } from '../tipos/api'
import { kilometrosPorHora, parsearTiempo, textoKmh } from '../util/tiempos'
import { CampoTiempo } from './CampoTiempo'

export interface BloqueDistanciaAgua {
  clave: number
  distanciaMetros: string
  tiempo: string
  tiempoTestigo: string
  anioTestigo: string
}

export interface FormControlAgua {
  /** Solo en edición de un control ya guardado. */
  id: number | null
  atletaId: string
  fecha: string
  observaciones: string
  distancias: BloqueDistanciaAgua[]
}

let proximaClave = 1

function clave(): number {
  return proximaClave++
}

function nuevoBloque(distancia = '1000'): BloqueDistanciaAgua {
  return {
    clave: clave(),
    distanciaMetros: distancia,
    tiempo: '',
    tiempoTestigo: '',
    anioTestigo: String(new Date().getFullYear()),
  }
}

export function formularioAguaVacio(fecha: string, atletaId = ''): FormControlAgua {
  return {
    id: null,
    atletaId,
    fecha,
    observaciones: '',
    distancias: [nuevoBloque('1000')],
  }
}

export function formularioDesdeControlAgua(control: ControlDto): FormControlAgua {
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
        tiempoTestigo: control.tiempoTestigo ?? '',
        anioTestigo:
          control.anioTestigo != null ? String(control.anioTestigo) : String(new Date().getFullYear()),
      },
    ],
  }
}

function armarBloque(
  bloque: BloqueDistanciaAgua,
  indice: number,
): { datos: Omit<GuardarControlRequest, 'atletaId' | 'tipo' | 'fecha' | 'observaciones' | 'ejercicios'> } | { error: string } {
  const etiqueta = `Distancia ${indice + 1}`
  const distanciaMetros = Number(bloque.distanciaMetros)
  if (!Number.isFinite(distanciaMetros) || distanciaMetros <= 0) {
    return { error: `${etiqueta}: indicá la distancia en metros.` }
  }

  if (!bloque.tiempo.trim() || parsearTiempo(bloque.tiempo) === null) {
    return { error: `${etiqueta}: el tiempo no es válido. Usá el formato m:ss,cc.` }
  }

  const tieneTestigo = bloque.tiempoTestigo.trim().length > 0
  if (tieneTestigo && parsearTiempo(bloque.tiempoTestigo) === null) {
    return { error: `${etiqueta}: el tiempo testigo no es válido.` }
  }

  let anioTestigo: number | null = null
  if (tieneTestigo) {
    anioTestigo = Number(bloque.anioTestigo)
    if (!Number.isInteger(anioTestigo) || anioTestigo < 1990 || anioTestigo > 2100) {
      return { error: `${etiqueta}: indicá el año del tiempo testigo.` }
    }
  }

  return {
    datos: {
      distanciaMetros,
      tiempo: bloque.tiempo.trim(),
      tiempoTestigo: tieneTestigo ? bloque.tiempoTestigo.trim() : null,
      anioTestigo,
    },
  }
}

/** Arma uno o varios requests: un control de agua por cada distancia. */
export function armarGuardarControlesAgua(
  form: FormControlAgua,
): { pedidos: GuardarControlRequest[] } | { error: string } {
  const atletaId = Number(form.atletaId)
  if (!Number.isInteger(atletaId) || atletaId <= 0) {
    return { error: 'Elegí un atleta.' }
  }

  if (!form.fecha.trim()) {
    return { error: 'Indicá la fecha del control.' }
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
      tipo: 'Agua',
      fecha: form.fecha,
      observaciones: form.observaciones.trim() || null,
      ejercicios: [],
      ...armado.datos,
    })
  }

  return { pedidos }
}

/** Compat: un solo request (edición). */
export function armarGuardarControlAgua(
  form: FormControlAgua,
): { datos: GuardarControlRequest } | { error: string } {
  const armado = armarGuardarControlesAgua(form)
  if ('error' in armado) {
    return armado
  }
  return { datos: armado.pedidos[0] }
}

interface Props {
  form: FormControlAgua
  onChange: (form: FormControlAgua) => void
  atletas: { id: number; nombre: string; apellido: string; categorias?: string[] }[]
  atletaFijo?: boolean
}

export function FormularioControlAgua({ form, onChange, atletas, atletaFijo }: Props) {
  function setForm(parcial: Partial<FormControlAgua>) {
    onChange({ ...form, ...parcial })
  }

  function actualizarBloque(claveBloque: number, parcial: Partial<BloqueDistanciaAgua>) {
    setForm({
      distancias: form.distancias.map((b) => (b.clave === claveBloque ? { ...b, ...parcial } : b)),
    })
  }

  const atleta = atletas.find((a) => String(a.id) === form.atletaId)
  const categoria = atleta?.categorias?.[0] ?? null
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
          Fecha
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ fecha: e.target.value })}
          />
        </label>
      </div>

      {form.distancias.map((bloque, indice) => (
        <BloqueDistancia
          key={bloque.clave}
          indice={indice}
          bloque={bloque}
          categoria={categoria}
          sePuedeQuitar={!editando && form.distancias.length > 1}
          onChange={(parcial) => actualizarBloque(bloque.clave, parcial)}
          onQuitar={() =>
            setForm({
              distancias: form.distancias.filter((b) => b.clave !== bloque.clave),
            })
          }
        />
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

function BloqueDistancia({
  indice,
  bloque,
  categoria,
  sePuedeQuitar,
  onChange,
  onQuitar,
}: {
  indice: number
  bloque: BloqueDistanciaAgua
  categoria: string | null
  sePuedeQuitar: boolean
  onChange: (parcial: Partial<BloqueDistanciaAgua>) => void
  onQuitar: () => void
}) {
  const metros = Number(bloque.distanciaMetros)
  const kmh =
    Number.isFinite(metros) && metros > 0 && bloque.tiempo.trim()
      ? kilometrosPorHora(metros, bloque.tiempo)
      : null

  let diferencia: string | null = null
  if (bloque.tiempo.trim() && bloque.tiempoTestigo.trim()) {
    const logrado = parsearTiempo(bloque.tiempo)
    const testigo = parsearTiempo(bloque.tiempoTestigo)
    if (logrado !== null && testigo !== null) {
      const delta = logrado - testigo
      const abs = Math.abs(delta)
      const min = Math.floor(abs / 6000)
      const seg = Math.floor((abs % 6000) / 100)
      const cen = abs % 100
      const cuerpo =
        cen > 0
          ? `${min}:${String(seg).padStart(2, '0')},${String(cen).padStart(2, '0')}`.replace(/0+$/, '')
          : `${min}:${String(seg).padStart(2, '0')}`
      diferencia = `${delta < 0 ? '-' : '+'}${cuerpo}`
    }
  }

  return (
    <div className="tarjeta control-bloque">
      <div className="encabezado-compacto">
        <strong>Distancia {indice + 1}</strong>
        {sePuedeQuitar && (
          <button type="button" className="boton-fantasma" onClick={onQuitar}>
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
            onChange={(e) => onChange({ distanciaMetros: e.target.value })}
            placeholder="1000"
          />
        </label>

        <label>
          Tiempo
          <CampoTiempo valor={bloque.tiempo} onChange={(tiempo) => onChange({ tiempo })} />
        </label>
      </div>

      <div className="grilla">
        <label>
          Tiempo testigo
          <CampoTiempo
            valor={bloque.tiempoTestigo}
            onChange={(tiempoTestigo) => onChange({ tiempoTestigo })}
          />
        </label>

        <label>
          Año testigo
          <input
            inputMode="numeric"
            value={bloque.anioTestigo}
            onChange={(e) => onChange({ anioTestigo: e.target.value })}
            placeholder="2026"
            disabled={!bloque.tiempoTestigo.trim()}
          />
        </label>
      </div>

      <div className="control-agua-preview">
        <div>
          <span className="sutil">Velocidad promedio</span>
          <strong>{kmh != null ? `${textoKmh(kmh)} km/h` : '—'}</strong>
        </div>
        <div>
          <span className="sutil">Categoría</span>
          <strong>{categoria ?? '—'}</strong>
        </div>
        <div>
          <span className="sutil">vs testigo</span>
          <strong>{diferencia ?? '—'}</strong>
        </div>
      </div>
    </div>
  )
}
