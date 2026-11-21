import { describe, expect, it } from 'vitest'
import { expiracionDelToken, msHastaVencimiento, tokenVencido } from './token'

function jwtConExp(expEpochSegundos: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ exp: expEpochSegundos }))
  return `${header}.${payload}.firma`
}

describe('token', () => {
  it('expiracionDelToken lee exp del payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const fecha = expiracionDelToken(jwtConExp(exp))
    expect(fecha).not.toBeNull()
    expect(Math.abs(fecha!.getTime() - exp * 1000)).toBeLessThan(1000)
  })

  it('tokenVencido es true si ya paso', () => {
    const exp = Math.floor(Date.now() / 1000) - 10
    expect(tokenVencido(jwtConExp(exp))).toBe(true)
  })

  it('tokenVencido es false si queda margen', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    expect(tokenVencido(jwtConExp(exp))).toBe(false)
  })

  it('token invalido se trata como vencido', () => {
    expect(tokenVencido('no-es-jwt')).toBe(true)
    expect(msHastaVencimiento('x')).toBe(0)
  })
})
