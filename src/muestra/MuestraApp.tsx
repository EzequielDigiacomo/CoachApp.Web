import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
  setupIonicReact,
} from '@ionic/react'
import { calendarOutline, fitnessOutline, peopleOutline, waterOutline } from 'ionicons/icons'
import {
  App as KonstaApp,
  Badge,
  Block,
  BlockTitle,
  Button,
  Card,
  List,
  ListItem,
  Navbar,
  Page,
} from 'konsta/react'
import { useMemo, useState } from 'react'

setupIonicReact({ mode: 'ios' })

type Seccion = 'inicio' | 'entrenamientos' | 'atletas' | 'controles'
type Libreria = 'konsta' | 'ionic'

const NAV: { id: Seccion; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'entrenamientos', label: 'Entrenamientos' },
  { id: 'atletas', label: 'Atletas' },
  { id: 'controles', label: 'Controles' },
]

const SESIONES = [
  { id: 1, titulo: 'Sesión 1 · Mañana', meta: 'Agua · 8/12 presentes', tipo: 'Agua' },
  { id: 2, titulo: 'Sesión 2 · Tarde', meta: 'Tierra · 5/9 presentes', tipo: 'Tierra' },
  { id: 3, titulo: 'Sesión 1 · Mañana', meta: 'Gimnasio · sin marcar', tipo: 'Gimnasio' },
]

const MODULOS = [
  { titulo: 'Entrenamientos', desc: 'Sesiones, asistencia y trabajos.' },
  { titulo: 'Controles', desc: 'Gim, tierra y agua por atleta.' },
  { titulo: 'Atletas', desc: 'Ficha e historial de cada uno.' },
  { titulo: 'Equipos K2 / K4', desc: 'Botes de equipo.' },
  { titulo: 'Avisos', desc: 'Mensajes para el plantel.' },
  { titulo: 'Garmin', desc: 'Calendario e importación.' },
]

const ATLETAS = [
  { nombre: 'Pérez, Juan', club: 'CN Rosario', estado: 'Activo' },
  { nombre: 'Gómez, Lucía', club: 'Remeros del Paraná', estado: 'Activo' },
  { nombre: 'Ruiz, Martín', club: 'CN Rosario', estado: 'Baja' },
]

