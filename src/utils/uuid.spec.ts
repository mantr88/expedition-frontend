import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateUUID } from './uuid'

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('generateUUID', () => {
  const originalCrypto = globalThis.crypto

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      })
    }
  })

  it('generates a valid v4 UUID using crypto.randomUUID if available', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('falls back to custom generator if crypto.randomUUID is not a function (e.g. HTTP context)', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        ...originalCrypto,
        randomUUID: undefined,
      },
      writable: true,
      configurable: true,
    })

    const uuid = generateUUID()
    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('falls back to Math.random if crypto is undefined', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const uuid = generateUUID()
    expect(uuid).toMatch(UUID_V4_REGEX)
  })
})
