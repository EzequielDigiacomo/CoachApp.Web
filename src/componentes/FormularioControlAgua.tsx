import type { ControlDto, GuardarControlRequest } from '../tipos/api'
import { kilometrosPorHora, parsearTiempo, textoKmh } from '../util/tiempos'
import { CampoTiempo } from './CampoTiempo'

export interface FormControlAgua {
  id: number | null
  atletaId: string
  fecha: string
  distanciaMetros: string
  tiempo: string
  tiempoTestigo: string
  anioTestigo: string
  observaciones: string
}

export function formularioAguaVacio(fecha: string, atletaId = ''): FormControlAgua {
  return {
    id: null,
    atletaId,
    fecha,
    distanciaMetros: '1000',
    tiempo: '',
    tiempoTestigo: '',
    anioTestigo: String(new Date().getFullYear()),
    observaciones: '',
  }
}

export function formularioDesdeControlAgua(control: ControlDto): FormControlAgua {
  return {
    id: control.id,
    atletaId: String(control.atletaId),
    fecha: control.fecha,
    distanciaMetros: control.distanciaMetros != null ? String(control.distanciaMetros) : '',
    tiempo: control.tiempo ?? '',
    tiempoTestigo: control.tiempoTestigo ?? '',
    anioTestigo: control.anioTestigo != null ? String(control.anioTestigo) : String(new Date().getFullYear()),
    observaciones: control.observaciones ?? '',
  }
}

export function armarGuardarControlAgua(
  form: FormControlAgua,
): { datos: GuardarControlRequest } | { error: string } {
  const atletaId = Number(form.atletaId)
  if (!Number.isInteger(atletaId) || atletaId <= 0) {
    return { error: 'Elegí un atleta.' }
  }

  if (!form.fecha.trim()) {
    return { error: 'Indicá la fecha del control.' }
  }

  const distanciaMetros = Number(form.distanciaMetros)
  if (!Number.isFinite(distanciaMetros) || distanciaMetros <= 0) {
    return { error: 'Indicá la distancia en metros.' }
  }

  if (!form.tiempo.trim() || parsearTiempo(form.tiempo) === null) {
    return { error: 'El tiempo no es válido. Usá el formato m:ss,cc.' }
  }

  const tieneTestigo = form.tiempoTestigo.trim().length > 0
  if (tieneTestigo && parsearTiempo(form.tiempoTestigo) === null) {
    return { error: 'El tiempo testigo no es válido.' }
  }

  let anioTestigo: number | null = null
  if (tieneTestigo) {
    anioTestigo = Number(form.anioTestigo)
    if (!Number.isInteger(anioTestigo) || anioTestigo < 1990 || anioTestigo > 2100) {
      return { error: 'Indicá el año del tiempo testigo.' }
    }
  }

  return {
    datos: {
      atletaId,
      tipo: 'Agua',
      fecha: form.fecha,
      distanciaMetros,
      tiempo: form.tiempo.trim(),
      tiempoTestigo: tieneTestigo ? form.tiempoTestigo.trim() : null,
      anioTestigo,
      observaciones: form.observaciones.trim() || null,
      ejercicios: [],
    },
  }
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

  const metros = Number(form.distanciaMetros)
  const kmh =
    Number.isFinite(metros) && metros > 0 && form.tiempo.trim()
      ? kilometrosPorHora(metros, form.tiempo)
      : null

  const atleta = atletas.find((a) => String(a.id) === form.atletaId)
  const categoria = atleta?.categorias?.[0] ?? null

  let diferencia: string | null = null
  if (form.tiempo.trim() && form.tiempoTestigo.trim()) {
    const logrado = parsearTiempo(form.tiempo)
    const testigo = parsearTiempo(form.tiempoTestigo)
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

      <div className="grilla">
        <label>
          Distancia (m)
          <input
            inputMode="numeric"
            value={form.distanciaMetros}
            onChange={(e) => setForm({ distanciaMetros: e.target.value })}
            placeholder="1000"
          />
        </label>

        <label>
          Tiempo
          <CampoTiempo valor={form.tiempo} onChange={(tiempo) => setForm({ tiempo })} />
        </label>
      </div>

      <div className="grilla">
        <label>
          Tiempo testigo
          <CampoTiempo
            valor={form.tiempoTestigo}
            onChange={(tiempoTestigo) => setForm({ tiempoTestigo })}
          />
        </label>

        <label>
          Año testigo
          <input
            inputMode="numeric"
            value={form.anioTestigo}
            onChange={(e) => setForm({ anioTestigo: e.target.value })}
            placeholder="2026"
            disabled={!form.tiempoTestigo.trim()}
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
