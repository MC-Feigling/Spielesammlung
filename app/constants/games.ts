import type { GameId } from '~/types/game'

export const GAMES: Array<{ id: GameId; title: string; blurb: string; minPlayers: number; maxPlayers: number }> = [
  { id: 'memory', title: 'Memory', blurb: 'Finde die Paare!', minPlayers: 2, maxPlayers: 4 },
  { id: 'kniffel', title: 'Kniffel', blurb: 'Würfle die besten Augen!', minPlayers: 2, maxPlayers: 4 },
  { id: 'ludo', title: 'Mensch ärgere dich nicht', blurb: 'Rauswerfen und ins Ziel!', minPlayers: 2, maxPlayers: 4 },
  { id: 'racing', title: 'Spurrennen', blurb: 'Ausweichen und zuerst ins Ziel!', minPlayers: 2, maxPlayers: 4 },
]

export function isGameId(value: string): value is GameId {
  return value === 'memory' || value === 'kniffel' || value === 'ludo' || value === 'racing'
}
