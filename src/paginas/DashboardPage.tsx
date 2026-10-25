import { Link } from 'react-router-dom'
import { useAuth } from '../auth/contextoAuth'
import { IconoDashboard, type IdIconoDashboard } from '../componentes/IconosDashboard'
import { esStaff } from '../tipos/api'

interface CardModulo {
  to: string
  titulo: string
  descripcion: string
  icono: IdIconoDashboard
  destacada?: boolean
  /** Resalta Atletas un poco mas que el resto. */
  enfasis?: boolean
}

/** Home con cards: el entrenador y el atleta eligen el modulo desde aca. */
export function DashboardPage() {
  const { sesion } = useAuth()
  const staff = esStaff(sesion?.usuario.rol)
  const nombre = sesion?.usuario.nombre ?? ''

  const cards: CardModulo[] = staff
    ? [
        {
          to: '/entrenamientos',
          titulo: 'Entrenamientos',
          descripcion: 'Sesiones, asistencia y trabajos.',
          icono: 'entrenamientos',
        },
        {
          to: '/controles',
          titulo: 'Controles',
          descripcion: 'Gim, tierra y agua por atleta.',
          icono: 'controles',
        },
        {
          to: '/anotaciones?nueva=1',
          titulo: 'Anotaciones',
          descripcion: 'Anotá algo al toque.',
          icono: 'anotaciones',
          destacada: true,
        },
        {
          to: '/atletas',
          titulo: 'Atletas',
          descripcion: 'Ficha e historial de cada uno.',
          icono: 'atletas',
          enfasis: true,
        },
        {
          to: '/colores',
          titulo: 'Colores atletas',
          descripcion: 'Colores para reconocerlos.',
          icono: 'colores',
        },
        {
          to: '/equipos',
          titulo: 'K2 / K4',
          descripcion: 'Botes de equipo.',
          icono: 'equipos',
        },
        {
          to: '/cuentas',
          titulo: 'Cuentas',
          descripcion: 'Usuarios y accesos.',
          icono: 'cuentas',
        },
        {
          to: '/anotacion-atleta',
          titulo: 'Anotación atleta',
          descripcion: 'Lo que escribieron los atletas.',
          icono: 'anotacionAtleta',
        },
        {
          to: '/sensaciones',
          titulo: 'Sensaciones',
          descripcion: 'Cómo se sintieron.',
          icono: 'sensaciones',
        },
        {
          to: '/garmin',
          titulo: 'GarCalendar',
          descripcion: 'Calendario Garmin.',
          icono: 'garmin',
        },
      ]
    : [
        {
          to: '/entrenamientos',
          titulo: 'Entrenamientos',
          descripcion: 'Tus sesiones y trabajos.',
          icono: 'entrenamientos',
        },
        {
          to: '/controles',
          titulo: 'Controles',
          descripcion: 'Tus controles de gim, tierra y agua.',
          icono: 'controles',
        },
        {
          to: '/anotacion',
          titulo: 'Anotación',
          descripcion: 'Escribile al entrenador.',
          icono: 'anotaciones',
          destacada: true,
        },
        {
          to: '/sensaciones',
          titulo: 'Sensaciones',
          descripcion: 'Cómo te sentiste.',
          icono: 'sensaciones',
        },
        {
          to: '/garmin',
          titulo: 'GarCalendar',
          descripcion: 'Calendario Garmin.',
          icono: 'garmin',
        },
      ]

  const destacada = cards.find((c) => c.destacada)
  const resto = cards.filter((c) => !c.destacada)
  const mitad = Math.ceil(resto.length / 2)
  const arriba = resto.slice(0, mitad)
  const abajo = resto.slice(mitad)

  return (
    <div className="dashboard">
      <header className="dashboard-cabecera">
        <p className="dashboard-eyebrow">CoachApp</p>
        <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
        <p className="sutil">Elegí un módulo para empezar.</p>
      </header>

      <div className="dashboard-grilla">
        {arriba.map((card) => (
          <Card key={card.to} card={card} />
        ))}

        {destacada && <Card card={destacada} />}

        {abajo.map((card) => (
          <Card key={card.to} card={card} />
        ))}
      </div>
    </div>
  )
}

function Card({ card }: { card: CardModulo }) {
  const clases = [
    'dashboard-card',
    card.destacada ? 'dashboard-card-destacada' : '',
    card.enfasis ? 'dashboard-card-enfasis' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Link to={card.to} className={clases}>
      <IconoDashboard id={card.icono} />
      <div className="dashboard-card-texto">
        <strong>{card.titulo}</strong>
        <span className="sutil">{card.descripcion}</span>
      </div>
    </Link>
  )
}
