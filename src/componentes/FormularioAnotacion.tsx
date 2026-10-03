import type { AtletaDto } from '../tipos/api'

/** Lo que se escribe en el formulario, tal cual sale de los inputs. */
export interface DatosAnotacion {
  titulo: string
  texto: string
  /** '' cuando la anotacion no se ata a ningun atleta. */
  atletaId: string
}

export const ANOTACION_VACIA: DatosAnotacion = { titulo: '', texto: '', atletaId: '' }

interface Props {
  datos: DatosAnotacion
  onCambiar: (cambios: Partial<DatosAnotacion>) => void
  onGuardar: () => void
  /** Sin esto no se muestra el boton de cancelar. */
  onCancelar?: () => void
  guardando: boolean
  etiquetaGuardar: string
  /** Cuando viene, se puede elegir a que atleta pertenece la nota. */
  atletas?: AtletaDto[]
  /** Arranca con el cursor en el texto, para escribir y guardar. */
  enfocar?: boolean
}

/** Formulario de una anotacion: titulo, texto y, si aplica, el atleta. */
export function FormularioAnotacion({
  datos,
  onCambiar,
  onGuardar,
  onCancelar,
  guardando,
  etiquetaGuardar,
  atletas,
  enfocar = false,
}: Props) {
  return (
    <form
      className="nota-form"
      onSubmit={(evento) => {
        evento.preventDefault()
        onGuardar()
      }}
    >
      <div className="grilla">
        <label>
          Título
          <input
            value={datos.titulo}
            onChange={(e) => onCambiar({ titulo: e.target.value })}
            placeholder="Opcional"
            maxLength={200}
          />
        </label>

        {atletas && (
          <label>
            Atleta
            <select value={datos.atletaId} onChange={(e) => onCambiar({ atletaId: e.target.value })}>
              <option value="">General (sin atleta)</option>
              {atletas.map((atleta) => (
                <option value={String(atleta.id)} key={atleta.id}>
                  {atleta.apellido}, {atleta.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label>
        Anotación
        <textarea
          value={datos.texto}
          onChange={(e) => onCambiar({ texto: e.target.value })}
          placeholder="Qué querés dejar escrito"
          rows={4}
          maxLength={4000}
          autoFocus={enfocar}
        />
      </label>

      <div className="form-acciones">
        {onCancelar && (
          <button type="button" className="boton-fantasma" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button type="submit" className="boton" disabled={guardando}>
          {guardando ? 'Guardando…' : etiquetaGuardar}
        </button>
      </div>
    </form>
  )
}
