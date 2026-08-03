import type { GameId } from '~/types/game'
import type { Profile } from '~/types/profile'

export function favoriteFromWins(wins: Partial<Record<GameId, number>>): GameId | undefined {
  const entries = (Object.entries(wins) as Array<[GameId, number]>).sort((a, b) => b[1] - a[1])
  return entries[0]?.[0]
}

export function withWin(profile: Profile, gameId: GameId): Profile {
  const wins = { ...profile.wins, [gameId]: (profile.wins[gameId] ?? 0) + 1 }
  return { ...profile, wins, favoriteGameId: favoriteFromWins(wins) }
}
