import type { ParentalControls } from '~/types/profile'

export const DEFAULT_PARENTAL: ParentalControls = {
  pinHash: null,
  dailyLimitMinutes: 45,
  usedMsToday: 0,
  dayKey: '',
  extraMsToday: 0,
  warnAtMinutes: 5,
}

export function normalizeParental(raw: unknown): ParentalControls {
  const base = { ...DEFAULT_PARENTAL }
  if (!raw || typeof raw !== 'object') return base

  const value = raw as Partial<ParentalControls>

  if (typeof value.pinHash === 'string' && value.pinHash.length > 0) {
    base.pinHash = value.pinHash
  } else {
    base.pinHash = null
  }

  if (typeof value.dailyLimitMinutes === 'number' && Number.isFinite(value.dailyLimitMinutes)) {
    base.dailyLimitMinutes = Math.min(240, Math.max(5, Math.round(value.dailyLimitMinutes)))
  }

  if (typeof value.usedMsToday === 'number' && Number.isFinite(value.usedMsToday) && value.usedMsToday >= 0) {
    base.usedMsToday = value.usedMsToday
  }

  if (typeof value.dayKey === 'string') {
    base.dayKey = value.dayKey
  }

  if (typeof value.extraMsToday === 'number' && Number.isFinite(value.extraMsToday) && value.extraMsToday >= 0) {
    base.extraMsToday = value.extraMsToday
  }

  if (typeof value.warnAtMinutes === 'number' && Number.isFinite(value.warnAtMinutes) && value.warnAtMinutes > 0) {
    base.warnAtMinutes = Math.round(value.warnAtMinutes)
  }

  return base
}
