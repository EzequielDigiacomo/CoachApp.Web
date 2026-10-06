import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { garminApi } from '../api/garmin'
import { useAuth } from '../auth/contextoAuth'
import type { EstadoGarminDto } from '../tipos/api'
import { ModalVincularGarmin } from './ModalVincularGarmin'

/** Marco de la app con la barra superior. */
export function Layout({ children }: { children: React.ReactNode }) {
  const { sesion, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const [garmin, setGarmin] = useState<EstadoGarminDto>({ vinculada: false, nombre: null })
  const [vinculando, setVinculando] = useState(false)

  useEffect(() => {
    void garminApi.estado().then(setGarmin).catch(() => setGarmin({ vinculada: false, nombre: null }))

    function alVincular(evento: Event) {
      const estado = (evento as CustomEvent<EstadoGarminDto>).detail
      if (estado) {
        setGarmin(estado)
      }
    }

    window.addEventListener('coachapp:garmin', alVincular)
    return () => window.removeEventListener('coachapp:garmin', alVincular)
  }, [])

  function salir() {
    cerrarSesion()
    navegar('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="barra">
        <span className="marca">CoachApp</span>

        <nav className="barra-nav">
          <Link to="/entrenamientos">Entrenamientos</Link>
          <Link to="/atletas">Atletas</Link>
          <Link to="/anotaciones">Anotaciones</Link>
        </nav>

        <div className="barra-usuario">
          {garmin.vinculada ? (
            <span className="sutil">Garmin{garmin.nombre ? `: ${garmin.nombre}` : ''}</span>
          ) : (
            <button type="button" className="boton" onClick={() => setVinculando(true)}>
              Vincular Garmin
            </button>
          )}
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
