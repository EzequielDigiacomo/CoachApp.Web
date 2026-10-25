import type { ReactNode } from 'react'

/** Iconos SVG livianos para las cards del home. */
export type IdIconoDashboard =
  | 'entrenamientos'
  | 'controles'
  | 'anotaciones'
  | 'atletas'
  | 'colores'
  | 'equipos'
  | 'cuentas'
  | 'anotacionAtleta'
  | 'sensaciones'
  | 'garmin'

const props = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

const iconos: Record<IdIconoDashboard, ReactNode> = {
  entrenamientos: (
    <svg {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
      <path d="M8 14h3M13 14h3M8 18h8" />
    </svg>
  ),
  controles: (
    <svg {...props}>
      <path d="M6 4v16M18 4v16M6 8h4M14 16h4" />
      <circle cx="12" cy="8" r="2.5" />
      <circle cx="12" cy="16" r="2.5" />
    </svg>
  ),
  anotaciones: (
    <svg {...props}>
      <path d="M4 4h12a2 2 0 0 1 2 2v14l-4-2.5L10 20l-4-2.5L2 20V6a2 2 0 0 1 2-2z" />
      <path d="M7 9h8M7 13h5" />
    </svg>
  ),
  atletas: (
    <svg {...props}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M2 20c0-3.3 2.7-5.5 7-5.5s7 2.2 7 5.5" />
      <path d="M15.5 14.2c2.4.4 4.5 1.8 4.5 4.3" />
    </svg>
  ),
  colores: (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="2" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" opacity="0.45" />
    </svg>
  ),
  equipos: (
    <svg {...props}>
      <path d="M3 17h18M5 17V9l7-5 7 5v8" />
      <path d="M9 17v-4h6v4" />
    </svg>
  ),
  cuentas: (
    <svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
      <path d="M17 4l2 2-2 2" />
    </svg>
  ),
  anotacionAtleta: (
    <svg {...props}>
      <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" />
      <path d="M8 8h8M8 12h5" />
    </svg>
  ),
  sensaciones: (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10h.01M15.5 10h.01M8.5 15c1.2 1.2 2.5 1.8 3.5 1.8s2.3-.6 3.5-1.8" />
    </svg>
  ),
  garmin: (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
}

export function IconoDashboard({ id }: { id: IdIconoDashboard }) {
  return <span className="dashboard-icono">{iconos[id]}</span>
}
