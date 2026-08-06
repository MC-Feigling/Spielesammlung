import { afterEach, describe, expect, it, vi } from 'vitest'
import { PARENTAL_SUPER_PIN } from '../../app/constants/parental'
import {
  hashPin,
  isSuperPin,
  isValidPin,
  normalizePin,
  verifyParentalAccess,
  verifyPin,
} from '../../app/utils/pin'

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

  it('recognizes the built-in super pin', () => {
    expect(isSuperPin(PARENTAL_SUPER_PIN)).toBe(true)
    expect(isSuperPin(` ${PARENTAL_SUPER_PIN} `)).toBe(true)
    expect(isSuperPin('1234')).toBe(false)
  })

  it('grants parental access via super pin without stored hash', async () => {
    expect(await verifyParentalAccess(PARENTAL_SUPER_PIN, null)).toBe(true)
    expect(await verifyParentalAccess(PARENTAL_SUPER_PIN, 'deadbeef')).toBe(true)
    expect(await verifyParentalAccess('1234', null)).toBe(false)
  })

  it('grants parental access via matching user pin hash', async () => {
    const hash = await hashPin('1234')
    expect(await verifyParentalAccess('1234', hash)).toBe(true)
    expect(await verifyParentalAccess('9999', hash)).toBe(false)
  })
})
