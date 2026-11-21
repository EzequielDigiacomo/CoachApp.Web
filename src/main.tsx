import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ProveedorConsultas } from './consultas/ProveedorConsultas'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorConsultas>
      <App />
    </ProveedorConsultas>
  </StrictMode>,
)
