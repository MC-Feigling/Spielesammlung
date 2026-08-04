import { describe, expect, it } from 'vitest'
import {
  effectiveBudgetMs,
  localDayKey,
  remainingMs,
  resolvePlaytimePhase,
  shouldSkipCountdownOnLoad,
} from '../../app/features/parental/playtime'

describe('playtime helpers', () => {
  it('formats local day key as YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 7, 4, 23, 30))).toBe('2026-08-04')
  })

  it('computes budget including extra ms', () => {
    expect(effectiveBudgetMs(45, 15 * 60_000)).toBe(60 * 60_000)
  })

  it('clamps remaining at zero', () => {
    expect(remainingMs(1000, 1500)).toBe(0)
  })

  it('returns inactive when parental off', () => {
    expect(resolvePlaytimePhase({ active: false, remainingMs: 0, warnAtMinutes: 5 })).toBe('inactive')
  })

  it('returns warn within warn window', () => {
    expect(resolvePlaytimePhase({
      active: true,
      remainingMs: 4 * 60_000,
      warnAtMinutes: 5,
    })).toBe('warn')
  })

  it('returns locked at zero remaining', () => {
    expect(resolvePlaytimePhase({ active: true, remainingMs: 0, warnAtMinutes: 5 })).toBe('locked')
  })

  it('skips countdown on load when already locked', () => {
    expect(shouldSkipCountdownOnLoad('locked')).toBe(true)
    expect(shouldSkipCountdownOnLoad('warn')).toBe(false)
  })
})
