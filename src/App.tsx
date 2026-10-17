import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorAuth } from './auth/ProveedorAuth'
import { RutaProtegida, RutaStaff } from './auth/RutaProtegida'
import { Layout } from './componentes/Layout'
import { AnotacionAtletaPage } from './paginas/AnotacionAtletaPage'
import { AnotacionesPage } from './paginas/AnotacionesPage'
import { CuentasPage } from './paginas/CuentasPage'
import { EquiposPage } from './paginas/EquiposPage'
import { SensacionesPage } from './paginas/SensacionesPage'
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
                <RutaStaff>
                  <AtletasPage />
                </RutaStaff>
              </Pagina>
            }
          />

          <Route
            path="/atletas/:id"
            element={
              <Pagina>
                <RutaStaff>
                  <AtletaHistorialPage />
                </RutaStaff>
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
                <RutaStaff>
                  <AnotacionesPage />
                </RutaStaff>
              </Pagina>
            }
          />

          <Route
            path="/cuentas"
            element={
              <Pagina>
                <RutaStaff>
                  <CuentasPage />
                </RutaStaff>
              </Pagina>
            }
          />

          <Route
            path="/equipos"
            element={
              <Pagina>
                <RutaStaff>
                  <EquiposPage />
                </RutaStaff>
              </Pagina>
            }
          />

          <Route
            path="/anotacion"
            element={
              <Pagina>
                <AnotacionAtletaPage />
              </Pagina>
            }
          />

          <Route
            path="/anotacion-atleta"
            element={
              <Pagina>
                <AnotacionAtletaPage />
              </Pagina>
            }
          />

          <Route
            path="/sensaciones"
            element={
              <Pagina>
                <SensacionesPage />
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
