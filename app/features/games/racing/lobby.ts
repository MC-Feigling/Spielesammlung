export function isRacingRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  if (players.length < 2 || players.length > 4) return false
  const humans = players.filter((p) => p.type === 'human').length
  const ais = players.filter((p) => p.type === 'ai').length
  return humans <= 2 && ais <= 2
}
