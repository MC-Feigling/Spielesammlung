/** Final result of one player, reported by a board when the game ends. */
export interface GameStanding {
  /** Same index convention as winnerSeatIndexes (position in the players list). */
  seatIndex: number
  /** Comparable score; ordering direction is decided by the board. */
  score: number
  /** Short text for the podium, e.g. "4 Paare". */
  label: string
}

export interface PodiumEntry {
  seatIndex: number
  place: number
  label: string
}

/** Sorts standings best-first. */
export function sortStandings(
  standings: readonly GameStanding[],
  higherIsBetter = true,
): GameStanding[] {
  return [...standings].sort((a, b) => (higherIsBetter ? b.score - a.score : a.score - b.score))
}

/**
 * Builds podium places: winners share place 1, everybody else follows in the
 * given standings order (ties on equal score share a place). Without standings
 * the remaining players keep their seat order.
 */
export function buildPodium(
  playerCount: number,
  winnerSeatIndexes: readonly number[],
  standings?: readonly GameStanding[],
): PodiumEntry[] {
  const winners = new Set(winnerSeatIndexes)
  const labelOf = new Map((standings ?? []).map((entry) => [entry.seatIndex, entry.label]))
  const scoreOf = new Map((standings ?? []).map((entry) => [entry.seatIndex, entry.score]))
  const order = standings && standings.length > 0
    ? standings.map((entry) => entry.seatIndex)
    : Array.from({ length: playerCount }, (_, index) => index)

  const entries: PodiumEntry[] = [...winners]
    .filter((seatIndex) => seatIndex >= 0 && seatIndex < playerCount)
    .map((seatIndex) => ({ seatIndex, place: 1, label: labelOf.get(seatIndex) ?? '' }))

  let place = entries.length > 0 ? 2 : 1
  let previousScore: number | undefined
  let previousPlace = place
  for (const seatIndex of order) {
    if (winners.has(seatIndex) || seatIndex < 0 || seatIndex >= playerCount) continue
    const score = scoreOf.get(seatIndex)
    const samePlace = score !== undefined && previousScore !== undefined && score === previousScore
    const thisPlace = samePlace ? previousPlace : place
    entries.push({ seatIndex, place: thisPlace, label: labelOf.get(seatIndex) ?? '' })
    previousScore = score
    previousPlace = thisPlace
    place += 1
  }

  for (let index = 0; index < playerCount; index += 1) {
    if (!entries.some((entry) => entry.seatIndex === index)) {
      entries.push({ seatIndex: index, place, label: '' })
      place += 1
    }
  }

  return entries
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
