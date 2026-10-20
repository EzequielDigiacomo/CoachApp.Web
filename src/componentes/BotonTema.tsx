import { useTema } from '../hooks/useTema'

/** Alterna claro/oscuro. Se puede usar en la barra o en el login. */
export function BotonTema({ className }: { className?: string }) {
  const { esOscuro, alternar } = useTema()

  return (
    <button
      type="button"
      className={['boton-fantasma boton-tema', className].filter(Boolean).join(' ')}
      onClick={alternar}
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={esOscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {esOscuro ? 'Claro' : 'Oscuro'}
    </button>
  )
}
