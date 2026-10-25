import { Link } from 'react-router-dom'
import { useAuth } from '../auth/contextoAuth'
import { esStaff } from '../tipos/api'

interface CardModulo {
  to: string
  titulo: string
  descripcion: string
  destacada?: boolean
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
        },
        {
          to: '/controles',
          titulo: 'Controles',
          descripcion: 'Gim, tierra y agua por atleta.',
        },
        {
          to: '/anotaciones?nueva=1',
          titulo: 'Anotaciones',
          descripcion: 'Anotá algo al toque.',
          destacada: true,
        },
        {
          to: '/atletas',
          titulo: 'Atletas',
          descripcion: 'Ficha e historial.',
        },
        {
          to: '/colores',
          titulo: 'Colores atletas',
          descripcion: 'Colores para reconocerlos.',
        },
        {
          to: '/equipos',
          titulo: 'K2 / K4',
          descripcion: 'Botes de equipo.',
        },
        {
          to: '/cuentas',
          titulo: 'Cuentas',
          descripcion: 'Usuarios y accesos.',
        },
        {
          to: '/anotacion-atleta',
          titulo: 'Anotación atleta',
          descripcion: 'Lo que escribieron los atletas.',
        },
        {
          to: '/sensaciones',
          titulo: 'Sensaciones',
          descripcion: 'Cómo se sintieron.',
        },
        {
          to: '/garmin',
          titulo: 'GarCalendar',
          descripcion: 'Calendario Garmin.',
        },
      ]
    : [
        {
          to: '/entrenamientos',
          titulo: 'Entrenamientos',
          descripcion: 'Tus sesiones y trabajos.',
        },
        {
          to: '/controles',
          titulo: 'Controles',
          descripcion: 'Tus controles de gim, tierra y agua.',
        },
        {
          to: '/anotacion',
          titulo: 'Anotación',
          descripcion: 'Escribile al entrenador.',
          destacada: true,
        },
        {
          to: '/sensaciones',
          titulo: 'Sensaciones',
          descripcion: 'Cómo te sentiste.',
        },
        {
          to: '/garmin',
          titulo: 'GarCalendar',
          descripcion: 'Calendario Garmin.',
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
  return (
    <Link
      to={card.to}
      className={card.destacada ? 'dashboard-card dashboard-card-destacada' : 'dashboard-card'}
    >
      <strong>{card.titulo}</strong>
      <span className="sutil">{card.descripcion}</span>
    </Link>
  )
}
