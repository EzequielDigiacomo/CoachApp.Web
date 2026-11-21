import {
  Badge,
  Block,
  BlockTitle,
  Button,
  Link,
  List,
  ListInput,
  ListItem,
  Navbar,
  Page,
  Popup,
  Preloader,
  Toggle,
} from 'konsta/react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/cliente'
import { NombreAtleta, textoAtleta } from '../componentes/NombreAtleta'
import type { CuentaAtletaDto } from '../tipos/api'
import { MarcoPagina } from '../ui/MarcoPagina'

interface Borrador {
  nombreUsuario: string
  email: string
  password: string
  activo: boolean
}

const VACIO: Borrador = { nombreUsuario: '', email: '', password: '', activo: true }

export function CuentasPage() {
  const [cuentas, setCuentas] = useState<CuentaAtletaDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<number | null>(null)
  const [datos, setDatos] = useState<Borrador>(VACIO)
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setCuentas(await api.get<CuentaAtletaDto[]>('/api/cuentas-atleta'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las cuentas.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function abrir(cuenta: CuentaAtletaDto) {
    setAbierta(cuenta.atletaId)
    setDatos({
      nombreUsuario: cuenta.nombreUsuario ?? '',
      email: cuenta.email ?? cuenta.emailAtleta ?? '',
      password: '',
      activo: cuenta.activo ?? true,
    })
    setError(null)
    setAviso(null)
  }

  async function guardar(cuenta: CuentaAtletaDto) {
    if (datos.password.length > 0 && datos.password.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres.')
      return
    }
    if (cuenta.usuarioId == null && datos.password.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres.')
      return
    }

    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      if (cuenta.usuarioId == null) {
        await api.post('/api/cuentas-atleta', {
          atletaId: cuenta.atletaId,
          nombreUsuario: datos.nombreUsuario,
          email: datos.email,
          password: datos.password,
        })
        setAviso('Login creado.')
      } else {
        await api.put(`/api/cuentas-atleta/${cuenta.usuarioId}`, {
          nombreUsuario: datos.nombreUsuario,
          email: datos.email,
          activo: datos.activo,
        })
        if (datos.password) {
          await api.put(`/api/cuentas-atleta/${cuenta.usuarioId}/password`, {
            password: datos.password,
          })
        }
        setAviso(datos.password ? 'Cuenta y contraseña actualizadas.' : 'Cuenta actualizada.')
      }
      setAbierta(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la cuenta.')
    } finally {
      setOcupado(false)
    }
  }

  const cuentaAbierta = cuentas.find((c) => c.atletaId === abierta) ?? null

  return (
    <MarcoPagina
      titulo="Cuentas"
      subtitulo="Cada atleta entra con su usuario y contraseña. Desde acá se crean y se cambian."
    >
      {error && !cuentaAbierta && (
        <Block>
          <p className="text-red-500">{error}</p>
        </Block>
      )}
      {aviso && (
        <Block>
          <p className="opacity-60">{aviso}</p>
        </Block>
      )}

      {cargando ? (
        <Block className="text-center">
          <Preloader />
        </Block>
      ) : (
        <List strong inset>
          {cuentas.map((cuenta) => {
            const estado =
              cuenta.usuarioId == null ? 'Sin login' : cuenta.activo ? 'Activa' : 'Pausada'
            const colorEstado =
              cuenta.usuarioId == null
                ? 'bg-gray-400'
                : cuenta.activo
                  ? 'bg-green-500'
                  : 'bg-amber-500'

            return (
              <ListItem
                key={cuenta.atletaId}
                title={
                  <NombreAtleta
                    nombre={textoAtleta(cuenta.apellido, cuenta.nombre)}
                    color={cuenta.color}
                  />
                }
                subtitle={cuenta.nombreUsuario ?? '—'}
                after={
                  <span className="flex items-center gap-2">
                    <Badge colors={{ bg: colorEstado }}>{estado}</Badge>
                    <Button type="button" inline small rounded tonal onClick={() => abrir(cuenta)}>
                      {cuenta.usuarioId == null ? 'Crear' : 'Editar'}
                    </Button>
                  </span>
                }
              />
            )
          })}
        </List>
      )}

      {/* El formulario de la cuenta se abre en un Popup de Konsta. */}
      <Popup opened={cuentaAbierta != null} onBackdropClick={() => setAbierta(null)}>
        <Page>
          <Navbar
            title={cuentaAbierta?.usuarioId == null ? 'Crear login' : 'Editar cuenta'}
            right={
              <Link onClick={() => setAbierta(null)}>
                Cerrar
              </Link>
            }
          />
          {cuentaAbierta && (
            <>
              <BlockTitle>
                <NombreAtleta
                  nombre={textoAtleta(cuentaAbierta.apellido, cuentaAbierta.nombre)}
                  color={cuentaAbierta.color}
                />
              </BlockTitle>
              <form
                onSubmit={(evento) => {
                  evento.preventDefault()
                  void guardar(cuentaAbierta)
                }}
              >
                <List strong inset>
                  <ListInput
                    label="Usuario"
                    type="text"
                    value={datos.nombreUsuario}
                    onChange={(e) => setDatos({ ...datos, nombreUsuario: e.target.value })}
                    required
                    autoComplete="off"
                  />
                  <ListInput
                    label="Email"
                    type="email"
                    value={datos.email}
                    onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                    required
                    autoComplete="off"
                  />
                  <ListInput
                    label={cuentaAbierta.usuarioId == null ? 'Contraseña' : 'Nueva contraseña'}
                    type="password"
                    value={datos.password}
                    onChange={(e) => setDatos({ ...datos, password: e.target.value })}
                    required={cuentaAbierta.usuarioId == null}
                    autoComplete="new-password"
                    placeholder={cuentaAbierta.usuarioId == null ? '' : 'Dejar vacío para no cambiarla'}
                  />
                  {cuentaAbierta.usuarioId != null && (
                    <ListItem
                      title="Activa"
                      after={
                        <Toggle
                          checked={datos.activo}
                          onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
                        />
                      }
                    />
                  )}
                </List>

                {error && (
                  <Block className="!mt-0">
                    <p className="text-red-500">{error}</p>
                  </Block>
                )}

                <Block className="flex gap-2 justify-end !mt-0">
                  <Button type="button" inline rounded clear onClick={() => setAbierta(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" inline rounded disabled={ocupado}>
                    {cuentaAbierta.usuarioId == null ? 'Crear login' : 'Guardar'}
                  </Button>
                </Block>
              </form>
            </>
          )}
        </Page>
      </Popup>
    </MarcoPagina>
  )
}
