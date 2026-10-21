import type { ControlDto, GuardarControlRequest } from '../tipos/api'

export interface FilaSerieControl {
  clave: number
  repeticiones: string
  peso: string
  esUnoRm: boolean
}

export interface BloqueEjercicioControl {
  clave: number
  nombre: string
  series: FilaSerieControl[]
}

export interface FormControlGim {
  id: number | null
  atletaId: string
  fecha: string
  esAutoCarga: boolean
  observaciones: string
  ejercicios: BloqueEjercicioControl[]
}

let proximaClave = 1

function clave(): number {
  return proximaClave++
}

function nuevaSerie(esUnoRm = false): FilaSerieControl {
  return { clave: clave(), repeticiones: '1', peso: '', esUnoRm }
}

function nuevoBloque(): BloqueEjercicioControl {
  return { clave: clave(), nombre: '', series: [nuevaSerie()] }
}

export function formularioControlVacio(fecha: string, atletaId = ''): FormControlGim {
  return {
    id: null,
    atletaId,
    fecha,
    esAutoCarga: false,
    observaciones: '',
    ejercicios: [nuevoBloque()],
  }
}

export function formularioDesdeControl(control: ControlDto): FormControlGim {
  return {
    id: control.id,
    atletaId: String(control.atletaId),
    fecha: control.fecha,
    esAutoCarga: Boolean(control.esAutoCarga),
    observaciones: control.observaciones ?? '',
    ejercicios:
      control.ejercicios.length > 0
        ? control.ejercicios.map((e) => ({
            clave: clave(),
            nombre: e.nombre,
            series: e.series.map((s) => ({
              clave: clave(),
              repeticiones: String(s.repeticiones),
              peso: s.pesoKg == null ? '' : String(s.pesoKg),
              esUnoRm: s.esUnoRm,
            })),
          }))
        : [nuevoBloque()],
  }
}

export function armarGuardarControl(
  form: FormControlGim,
): { datos: GuardarControlRequest } | { error: string } {
  const atletaId = Number(form.atletaId)
  if (!Number.isInteger(atletaId) || atletaId <= 0) {
    return { error: 'Elegí un atleta.' }
  }

  if (!form.fecha.trim()) {
    return { error: 'Indicá la fecha del control.' }
  }

  const auto = form.esAutoCarga
  const ejercicios = []

  for (let i = 0; i < form.ejercicios.length; i++) {
    const bloque = form.ejercicios[i]
    const nombre = bloque.nombre.trim()
    if (!nombre) {
      return { error: `El ejercicio ${i + 1} necesita un nombre.` }
    }

    const series = []
    let marcadas = 0
    for (let j = 0; j < bloque.series.length; j++) {
      const fila = bloque.series[j]
      const repeticiones = Number(fila.repeticiones)

      if (!Number.isFinite(repeticiones) || repeticiones <= 0) {
        return { error: `La serie ${j + 1} de ${nombre} necesita repeticiones.` }
      }

      if (auto) {
        series.push({
          repeticiones,
          pesoKg: null,
          esUnoRm: false,
        })
        continue
      }

      const pesoKg = Number(fila.peso.replace(',', '.'))
      if (!Number.isFinite(pesoKg) || pesoKg < 0) {
        return { error: `La serie ${j + 1} de ${nombre} tiene un peso inválido.` }
      }
      if (fila.esUnoRm) {
        marcadas++
        if (pesoKg <= 0) {
          return { error: `La serie marcada como 1RM de ${nombre} necesita un peso.` }
        }
      }

      series.push({
        repeticiones,
        pesoKg,
        esUnoRm: fila.esUnoRm,
      })
    }

    if (series.length === 0) {
      return { error: `${nombre} necesita al menos una serie.` }
    }
    if (!auto && marcadas > 1) {
      return { error: `${nombre} solo puede tener una serie marcada como 1RM.` }
    }

    ejercicios.push({ nombre, series })
  }

  if (ejercicios.length === 0) {
    return { error: 'Agregá al menos un ejercicio.' }
  }

  return {
    datos: {
      atletaId,
      tipo: 'Gimnasio',
      fecha: form.fecha,
      esAutoCarga: auto,
      observaciones: form.observaciones.trim() || null,
      ejercicios,
    },
  }
}

interface Props {
  form: FormControlGim
  onChange: (form: FormControlGim) => void
  atletas: { id: number; nombre: string; apellido: string }[]
  /** Si true, el atleta no se puede cambiar (edicion). */
  atletaFijo?: boolean
}

