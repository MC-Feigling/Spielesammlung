import { afterEach, describe, expect, it, vi } from 'vitest'
import { hashPin, isValidPin, normalizePin, verifyPin } from '../../app/utils/pin'

describe('pin utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts 4-6 digit pins only', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12')).toBe(false)
    expect(isValidPin('abcdef')).toBe(false)
  })

  it('normalizes whitespace and non-digits from pin input', () => {
    expect(normalizePin(' 12 34 ')).toBe('1234')
    expect(normalizePin('12a34')).toBe('1234')
    expect(normalizePin('1234567')).toBe('123456')
  })

  it('hashes and verifies', async () => {
    const hash = await hashPin('1234')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(await verifyPin('1234', hash)).toBe(true)
    expect(await verifyPin('9999', hash)).toBe(false)
  })

  it('verifies pins with incidental whitespace via normalize', async () => {
    const hash = await hashPin('1234')
    expect(await verifyPin(' 1234 ', hash)).toBe(true)
  })

  it('hashes and verifies when crypto.subtle is unavailable', async () => {
    const cryptoWithoutSubtle = {
      ...globalThis.crypto,
      subtle: undefined,
    }
    vi.stubGlobal('crypto', cryptoWithoutSubtle)

    const hash = await hashPin('1234')
    expect(hash).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
    expect(await verifyPin('1234', hash)).toBe(true)
    expect(await verifyPin('9999', hash)).toBe(false)
  })

  it('matches subtle and fallback digests for the same pin', async () => {
    const withSubtle = await hashPin('567890')

    vi.stubGlobal('crypto', { ...globalThis.crypto, subtle: undefined })
    const withoutSubtle = await hashPin('567890')

    expect(withoutSubtle).toBe(withSubtle)
  })
})
