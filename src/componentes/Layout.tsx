import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { garminApi } from '../api/garmin'
import { useAuth } from '../auth/contextoAuth'
import { esStaff, type EstadoGarminDto } from '../tipos/api'
import { ModalVincularGarmin } from './ModalVincularGarmin'

/** Marco de la app con la barra superior. */
export function Layout({ children }: { children: React.ReactNode }) {
  const { sesion, cerrarSesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const navegar = useNavigate()
  const [garmin, setGarmin] = useState<EstadoGarminDto>({ vinculada: false, nombre: null })
  const [vinculando, setVinculando] = useState(false)

  useEffect(() => {
    if (!staff) {
      return
    }

    void garminApi.estado().then(setGarmin).catch(() => setGarmin({ vinculada: false, nombre: null }))

    function alVincular(evento: Event) {
      const estado = (evento as CustomEvent<EstadoGarminDto>).detail
      if (estado) {
        setGarmin(estado)
      }
    }

    window.addEventListener('coachapp:garmin', alVincular)
    return () => window.removeEventListener('coachapp:garmin', alVincular)
  }, [staff])

  function salir() {
    cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="barra">
        <span className="marca">CoachApp</span>

        <nav className="barra-nav">
          <NavLink to="/entrenamientos">Entrenamientos</NavLink>
          <NavLink to="/controles">Controles</NavLink>
          {staff && <NavLink to="/atletas">Atletas</NavLink>}
          {staff && <NavLink to="/equipos">K2 / K4</NavLink>}
          {staff && <NavLink to="/anotaciones">Anotaciones</NavLink>}
          {staff && <NavLink to="/cuentas">Cuentas</NavLink>}
          <NavLink to={staff ? '/anotacion-atleta' : '/anotacion'}>
            {staff ? 'Anotación atleta' : 'Anotación'}
          </NavLink>
          <NavLink to="/sensaciones">Sensaciones</NavLink>
          <NavLink to="/garmin">GarCalendar</NavLink>
        </nav>

        <div className="barra-usuario">
          {staff && garmin.vinculada ? (
            <span className="sutil garmin-estado">Garmin{garmin.nombre ? `: ${garmin.nombre}` : ''}</span>
          ) : staff ? (
            <button type="button" className="boton" onClick={() => setVinculando(true)}>
              <span className="nav-largo">Vincular Garmin</span>
              <span className="nav-corto">Garmin</span>
            </button>
          ) : null}
          <span className="usuario">
            {sesion?.usuario.nombre} {sesion?.usuario.apellido}
            <span className="rol">{sesion?.usuario.rol}</span>
          </span>
          <button type="button" className="boton-fantasma" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <main className="contenido">{children}</main>

      {vinculando && (
        <ModalVincularGarmin
          onCerrar={() => setVinculando(false)}
          onVinculada={(estado) => {
            setGarmin(estado)
            setVinculando(false)
            window.dispatchEvent(new CustomEvent('coachapp:garmin', { detail: estado }))
          }}
        />
      )}
    </div>
  )
}
