import { useState } from 'react'
import { Link } from 'react-router-dom'
import { anotacionesApi } from '../api/anotaciones'
import { ApiError } from '../api/cliente'
import { useAuth } from '../auth/contextoAuth'
import { IconoDashboard, type IdIconoDashboard } from '../componentes/IconosDashboard'
import { esStaff } from '../tipos/api'

interface CardModulo {
  to: string
  titulo: string
  descripcion: string
  icono: IdIconoDashboard
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

  return (
    <div className="dashboard">
      <header className="dashboard-cabecera">
        <p className="dashboard-eyebrow">CoachApp</p>
        <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
        <p className="sutil">Elegí un módulo para empezar.</p>
      </header>

      <div className="dashboard-grilla">
        {staff && <CardAnotacionRapida />}

        {cards.map((card) => (
          <Card key={card.to} card={card} />
        ))}
      </div>
    </div>
  )
}

function Card({ card }: { card: CardModulo }) {
  const clases = ['dashboard-card', card.enfasis ? 'dashboard-card-enfasis' : '']
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

/** Anotaciones arriba: ir a la lista a la izquierda, nota rapida a la derecha. */
function CardAnotacionRapida() {
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    const limpio = texto.trim()
    if (!limpio) {
      setError('Escribí algo para guardar.')
      setOk(false)
      return
    }

    setOcupado(true)
    setError(null)
    setOk(false)

    try {
      await anotacionesApi.crear({ texto: limpio })
      setTexto('')
      setOk(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la anotación.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="dashboard-card dashboard-card-destacada dashboard-card-anotacion">
      <Link to="/anotaciones" className="dashboard-anotacion-ir">
        <IconoDashboard id="anotaciones" />
        <div className="dashboard-card-texto">
          <strong>Anotaciones</strong>
          <span className="sutil dashboard-anotacion-ir-desc">Ver, editar o buscar notas.</span>
        </div>
        <span className="dashboard-anotacion-flecha" aria-hidden="true">
          ›
        </span>
      </Link>

      <form className="dashboard-anotacion-rapida" onSubmit={(e) => void guardar(e)}>
        <label className="dashboard-anotacion-campo">
          <span className="sutil">Nota rápida</span>
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setOk(false)
              if (error) {
                setError(null)
              }
            }}
            placeholder="Escribí y guardá acá"
            rows={3}
            maxLength={4000}
            disabled={ocupado}
            enterKeyHint="done"
          />
        </label>
        <div className="dashboard-anotacion-acciones">
          {error && <p className="error">{error}</p>}
          {ok && !error && <p className="sutil dashboard-anotacion-ok">Guardada.</p>}
          <button type="submit" className="boton" disabled={ocupado || !texto.trim()}>
            {ocupado ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
