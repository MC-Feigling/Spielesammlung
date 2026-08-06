export function isMuehleRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  return players.length === 2
}
