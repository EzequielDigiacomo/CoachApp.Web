import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorAuth } from './auth/ProveedorAuth'
import { RutaProtegida, RutaStaff } from './auth/RutaProtegida'
import { CargaPagina } from './componentes/CargaPagina'
import { ProveedorConfirmacion } from './componentes/Confirmacion'
import { Layout } from './componentes/Layout'

const LoginPage = lazy(() =>
  import('./paginas/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const DashboardPage = lazy(() =>
  import('./paginas/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const AtletasPage = lazy(() =>
  import('./paginas/AtletasPage').then((m) => ({ default: m.AtletasPage })),
)
const ColoresAtletasPage = lazy(() =>
  import('./paginas/ColoresAtletasPage').then((m) => ({ default: m.ColoresAtletasPage })),
)
const AtletaHistorialPage = lazy(() =>
  import('./paginas/AtletaHistorialPage').then((m) => ({ default: m.AtletaHistorialPage })),
)
const ControlesPage = lazy(() =>
  import('./paginas/ControlesPage').then((m) => ({ default: m.ControlesPage })),
)
const EntrenamientosPage = lazy(() =>
  import('./paginas/EntrenamientosPage').then((m) => ({ default: m.EntrenamientosPage })),
)
const EntrenamientoDetallePage = lazy(() =>
  import('./paginas/EntrenamientoDetallePage').then((m) => ({
    default: m.EntrenamientoDetallePage,
  })),
)
const AnotacionesPage = lazy(() =>
  import('./paginas/AnotacionesPage').then((m) => ({ default: m.AnotacionesPage })),
)
const CuentasPage = lazy(() =>
  import('./paginas/CuentasPage').then((m) => ({ default: m.CuentasPage })),
)
const EquiposPage = lazy(() =>
  import('./paginas/EquiposPage').then((m) => ({ default: m.EquiposPage })),
)
const AnotacionAtletaPage = lazy(() =>
  import('./paginas/AnotacionAtletaPage').then((m) => ({ default: m.AnotacionAtletaPage })),
)
const AvisosPage = lazy(() =>
  import('./paginas/AvisosPage').then((m) => ({ default: m.AvisosPage })),
)
const SensacionesPage = lazy(() =>
  import('./paginas/SensacionesPage').then((m) => ({ default: m.SensacionesPage })),
)
const GarCalendarPage = lazy(() =>
  import('./paginas/GarCalendarPage').then((m) => ({ default: m.GarCalendarPage })),
)

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
        <ProveedorConfirmacion>
          <Suspense fallback={<CargaPagina />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <Pagina>
                    <DashboardPage />
                  </Pagina>
                }
              />

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
                path="/colores"
                element={
                  <Pagina>
                    <RutaStaff>
                      <ColoresAtletasPage />
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
                path="/controles"
                element={
                  <Pagina>
                    <Navigate to="/controles/gimnasio" replace />
                  </Pagina>
                }
              />

              <Route
                path="/controles/:tipo"
                element={
                  <Pagina>
                    <ControlesPage />
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
                path="/avisos"
                element={
                  <Pagina>
                    <AvisosPage />
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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ProveedorConfirmacion>
      </ProveedorAuth>
    </BrowserRouter>
  )
}
