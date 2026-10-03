import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/contextoAuth'

/** Marco de la app con la barra superior. */
export function Layout({ children }: { children: React.ReactNode }) {
  const { sesion, cerrarSesion } = useAuth()
  const navegar = useNavigate()

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
    </div>
  )
}
