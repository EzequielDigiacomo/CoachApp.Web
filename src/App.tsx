import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorAuth } from './auth/ProveedorAuth'
import { RutaProtegida } from './auth/RutaProtegida'
import { Layout } from './componentes/Layout'
import { AnotacionesPage } from './paginas/AnotacionesPage'
import { AtletaHistorialPage } from './paginas/AtletaHistorialPage'
import { AtletasPage } from './paginas/AtletasPage'
import { EntrenamientoDetallePage } from './paginas/EntrenamientoDetallePage'
import { EntrenamientosPage } from './paginas/EntrenamientosPage'
import { GarCalendarPage } from './paginas/GarCalendarPage'
import { LoginPage } from './paginas/LoginPage'

/** Envuelve una pagina con el marco y la proteccion de sesion. */
function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <RutaProtegida>
      <Layout>{children}</Layout>
    </RutaProtegida>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorAuth>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/atletas"
            element={
              <Pagina>
                <AtletasPage />
              </Pagina>
            }
          />

          <Route
            path="/atletas/:id"
            element={
              <Pagina>
                <AtletaHistorialPage />
              </Pagina>
            }
          />

          <Route
            path="/entrenamientos"
            element={
              <Pagina>
                <EntrenamientosPage />
              </Pagina>
            }
          />

          <Route
            path="/entrenamientos/:id"
            element={
              <Pagina>
                <EntrenamientoDetallePage />
              </Pagina>
            }
          />

          <Route
            path="/anotaciones"
            element={
              <Pagina>
                <AnotacionesPage />
              </Pagina>
            }
          />

          <Route
            path="/garmin"
            element={
              <Pagina>
                <GarCalendarPage />
              </Pagina>
            }
          />

          <Route path="*" element={<Navigate to="/entrenamientos" replace />} />
        </Routes>
      </ProveedorAuth>
    </BrowserRouter>
  )
}
