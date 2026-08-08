export function isHorseRacingRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  if (players.length < 2 || players.length > 4) return false
  const humans = players.filter((p) => p.type === 'human').length
  return humans >= 1 && humans <= 2
}
