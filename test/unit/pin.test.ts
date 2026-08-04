import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, verifyPin } from '../../app/utils/pin'

describe('pin utils', () => {
  it('accepts 4-6 digit pins only', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12')).toBe(false)
    expect(isValidPin('abcdef')).toBe(false)
  })

  it('hashes and verifies', async () => {
    const hash = await hashPin('1234')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(await verifyPin('1234', hash)).toBe(true)
    expect(await verifyPin('9999', hash)).toBe(false)
  })
})