export function FormularioControlGim({ form, onChange, atletas, atletaFijo }: Props) {
  function setForm(parcial: Partial<FormControlGim>) {
    onChange({ ...form, ...parcial })
  }

  function activarAutoCarga(activo: boolean) {
    if (!activo) {
      setForm({ esAutoCarga: false })
      return
    }

    // Al pasar a auto carga se limpian kilos y 1RM.
    setForm({
      esAutoCarga: true,
      ejercicios: form.ejercicios.map((e) => ({
        ...e,
        series: e.series.map((s) => ({ ...s, peso: '', esUnoRm: false })),
      })),
    })
  }

  function actualizarEjercicio(claveEj: number, parcial: Partial<BloqueEjercicioControl>) {
    setForm({
      ejercicios: form.ejercicios.map((e) => (e.clave === claveEj ? { ...e, ...parcial } : e)),
    })
  }

  function actualizarSerie(
    claveEj: number,
    claveSerie: number,
    parcial: Partial<FilaSerieControl>,
  ) {
    setForm({
      ejercicios: form.ejercicios.map((e) => {
        if (e.clave !== claveEj) {
          return e
        }

        let series = e.series.map((s) => (s.clave === claveSerie ? { ...s, ...parcial } : s))

        if (parcial.esUnoRm === true) {
          series = series.map((s) => ({
            ...s,
            esUnoRm: s.clave === claveSerie,
          }))
        }

        return { ...e, series }
      }),
    })
  }

  const auto = form.esAutoCarga

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

      <label className="switch-rm casilla-auto-carga">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => activarAutoCarga(e.target.checked)}
        />
        <span>Auto carga (solo ejercicio y repeticiones, sin kg ni 1RM)</span>
      </label>

      <label>
        Observaciones
        <input
          value={form.observaciones}
          maxLength={300}
          onChange={(e) => setForm({ observaciones: e.target.value })}
          placeholder="Opcional"
        />
      </label>

      {form.ejercicios.map((ejercicio, indice) => (
        <div className="tarjeta control-bloque" key={ejercicio.clave}>
          <div className="encabezado-compacto">
            <label className="crece">
              Ejercicio {indice + 1}
              <input
                value={ejercicio.nombre}
                onChange={(e) => actualizarEjercicio(ejercicio.clave, { nombre: e.target.value })}
                placeholder={auto ? 'Ej. Dominadas' : 'Ej. Sentadilla'}
              />
            </label>
            {form.ejercicios.length > 1 && (
              <button
                type="button"
                className="boton-fantasma"
                onClick={() =>
                  setForm({
                    ejercicios: form.ejercicios.filter((e) => e.clave !== ejercicio.clave),
                  })
                }
              >
                Quitar
              </button>
            )}
          </div>

          <div className="tabla-series">
            <div className={`tabla-series-cabecera${auto ? ' solo-reps' : ''}`}>
              {!auto && <span>Peso (kg)</span>}
              <span>Reps</span>
              {!auto && <span>1RM</span>}
              <span />
            </div>
            {ejercicio.series.map((serie) => (
              <div className={`tabla-series-fila${auto ? ' solo-reps' : ''}`} key={serie.clave}>
                {!auto && (
                  <input
                    inputMode="decimal"
                    value={serie.peso}
                    onChange={(e) =>
                      actualizarSerie(ejercicio.clave, serie.clave, { peso: e.target.value })
                    }
                    placeholder="kg"
                  />
                )}
                <input
                  inputMode="numeric"
                  value={serie.repeticiones}
                  onChange={(e) =>
                    actualizarSerie(ejercicio.clave, serie.clave, {
                      repeticiones: e.target.value,
                    })
                  }
                />
                {!auto && (
                  <label className="switch-rm">
                    <input
                      type="checkbox"
                      checked={serie.esUnoRm}
                      onChange={(e) =>
                        actualizarSerie(ejercicio.clave, serie.clave, {
                          esUnoRm: e.target.checked,
                        })
                      }
                    />
                    <span>1RM</span>
                  </label>
                )}
                {ejercicio.series.length > 1 ? (
                  <button
                    type="button"
                    className="boton-fantasma"
                    onClick={() =>
                      actualizarEjercicio(ejercicio.clave, {
                        series: ejercicio.series.filter((s) => s.clave !== serie.clave),
                      })
                    }
                  >
                    ×
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="boton-fantasma"
            onClick={() =>
              actualizarEjercicio(ejercicio.clave, {
                series: [...ejercicio.series, nuevaSerie()],
              })
            }
          >
            + Serie
          </button>
        </div>
      ))}

      <button
        type="button"
        className="boton-fantasma"
        onClick={() => setForm({ ejercicios: [...form.ejercicios, nuevoBloque()] })}
      >
        + Ejercicio
      </button>
    </div>
  )
}
