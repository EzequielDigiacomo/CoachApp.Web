import { describe, expect, it } from 'vitest'
import { ApiError, mensajeApi } from './cliente'

describe('mensajeApi', () => {
  it('usa mensaje de ApiError', () => {
    expect(mensajeApi(new ApiError('falló', 400), 'x')).toBe('falló')
  })

  it('explica 409 si el backend no mando texto', () => {
    expect(mensajeApi(new ApiError('', 409), 'x')).toMatch(/Conflicto/i)
  })

  it('explica 429', () => {
    expect(mensajeApi(new ApiError('', 429), 'x')).toMatch(/Demasiadas/i)
  })

  it('usa respaldo si no es ApiError', () => {
    expect(mensajeApi(new Error('boom'), 'Respaldo')).toBe('Respaldo')
  })
})
