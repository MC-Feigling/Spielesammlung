export const BOARD_GRID_SIZE = 11

export interface BoardCell {
  row: number
  col: number
}

/** Ring path clockwise. Index 0 = red start (top arm). */
const RING_CELLS: readonly BoardCell[] = [
  { row: 0, col: 6 },
  { row: 1, col: 6 },
  { row: 2, col: 6 },
  { row: 3, col: 6 },
  { row: 4, col: 6 },
  { row: 4, col: 7 },
  { row: 4, col: 8 },
  { row: 4, col: 9 },
  { row: 4, col: 10 },
  { row: 5, col: 10 },
  { row: 6, col: 10 },
  { row: 6, col: 9 },
  { row: 6, col: 8 },
  { row: 6, col: 7 },
  { row: 6, col: 6 },
  { row: 7, col: 6 },
  { row: 8, col: 6 },
  { row: 9, col: 6 },
  { row: 10, col: 6 },
  { row: 10, col: 5 },
  { row: 10, col: 4 },
  { row: 9, col: 4 },
  { row: 8, col: 4 },
  { row: 7, col: 4 },
  { row: 6, col: 4 },
  { row: 6, col: 3 },
  { row: 6, col: 2 },
  { row: 6, col: 1 },
  { row: 6, col: 0 },
  { row: 5, col: 0 },
  { row: 4, col: 0 },
  { row: 4, col: 1 },
  { row: 4, col: 2 },
  { row: 4, col: 3 },
  { row: 4, col: 4 },
  { row: 3, col: 4 },
  { row: 2, col: 4 },
  { row: 1, col: 4 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
]

const YARD_CELLS: readonly (readonly BoardCell[])[] = [
  // seat 0 red — top-right
  [
    { row: 1, col: 8 },
    { row: 1, col: 9 },
    { row: 2, col: 8 },
    { row: 2, col: 9 },
  ],
  // seat 1 yellow — bottom-right
  [
    { row: 8, col: 8 },
    { row: 8, col: 9 },
    { row: 9, col: 8 },
    { row: 9, col: 9 },
  ],
  // seat 2 blue — bottom-left
  [
    { row: 8, col: 1 },
    { row: 8, col: 2 },
    { row: 9, col: 1 },
    { row: 9, col: 2 },
  ],
  // seat 3 green — top-left
  [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
]

const HOME_CELLS: readonly (readonly BoardCell[])[] = [
  // seat 0 red — top → center
  [
    { row: 1, col: 5 },
    { row: 2, col: 5 },
    { row: 3, col: 5 },
    { row: 4, col: 5 },
  ],
  // seat 1 yellow — right → center
  [
    { row: 5, col: 9 },
    { row: 5, col: 8 },
    { row: 5, col: 7 },
    { row: 5, col: 6 },
  ],
  // seat 2 blue — bottom → center
  [
    { row: 9, col: 5 },
    { row: 8, col: 5 },
    { row: 7, col: 5 },
    { row: 6, col: 5 },
  ],
  // seat 3 green — left → center
  [
    { row: 5, col: 1 },
    { row: 5, col: 2 },
    { row: 5, col: 3 },
    { row: 5, col: 4 },
  ],
]

const RING_SIZE = RING_CELLS.length
const SEAT_COUNT = 4
const SLOT_COUNT = 4
const HOME_STEP_COUNT = 4

function assertRingIndex(ringIndex: number): void {
  if (!Number.isInteger(ringIndex) || ringIndex < 0 || ringIndex >= RING_SIZE) {
    throw new RangeError(`ringIndex must be an integer in 0..${RING_SIZE - 1}`)
  }
}

function assertSeatIndex(playerIndex: number): void {
  if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= SEAT_COUNT) {
    throw new RangeError(`playerIndex must be an integer in 0..${SEAT_COUNT - 1}`)
  }
}

function assertSlotIndex(slotIndex: number): void {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) {
    throw new RangeError(`slotIndex must be an integer in 0..${SLOT_COUNT - 1}`)
  }
}

function assertHomeStep(homeStep: number): void {
  if (!Number.isInteger(homeStep) || homeStep < 0 || homeStep >= HOME_STEP_COUNT) {
    throw new RangeError(`homeStep must be an integer in 0..${HOME_STEP_COUNT - 1}`)
  }
}

export function getRingCell(ringIndex: number): BoardCell {
  assertRingIndex(ringIndex)
  return RING_CELLS[ringIndex]
}

export function getYardCell(playerIndex: number, slotIndex: number): BoardCell {
  assertSeatIndex(playerIndex)
  assertSlotIndex(slotIndex)
  return YARD_CELLS[playerIndex][slotIndex]
}

export function getHomeCell(playerIndex: number, homeStep: number): BoardCell {
  assertSeatIndex(playerIndex)
  assertHomeStep(homeStep)
  return HOME_CELLS[playerIndex][homeStep]
}

export function getCenterCell(): BoardCell {
  return { row: 5, col: 5 }
}

export function getRingEdges(): ReadonlyArray<readonly [BoardCell, BoardCell]> {
  return RING_CELLS.map((cell, index) => {
    const next = RING_CELLS[(index + 1) % RING_SIZE]
    return [cell, next] as const
  })
}
