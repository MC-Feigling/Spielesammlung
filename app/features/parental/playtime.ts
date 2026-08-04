export type PlaytimePhase = 'inactive' | 'ok' | 'warn' | 'locked'

export const COUNTDOWN_SECONDS = 10
export const EXTRA_MINUTE_OPTIONS = [15, 30, 45] as const

export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function effectiveBudgetMs(limitMinutes: number, extraMs: number): number {
  return Math.max(0, limitMinutes) * 60_000 + Math.max(0, extraMs)
}

export function remainingMs(budgetMs: number, usedMs: number): number {
  return Math.max(0, budgetMs - Math.max(0, usedMs))
}

export function resolvePlaytimePhase(input: {
  active: boolean
  remainingMs: number
  warnAtMinutes: number
}): PlaytimePhase {
  if (!input.active) return 'inactive'
  if (input.remainingMs <= 0) return 'locked'
  if (input.remainingMs <= input.warnAtMinutes * 60_000) return 'warn'
  return 'ok'
}

export function shouldSkipCountdownOnLoad(phase: PlaytimePhase): boolean {
  return phase === 'locked'
}

export function formatRemainingMinutesLabel(remaining: number): string {
  if (remaining <= 0) return 'Noch 0 Min.'
  const minutes = Math.max(1, Math.ceil(remaining / 60_000))
  return `Noch ${minutes} Min.`
}
