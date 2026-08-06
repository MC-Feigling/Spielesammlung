/** Number of points on a Nine Men's Morris board. */
export const MUEHLE_POINT_COUNT = 24

/** Stones each player places during the opening phase. */
export const MUEHLE_STONES_PER_PLAYER = 9

/**
 * Point layout (outer → middle → inner), each ring NW → NE → SE → SW with midpoints:
 * outer 0–7, middle 8–15, inner 16–23.
 */
export const MUEHLE_MILLS: ReadonlyArray<readonly [number, number, number]> = [
  // Outer sides
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],
  // Middle sides
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],
  // Inner sides
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],
  // Cross spokes at midpoints
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23],
]

const EDGE_PAIRS: ReadonlyArray<readonly [number, number]> = [
  // Outer ring
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
  // Middle ring
  [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 8],
  // Inner ring
  [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 16],
  // Spokes
  [1, 9], [9, 17],
  [3, 11], [11, 19],
  [5, 13], [13, 21],
  [7, 15], [15, 23],
]

/** Undirected board edges for SVG rendering. */
export const MUEHLE_EDGES: ReadonlyArray<readonly [number, number]> = EDGE_PAIRS

function buildAdjacency(): ReadonlyArray<ReadonlyArray<number>> {
  const neighbors: number[][] = Array.from({ length: MUEHLE_POINT_COUNT }, () => [])

  for (const [a, b] of EDGE_PAIRS) {
    neighbors[a]!.push(b)
    neighbors[b]!.push(a)
  }

  return neighbors.map((list) => [...list].sort((left, right) => left - right))
}

/** Sorted neighbor lists for each point. */
export const MUEHLE_ADJACENCY: ReadonlyArray<ReadonlyArray<number>> = buildAdjacency()

/** SVG coordinates for each point in a 100×100 viewBox (padding 8). */
export const MUEHLE_POINT_COORDS: ReadonlyArray<{ x: number; y: number }> = [
  // Outer: NW N NE E SE S SW W
  { x: 8, y: 8 },
  { x: 50, y: 8 },
  { x: 92, y: 8 },
  { x: 92, y: 50 },
  { x: 92, y: 92 },
  { x: 50, y: 92 },
  { x: 8, y: 92 },
  { x: 8, y: 50 },
  // Middle
  { x: 22, y: 22 },
  { x: 50, y: 22 },
  { x: 78, y: 22 },
  { x: 78, y: 50 },
  { x: 78, y: 78 },
  { x: 50, y: 78 },
  { x: 22, y: 78 },
  { x: 22, y: 50 },
  // Inner
  { x: 36, y: 36 },
  { x: 50, y: 36 },
  { x: 64, y: 36 },
  { x: 64, y: 50 },
  { x: 64, y: 64 },
  { x: 50, y: 64 },
  { x: 36, y: 64 },
  { x: 36, y: 50 },
]

export function isValidPoint(point: number): boolean {
  return Number.isInteger(point) && point >= 0 && point < MUEHLE_POINT_COUNT
}

export function areAdjacent(from: number, to: number): boolean {
  if (!isValidPoint(from) || !isValidPoint(to)) return false
  return MUEHLE_ADJACENCY[from]!.includes(to)
}

export function countStones(
  points: ReadonlyArray<number | null>,
  seat: number,
): number {
  return points.reduce((total, owner) => total + (owner === seat ? 1 : 0), 0)
}

export function formsMill(
  points: ReadonlyArray<number | null>,
  point: number,
  seat: number,
): boolean {
  if (!isValidPoint(point) || points[point] !== seat) return false

  return MUEHLE_MILLS.some((mill) =>
    mill.includes(point) && mill.every((index) => points[index] === seat),
  )
}

export function isInMill(
  points: ReadonlyArray<number | null>,
  point: number,
): boolean {
  const seat = points[point]
  if (seat === null || seat === undefined) return false
  return formsMill(points, point, seat)
}

/**
 * Opponent stones that may be removed after forming a mill.
 * Prefer stones not in a mill; if all are in mills, all are removable.
 */
export function removableOpponentPoints(
  points: ReadonlyArray<number | null>,
  opponentSeat: number,
): number[] {
  const opponentPoints = points
    .map((owner, index) => (owner === opponentSeat ? index : -1))
    .filter((index) => index >= 0)

  const notInMill = opponentPoints.filter((point) => !isInMill(points, point))
  return notInMill.length > 0 ? notInMill : opponentPoints
}

export function canRemove(
  points: ReadonlyArray<number | null>,
  point: number,
  opponentSeat: number,
): boolean {
  return removableOpponentPoints(points, opponentSeat).includes(point)
}
