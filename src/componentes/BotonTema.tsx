import { useTema } from '../hooks/useTema'

const propsIcono = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  width: 18,
  height: 18,
}

function IconoSol() {
  return (
    <svg {...propsIcono}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconoLuna() {
  return (
    <svg {...propsIcono}>
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
    </svg>
  )
}

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
      {esOscuro ? <IconoSol /> : <IconoLuna />}
    </button>
  )
}
