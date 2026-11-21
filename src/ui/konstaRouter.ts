import type { ComponentType, ElementType } from 'react'

/**
 * Konsta tipa `linkComponent` como string, pero acepta componentes (p. ej. Link de RR).
 * Cast centralizado para no repetir `as unknown as string` en cada página.
 */
export function linkRouter(
  componente: ElementType | ComponentType<{ to: string }>,
): string {
  return componente as unknown as string
}
