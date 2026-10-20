import type { CSSProperties, ReactNode } from 'react'

/** Paleta sugerida para asignar colores a atletas. */
export const PALETA_ATLETAS = [
  '#2563EB',
  '#DC2626',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
  '#EA580C',
  '#4F46E5',
  '#BE123C',
  '#0F766E',
] as const

export function esColorAtleta(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(valor.trim())
}

/**
 * Nombre de atleta con el color de identificación asignado por el coach.
 * Si no hay color, se ve como texto normal.
 */
export function NombreAtleta({
  nombre,
  color,
  className,
  children,
}: {
  /** Texto completo, p. ej. "Medina, Brahian". */
  nombre?: string | null
  color?: string | null
  className?: string
  children?: ReactNode
}) {
  const estilo: CSSProperties | undefined = esColorAtleta(color)
    ? { color: color.trim() }
    : undefined

  const clases = ['nombre-atleta', className].filter(Boolean).join(' ')

  return (
    <span className={clases} style={estilo}>
      {children ?? nombre}
    </span>
  )
}

/** Formato "Apellido, Nombre". */
export function textoAtleta(apellido: string, nombre: string): string {
  return `${apellido}, ${nombre}`
}
