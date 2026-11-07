import type { GameId, UiScale } from './game'

export interface Profile {
  id: string
  name: string
  avatarId: string
  wins: Partial<Record<GameId, number>>
  favoriteGameId?: GameId
  createdAt: string
}

export interface ParentalControls {
  pinHash: string | null
  /** Hash of the one-time recovery code; null if none was generated. */
  recoveryHash: string | null
  dailyLimitMinutes: number
  usedMsToday: number
  dayKey: string
  extraMsToday: number
  warnAtMinutes: number
}

export interface Settings {
  soundEnabled: boolean
  uiScale: UiScale
  parental: ParentalControls
}
