export function isPuzzleRaceRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  if (players.length < 2 || players.length > 4) return false
  const humans = players.filter((player) => player.type === 'human').length
  const ais = players.filter((player) => player.type === 'ai').length
  return humans === 1 && ais >= 1 && humans + ais === players.length
}
