import type { SessionPlayer } from '~/types/game'

export function humanWinnerProfileIds(players: readonly SessionPlayer[], winnerSeatIndexes: readonly number[]): string[] {
  const profileIds = new Set<string>()

  for (const seatIndex of winnerSeatIndexes) {
    const player = players[seatIndex]
    if (player?.type === 'human' && player.profileId) {
      profileIds.add(player.profileId)
    }
  }

  return [...profileIds]
}
