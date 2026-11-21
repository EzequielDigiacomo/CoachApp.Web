import { Block, Preloader } from 'konsta/react'

/** Fallback de Suspense al code-split de rutas. */
export function CargaPagina() {
  return (
    <Block className="flex flex-col items-center justify-center gap-3 py-16">
      <Preloader />
      <p className="text-[14px] opacity-60">Cargando…</p>
    </Block>
  )
}
