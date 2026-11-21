import { Block, Button, List, ListInput } from 'konsta/react'
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
      onSubmit={(evento) => {
        evento.preventDefault()
        onGuardar()
      }}
    >
      <List strong inset>
        <ListInput
          label="Título"
          type="text"
          value={datos.titulo}
          onChange={(e) => onCambiar({ titulo: e.target.value })}
          placeholder="Opcional"
          maxLength={200}
        />

        {atletas && (
          <ListInput
            label="Atleta"
            type="select"
            dropdown
            value={datos.atletaId}
            onChange={(e) => onCambiar({ atletaId: e.target.value })}
          >
            <option value="">General (sin atleta)</option>
            {atletas.map((atleta) => (
              <option value={String(atleta.id)} key={atleta.id}>
                {atleta.apellido}, {atleta.nombre}
              </option>
            ))}
          </ListInput>
        )}

        <ListInput
          label="Anotación"
          type="textarea"
          value={datos.texto}
          onChange={(e) => onCambiar({ texto: e.target.value })}
          placeholder="Qué querés dejar escrito"
          maxLength={4000}
          autoFocus={enfocar}
          inputClassName="min-h-24"
        />
      </List>

      <Block className="flex gap-2 justify-end">
        {onCancelar && (
          <Button type="button" inline rounded clear onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" inline rounded disabled={guardando}>
          {guardando ? 'Guardando…' : etiquetaGuardar}
        </Button>
      </Block>
    </form>
  )
}
