import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      // Listados de coaching: no refetch agresivo al volver a la pestana.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Caché y dedupe de requests para toda la app. */
export function ProveedorConsultas({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={clienteConsultas}>{children}</QueryClientProvider>
}
