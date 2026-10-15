import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/cliente'
import type { CuentaAtletaDto } from '../tipos/api'

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

  return (
    <div className="pagina">
      <div className="encabezado">
        <h2>Cuentas</h2>
      </div>
      <p className="sutil">
        Cada atleta entra con su usuario y contraseña. Desde acá se crean y se cambian.
      </p>
      {error && <p className="error">{error}</p>}
      {aviso && <p className="sutil">{aviso}</p>}
      {cargando ? (
        <p className="sutil">Cargando…</p>
      ) : (
        <div className="tarjeta sin-relleno">
          <table className="tabla">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Usuario</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cuentas.map((cuenta) => (
                <tr key={cuenta.atletaId}>
                  <td>
                    {cuenta.apellido}, {cuenta.nombre}
                    {abierta === cuenta.atletaId && (
                      <form
                        className="formulario"
                        onSubmit={(evento) => {
                          evento.preventDefault()
                          void guardar(cuenta)
                        }}
                      >
                        <label>
                          Usuario
                          <input
                            value={datos.nombreUsuario}
                            onChange={(e) => setDatos({ ...datos, nombreUsuario: e.target.value })}
                            required
                            autoComplete="off"
                          />
                        </label>
                        <label>
                          Email
                          <input
                            type="email"
                            value={datos.email}
                            onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                            required
                            autoComplete="off"
                          />
                        </label>
                        <label>
                          {cuenta.usuarioId == null ? 'Contraseña' : 'Nueva contraseña'}
                          <input
                            type="password"
                            value={datos.password}
                            onChange={(e) => setDatos({ ...datos, password: e.target.value })}
                            required={cuenta.usuarioId == null}
                            autoComplete="new-password"
                            placeholder={cuenta.usuarioId == null ? '' : 'Dejar vacío para no cambiarla'}
                          />
                        </label>
                        {cuenta.usuarioId != null && (
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={datos.activo}
                              onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
                            />
                            Activa
                          </label>
                        )}
                        <div className="acciones-fila">
                          <button type="submit" className="boton" disabled={ocupado}>
                            {cuenta.usuarioId == null ? 'Crear login' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            className="boton-fantasma"
                            onClick={() => setAbierta(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </td>
                  <td>{cuenta.nombreUsuario ?? '—'}</td>
                  <td>
                    {cuenta.usuarioId == null ? 'Sin login' : cuenta.activo ? 'Activa' : 'Pausada'}
                  </td>
                  <td className="derecha">
                    {abierta !== cuenta.atletaId && (
                      <button type="button" className="boton-fantasma" onClick={() => abrir(cuenta)}>
                        {cuenta.usuarioId == null ? 'Crear' : 'Editar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
