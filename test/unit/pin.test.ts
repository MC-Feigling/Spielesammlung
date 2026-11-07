import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  hashPin,
  formatRecoveryCode,
  generateRecoveryCode,
  hashRecoveryCode,
  isLegacyHash,
  verifyRecoveryCode,
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
    expect(hash).toMatch(/^pbkdf2\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/)
    expect(await verifyPin('1234', hash)).toBe(true)
    expect(await verifyPin('9999', hash)).toBe(false)
  })

  it('salts hashes: same pin gives different hashes', async () => {
    expect(await hashPin('1234')).not.toBe(await hashPin('1234'))
  })

  it('still verifies legacy unsalted sha-256 hashes and flags them for upgrade', async () => {
    const legacy = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'
    expect(await verifyPin('1234', legacy)).toBe(true)
    expect(await verifyPin('9999', legacy)).toBe(false)
    expect(isLegacyHash(legacy)).toBe(true)
    expect(isLegacyHash(await hashPin('1234'))).toBe(false)
    expect(isLegacyHash(null)).toBe(false)
  })

  it('rejects malformed pbkdf2 hashes', async () => {
    expect(await verifyPin('1234', 'pbkdf2$abc$zz$00')).toBe(false)
    expect(await verifyPin('1234', 'pbkdf2$100000$$')).toBe(false)
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
    expect(hash).toMatch(/^pbkdf2\$/)
    expect(await verifyPin('1234', hash)).toBe(true)
    expect(await verifyPin('9999', hash)).toBe(false)
    expect(await verifyPin('1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')).toBe(true)
  }, 20_000)

  it('fallback and subtle implementations produce identical hashes', async () => {
    const withSubtle = await hashPin('567890')

    vi.stubGlobal('crypto', { ...globalThis.crypto, subtle: undefined })
    expect(await verifyPin('567890', withSubtle)).toBe(true)
    expect(await verifyPin('567891', withSubtle)).toBe(false)

    const withoutSubtle = await hashPin('567890')
    vi.unstubAllGlobals()
    expect(await verifyPin('567890', withoutSubtle)).toBe(true)
  }, 30_000)

  it('has no built-in master pin: access needs the stored hash', async () => {
    expect(await verifyParentalAccess('314159', null)).toBe(false)
    expect(await verifyParentalAccess('314159', 'deadbeef')).toBe(false)
  })

  it('generates 8-digit recovery codes', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRecoveryCode()))
    for (const code of codes) expect(code).toMatch(/^\d{8}$/)
    expect(codes.size).toBeGreaterThan(15)
    expect(formatRecoveryCode('12345678')).toBe('1234 5678')
  })

  it('verifies recovery codes against their hash only', async () => {
    const hash = await hashRecoveryCode('12345678')
    expect(await verifyRecoveryCode('1234 5678', hash)).toBe(true)
    expect(await verifyRecoveryCode('87654321', hash)).toBe(false)
    expect(await verifyRecoveryCode('1234', hash)).toBe(false)
    expect(await verifyRecoveryCode('12345678', null)).toBe(false)
    expect(hash).not.toBe(await hashPin('123456'))
  })

  it('grants parental access via matching user pin hash', async () => {
    const hash = await hashPin('1234')
    expect(await verifyParentalAccess('1234', hash)).toBe(true)
    expect(await verifyParentalAccess('9999', hash)).toBe(false)
  })
})
