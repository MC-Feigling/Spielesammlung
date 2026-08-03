import type { GameId, UiScale } from './game'

export interface Profile {
  id: string
  name: string
  avatarId: string
  wins: Partial<Record<GameId, number>>
  favoriteGameId?: GameId
  createdAt: string
}

export interface Settings {
  soundEnabled: boolean
  uiScale: UiScale
}