/** Prototipo visual: shell macOS + contenido Konsta / Ionic (ios). */
export function MuestraApp() {
  const [seccion, setSeccion] = useState<Seccion>('inicio')
  const [libreria, setLibreria] = useState<Libreria>('konsta')

  const titulo = useMemo(
    () => NAV.find((n) => n.id === seccion)?.label ?? 'CoachApp',
    [seccion],
  )

  return (
    <div className="mac-stage">
      <div className="mac-window" role="application" aria-label="Muestra CoachApp estilo Mac">
        <header className="mac-titlebar">
          <div className="mac-traffic" aria-hidden="true">
            <span className="close" />
            <span className="min" />
            <span className="max" />
          </div>
          <div className="mac-title">CoachApp — liquid glass</div>
          <span className="mac-badge">muestra</span>
        </header>

        <div className="mac-body">
          <aside className="mac-sidebar">
            <div className="mac-brand">
              CoachApp
              <small>Liquid glass · Konsta / Ionic</small>
            </div>
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mac-nav-btn${seccion === item.id ? ' activo' : ''}`}
                onClick={() => setSeccion(item.id)}
              >
                {item.label}
              </button>
            ))}
            <div className="mac-sidebar-foot">
              Efecto liquid glass (blur + borde especular) sobre fondo animado. Datos de
              ejemplo — no es producción.
            </div>
          </aside>

          <main className="mac-content">
            <div className="mac-toolbar">
              <div>
                <h1>{titulo}</h1>
                <p>
                  Compará la misma pantalla con{' '}
                  {libreria === 'konsta' ? 'Konsta UI' : 'Ionic Framework'}
                </p>
              </div>
              <div className="mac-seg" role="tablist" aria-label="Librería UI">
                <button
                  type="button"
                  className={libreria === 'konsta' ? 'activo' : undefined}
                  onClick={() => setLibreria('konsta')}
                >
                  Konsta
                </button>
                <button
                  type="button"
                  className={libreria === 'ionic' ? 'activo' : undefined}
                  onClick={() => setLibreria('ionic')}
                >
                  Ionic
                </button>
              </div>
            </div>

            <div className="mac-panel">
              {libreria === 'konsta' ? (
                <VistaKonsta seccion={seccion} />
              ) : (
                <VistaIonic seccion={seccion} />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function VistaKonsta({ seccion }: { seccion: Seccion }) {
  return (
    <KonstaApp theme="ios" safeAreas={false} className="liquid-panel">
      <Page className="!min-h-[420px] !bg-transparent">
        <Navbar title={`Konsta · ${etiqueta(seccion)}`} />

        {seccion === 'inicio' && (
          <>
            <BlockTitle>Hola, Coach</BlockTitle>
            <Block strong inset className="space-y-2">
              <p className="text-[15px] text-black/70">
                Muestra de home con cards estilo Apple. Los componentes son de Konsta (ios).
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge colors={{ bg: 'bg-primary' }}>Staff</Badge>
                <Badge colors={{ bg: 'bg-green-500' }}>Online</Badge>
              </div>
            </Block>
            <div className="mac-grid px-4 pb-4">
              {MODULOS.map((m) => (
                <Card key={m.titulo} footer={m.desc}>
                  <div className="font-semibold text-[15px]">{m.titulo}</div>
                </Card>
              ))}
            </div>
          </>
        )}

        {seccion === 'entrenamientos' && (
          <>
            <Block strong inset className="flex items-center justify-between gap-3">
              <span className="text-[14px] text-black/60">Agenda de ejemplo</span>
              <Button rounded small>
                Nueva sesión
              </Button>
            </Block>
            <List strong inset>
              {SESIONES.map((s) => (
                <ListItem
                  key={s.id}
                  title={s.titulo}
                  subtitle={s.meta}
                  after={<Badge>{s.tipo}</Badge>}
                  link
                />
              ))}
            </List>
          </>
        )}

        {seccion === 'atletas' && (
          <List strong inset>
            {ATLETAS.map((a) => (
              <ListItem
                key={a.nombre}
                title={a.nombre}
                subtitle={a.club}
                after={
                  <Badge colors={{ bg: a.estado === 'Activo' ? 'bg-green-500' : 'bg-orange-500' }}>
                    {a.estado}
                  </Badge>
                }
                link
              />
            ))}
          </List>
        )}

        {seccion === 'controles' && (
          <>
            <BlockTitle>Por disciplina</BlockTitle>
            <List strong inset>
              <ListItem title="Gimnasio" subtitle="RM y series" after="12" link />
              <ListItem title="Tierra" subtitle="Parciales / testigos" after="8" link />
              <ListItem title="Agua" subtitle="Tiempos y ppm" after="15" link />
            </List>
            <Block className="text-center">
              <Button large rounded>
                Nuevo control
              </Button>
            </Block>
          </>
        )}
      </Page>
    </KonstaApp>
  )
}

function VistaIonic({ seccion }: { seccion: Seccion }) {
  return (
    <div className="ionic-host">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ionic · {etiqueta(seccion)}</IonTitle>
          <IonButtons slot="end">
            <IonButton>Acción</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {seccion === 'inicio' && (
          <IonList inset>
            {MODULOS.map((m, i) => (
              <IonItem key={m.titulo} button detail>
                <IonIcon
                  slot="start"
                  icon={[calendarOutline, fitnessOutline, peopleOutline, waterOutline][i % 4]}
                  color="primary"
                />
                <IonLabel>
                  <h2>{m.titulo}</h2>
                  <p>{m.desc}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        {seccion === 'entrenamientos' && (
          <>
            <div className="ion-margin-bottom">
              <IonButton expand="block">Nueva sesión</IonButton>
            </div>
            <IonList inset>
              {SESIONES.map((s) => (
                <IonItem key={s.id} button detail>
                  <IonLabel>
                    <h2>{s.titulo}</h2>
                    <p>{s.meta}</p>
                  </IonLabel>
                  <IonNote slot="end">{s.tipo}</IonNote>
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        {seccion === 'atletas' && (
          <IonList inset>
            {ATLETAS.map((a) => (
              <IonItem key={a.nombre} button detail>
                <IonIcon slot="start" icon={peopleOutline} color="primary" />
                <IonLabel>
                  <h2>{a.nombre}</h2>
                  <p>{a.club}</p>
                </IonLabel>
                <IonNote slot="end">{a.estado}</IonNote>
              </IonItem>
            ))}
          </IonList>
        )}

        {seccion === 'controles' && (
          <>
            <IonList inset>
              <IonItem button detail>
                <IonIcon slot="start" icon={fitnessOutline} color="primary" />
                <IonLabel>
                  <h2>Gimnasio</h2>
                  <p>RM y series</p>
                </IonLabel>
                <IonNote slot="end">12</IonNote>
              </IonItem>
              <IonItem button detail>
                <IonIcon slot="start" icon={waterOutline} color="primary" />
                <IonLabel>
                  <h2>Tierra</h2>
                  <p>Parciales / testigos</p>
                </IonLabel>
                <IonNote slot="end">8</IonNote>
              </IonItem>
              <IonItem button detail>
                <IonIcon slot="start" icon={calendarOutline} color="primary" />
                <IonLabel>
                  <h2>Agua</h2>
                  <p>Tiempos y ppm</p>
                </IonLabel>
                <IonNote slot="end">15</IonNote>
              </IonItem>
            </IonList>
            <IonButton expand="block" className="ion-margin-top">
              Nuevo control
            </IonButton>
          </>
        )}
      </IonContent>
    </div>
  )
}

function etiqueta(seccion: Seccion): string {
  return NAV.find((n) => n.id === seccion)?.label ?? seccion
}
