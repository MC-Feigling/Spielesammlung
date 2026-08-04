import { describe, expect, it } from 'vitest'
import { DEFAULT_PARENTAL, normalizeParental } from '../../app/features/parental/normalize'

describe('normalizeParental', () => {
  it('returns defaults for corrupt input', () => {
    expect(normalizeParental(null)).toEqual(DEFAULT_PARENTAL)
    expect(normalizeParental('x')).toEqual(DEFAULT_PARENTAL)
  })

  it('keeps valid fields and nulls invalid pinHash', () => {
    const result = normalizeParental({
      pinHash: 123,
      dailyLimitMinutes: 60,
      usedMsToday: 1000,
      dayKey: '2026-08-04',
      extraMsToday: 500,
      warnAtMinutes: 5,
    })

    expect(result.pinHash).toBeNull()
    expect(result.dailyLimitMinutes).toBe(60)
    expect(result.usedMsToday).toBe(1000)
    expect(result.dayKey).toBe('2026-08-04')
    expect(result.extraMsToday).toBe(500)
  })

  it('clamps daily limit between 5 and 240', () => {
    expect(normalizeParental({ dailyLimitMinutes: 1 }).dailyLimitMinutes).toBe(5)
    expect(normalizeParental({ dailyLimitMinutes: 999 }).dailyLimitMinutes).toBe(240)
  })
})
