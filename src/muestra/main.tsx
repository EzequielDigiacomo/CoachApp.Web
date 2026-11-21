import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MuestraApp } from './MuestraApp'
import './muestra.css'

createRoot(document.getElementById('muestra-root')!).render(
  <StrictMode>
    <MuestraApp />
  </StrictMode>,
)
