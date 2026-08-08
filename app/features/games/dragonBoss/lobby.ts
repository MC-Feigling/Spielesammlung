export function isDragonBossRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  if (players.length !== 2) return false
  const humans = players.filter((player) => player.type === 'human').length
  return humans >= 1 && humans <= 2
}
