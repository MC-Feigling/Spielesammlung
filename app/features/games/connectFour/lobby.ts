export function isConnectFourRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  return players.length === 2
}
