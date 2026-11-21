import {
  Block,
  BlockFooter,
  List,
  ListItem,
  Navbar,
  Page,
  Panel,
} from 'konsta/react'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { garminApi } from '../api/garmin'
import { useAuth } from '../auth/contextoAuth'
import { esStaff, type EstadoGarminDto } from '../tipos/api'
import { linkRouter } from '../ui/konstaRouter'
import { NavbarLink } from '../ui/NavbarLink'
import { BotonTema } from './BotonTema'
import { ModalVincularGarmin } from './ModalVincularGarmin'

interface ItemNav {
  to: string
  label: string
  staff?: boolean
}

/** Marco Konsta: Navbar + panel lateral de navegación. */
export function Layout({ children }: { children: React.ReactNode }) {
  const { sesion, cerrarSesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [garmin, setGarmin] = useState<EstadoGarminDto>({ vinculada: false, nombre: null })
  const [vinculando, setVinculando] = useState(false)

  const items: ItemNav[] = [
    { to: '/', label: 'Inicio' },
    { to: '/entrenamientos', label: 'Entrenamientos' },
    { to: '/controles', label: 'Controles' },
    { to: '/atletas', label: 'Atletas', staff: true },
    { to: '/colores', label: 'Colores atletas', staff: true },
    { to: '/equipos', label: 'K2 / K4', staff: true },
    { to: '/anotaciones', label: 'Anotaciones', staff: true },
    { to: '/cuentas', label: 'Cuentas', staff: true },
    { to: '/avisos', label: 'Avisos' },
    {
      to: staff ? '/anotacion-atleta' : '/anotacion',
      label: staff ? 'Anotación atleta' : 'Anotación',
    },
    { to: '/sensaciones', label: 'Sensaciones' },
    { to: '/garmin', label: 'GarCalendar' },
  ]

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

  // Cierra el menú al cambiar de ruta.
  useEffect(() => {
    setMenuAbierto(false)
  }, [ubicacion.pathname])

  function salir() {
    cerrarSesion()
    navegar('/login', { replace: true })
  }

  const visibles = items.filter((item) => !item.staff || staff)

  return (
    <Page>
      <Navbar
        title="CoachApp"
        subtitle={
          sesion
            ? `${sesion.usuario.nombre} · ${sesion.usuario.rol}`
            : undefined
        }
        left={
          <NavbarLink onClick={() => setMenuAbierto(true)}>Menú</NavbarLink>
        }
        right={
          <div className="flex items-center gap-1 pr-1">
            {staff && !garmin.vinculada && (
              <NavbarLink onClick={() => setVinculando(true)}>Garmin</NavbarLink>
            )}
            <BotonTema />
            <NavbarLink onClick={salir}>Salir</NavbarLink>
          </div>
        }
      />

      <Panel
        side="left"
        opened={menuAbierto}
        onBackdropClick={() => setMenuAbierto(false)}
        floating
      >
        <Page>
          <Navbar
            title="Menú"
            right={
              <NavbarLink onClick={() => setMenuAbierto(false)}>Cerrar</NavbarLink>
            }
          />
          <Block strong inset className="!my-3">
            <div className="text-[15px] font-semibold">
              {sesion?.usuario.nombre} {sesion?.usuario.apellido}
            </div>
            <div className="text-[13px] opacity-60">{sesion?.usuario.rol}</div>
            {staff && garmin.vinculada && (
              <div className="text-[13px] text-primary mt-1">
                Garmin{garmin.nombre ? `: ${garmin.nombre}` : ''}
              </div>
            )}
          </Block>
          <List strong inset>
            {visibles.map((item) => {
              const activo =
                item.to === '/'
                  ? ubicacion.pathname === '/'
                  : ubicacion.pathname.startsWith(item.to)
              return (
                <ListItem
                  key={item.to}
                  title={item.label}
                  link
                  linkComponent={linkRouter(RouterLink)}
                  linkProps={{ to: item.to }}
                  className={activo ? 'k-color-brand-primary' : undefined}
                />
              )
            })}
          </List>
          <BlockFooter>CoachApp · Konsta UI</BlockFooter>
        </Page>
      </Panel>

      <div className="coach-contenido">{children}</div>

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
    </Page>
  )
}
