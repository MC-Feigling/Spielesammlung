import { describe, expect, it } from 'vitest'
import { createId } from '../../app/utils/storage'

describe('createId', () => {
  it('returns unique uuid-shaped ids', () => {
    const a = createId()
    const b = createId()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(b)
  })

  it('works without crypto.randomUUID', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID')
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      expect(createId()).toMatch(/^[0-9a-f-]{36}$/)
    } finally {
      if (original) Object.defineProperty(globalThis.crypto, 'randomUUID', original)
    }
  })
})
