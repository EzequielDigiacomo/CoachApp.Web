import { Link } from 'konsta/react'
import type { ComponentProps, ReactNode } from 'react'

type Props = Omit<ComponentProps<typeof Link>, 'children'> & {
  children?: ReactNode
}

/**
 * Link con estilo de Navbar. Konsta acepta `navbar` en runtime
 * pero no lo declara en los tipos de v5.5.
 */
export function NavbarLink({ children, ...rest }: Props) {
  const props = { ...rest, navbar: true } as ComponentProps<typeof Link>
  return <Link {...props}>{children}</Link>
}
