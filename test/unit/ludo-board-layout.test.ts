import { describe, expect, it } from 'vitest'
import { LUDO_PLAYER_COLORS, LUDO_START_INDEXES } from '../../app/features/games/ludo/board'
import {
  BOARD_GRID_SIZE,
  getCenterCell,
  getHomeCell,
  getRingCell,
  getRingEdges,
  getYardCell,
  type BoardCell,
} from '../../app/features/games/ludo/boardLayout'

function cellKey(cell: BoardCell): string {
  return `${cell.row},${cell.col}`
}

function isOrthogonalNeighbor(a: BoardCell, b: BoardCell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

/** Corner pad regions outside the cross arms. */
const YARD_REGIONS: ReadonlyArray<{
  rowMin: number
  rowMax: number
  colMin: number
  colMax: number
}> = [
  { rowMin: 0, rowMax: 3, colMin: 7, colMax: 10 }, // red TR
  { rowMin: 7, rowMax: 10, colMin: 7, colMax: 10 }, // yellow BR
  { rowMin: 7, rowMax: 10, colMin: 0, colMax: 3 }, // blue BL
  { rowMin: 0, rowMax: 3, colMin: 0, colMax: 3 }, // green TL
]

function isInRegion(
  cell: BoardCell,
  region: { rowMin: number; rowMax: number; colMin: number; colMax: number },
): boolean {
  return (
    cell.row >= region.rowMin &&
    cell.row <= region.rowMax &&
    cell.col >= region.colMin &&
    cell.col <= region.colMax
  )
}

function isAdjacentToYardRegion(start: BoardCell, playerIndex: number): boolean {
  const region = YARD_REGIONS[playerIndex]
  const neighbors: BoardCell[] = [
    { row: start.row - 1, col: start.col },
    { row: start.row + 1, col: start.col },
    { row: start.row, col: start.col - 1 },
    { row: start.row, col: start.col + 1 },
  ]
  return neighbors.some((neighbor) => isInRegion(neighbor, region))
}

describe('ludo board layout', () => {
  it('uses an 11×11 grid', () => {
    expect(BOARD_GRID_SIZE).toBe(11)
  })

  it('maps seat colors to red, yellow, blue, green', () => {
    expect([...LUDO_PLAYER_COLORS]).toEqual(['red', 'yellow', 'blue', 'green'])
  })

  it('has 40 distinct ring cells within 0..10', () => {
    const cells = Array.from({ length: 40 }, (_, index) => getRingCell(index))
    const keys = cells.map(cellKey)

    expect(new Set(keys).size).toBe(40)
    for (const cell of cells) {
      expect(cell.row).toBeGreaterThanOrEqual(0)
      expect(cell.row).toBeLessThanOrEqual(10)
      expect(cell.col).toBeGreaterThanOrEqual(0)
      expect(cell.col).toBeLessThanOrEqual(10)
    }
  })

  it('places start cells adjacent to each player yard region', () => {
    expect(getRingCell(0)).toEqual({ row: 0, col: 6 })
    expect(getRingCell(10)).toEqual({ row: 6, col: 10 })
    expect(getRingCell(20)).toEqual({ row: 10, col: 4 })
    expect(getRingCell(30)).toEqual({ row: 4, col: 0 })

    for (let playerIndex = 0; playerIndex < 4; playerIndex += 1) {
      const start = getRingCell(LUDO_START_INDEXES[playerIndex])
      expect(isAdjacentToYardRegion(start, playerIndex)).toBe(true)
    }
  })

  it('maps yard cells to exact coordinates per seat', () => {
    expect([0, 1, 2, 3].map((slot) => getYardCell(0, slot))).toEqual([
      { row: 1, col: 8 },
      { row: 1, col: 9 },
      { row: 2, col: 8 },
      { row: 2, col: 9 },
    ])
    expect([0, 1, 2, 3].map((slot) => getYardCell(1, slot))).toEqual([
      { row: 8, col: 8 },
      { row: 8, col: 9 },
      { row: 9, col: 8 },
      { row: 9, col: 9 },
    ])
    expect([0, 1, 2, 3].map((slot) => getYardCell(2, slot))).toEqual([
      { row: 8, col: 1 },
      { row: 8, col: 2 },
      { row: 9, col: 1 },
      { row: 9, col: 2 },
    ])
    expect([0, 1, 2, 3].map((slot) => getYardCell(3, slot))).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ])
  })

  it('has 16 distinct yard cells and 16 distinct home cells with no yard/home/ring overlap', () => {
    const yardKeys = new Set<string>()
    const homeKeys = new Set<string>()
    const ringKeys = new Set(Array.from({ length: 40 }, (_, index) => cellKey(getRingCell(index))))

    for (let playerIndex = 0; playerIndex < 4; playerIndex += 1) {
      for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
        yardKeys.add(cellKey(getYardCell(playerIndex, slotIndex)))
      }
      for (let homeStep = 0; homeStep < 4; homeStep += 1) {
        homeKeys.add(cellKey(getHomeCell(playerIndex, homeStep)))
      }
    }

    expect(yardKeys.size).toBe(16)
    expect(homeKeys.size).toBe(16)

    for (const key of homeKeys) {
      expect(ringKeys.has(key)).toBe(false)
    }
    for (const key of yardKeys) {
      expect(ringKeys.has(key)).toBe(false)
      expect(homeKeys.has(key)).toBe(false)
    }
  })

  it('maps home cells toward the center per seat', () => {
    expect([0, 1, 2, 3].map((step) => getHomeCell(0, step))).toEqual([
      { row: 1, col: 5 },
      { row: 2, col: 5 },
      { row: 3, col: 5 },
      { row: 4, col: 5 },
    ])
    expect([0, 1, 2, 3].map((step) => getHomeCell(1, step))).toEqual([
      { row: 5, col: 9 },
      { row: 5, col: 8 },
      { row: 5, col: 7 },
      { row: 5, col: 6 },
    ])
    expect([0, 1, 2, 3].map((step) => getHomeCell(2, step))).toEqual([
      { row: 9, col: 5 },
      { row: 8, col: 5 },
      { row: 7, col: 5 },
      { row: 6, col: 5 },
    ])
    expect([0, 1, 2, 3].map((step) => getHomeCell(3, step))).toEqual([
      { row: 5, col: 1 },
      { row: 5, col: 2 },
      { row: 5, col: 3 },
      { row: 5, col: 4 },
    ])
  })

  it('returns a closed ring of 40 edges', () => {
    const edges = getRingEdges()
    expect(edges).toHaveLength(40)

    for (let index = 0; index < 40; index += 1) {
      const [from, to] = edges[index]
      expect(from).toEqual(getRingCell(index))
      expect(to).toEqual(getRingCell((index + 1) % 40))
      expect(isOrthogonalNeighbor(from, to)).toBe(true)
    }
  })

  it('places the center hub at (5,5)', () => {
    expect(getCenterCell()).toEqual({ row: 5, col: 5 })
  })

  it('rejects out-of-range indexes', () => {
    expect(() => getRingCell(-1)).toThrow(RangeError)
    expect(() => getRingCell(40)).toThrow(RangeError)
    expect(() => getYardCell(4, 0)).toThrow(RangeError)
    expect(() => getYardCell(0, 4)).toThrow(RangeError)
    expect(() => getHomeCell(4, 0)).toThrow(RangeError)
    expect(() => getHomeCell(0, 4)).toThrow(RangeError)
  })
})
