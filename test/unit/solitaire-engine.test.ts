import { describe, expect, it } from 'vitest'
import {
  allMoves,
  applyMove,
  createSolitaireState,
  findMove,
  isFinished,
  isOnBoard,
  isPerfect,
  isSolved,
  movesFrom,
} from '../../app/features/games/solitaire/engine'

/** Eine bekannte Lösung: [vonZeile, vonSpalte, nachZeile, nachSpalte]. */
const SOLUTION: Array<[number, number, number, number]> = [
  [1, 3, 3, 3], [2, 1, 2, 3], [0, 2, 2, 2], [0, 4, 0, 2], [2, 3, 2, 1], [2, 0, 2, 2], [2, 4, 0, 4], [2, 6, 2, 4],
  [3, 2, 1, 2], [0, 2, 2, 2], [3, 0, 3, 2], [3, 2, 1, 2], [3, 4, 1, 4], [0, 4, 2, 4], [3, 6, 3, 4], [3, 4, 1, 4],
  [5, 2, 3, 2], [4, 0, 4, 2], [4, 2, 2, 2], [1, 2, 3, 2], [3, 2, 3, 4], [4, 4, 2, 4], [1, 4, 3, 4], [4, 6, 4, 4],
  [4, 3, 4, 5], [6, 4, 4, 4], [3, 4, 5, 4], [6, 2, 6, 4], [6, 4, 4, 4], [4, 5, 4, 3], [5, 3, 3, 3],
]

describe('solitaire engine', () => {
  it('starts with 33 holes, 32 pegs and the centre empty', () => {
    const state = createSolitaireState()
    const holes = state.cells.flat().filter((cell) => cell !== null)
    expect(holes).toHaveLength(33)
    expect(state.pegCount).toBe(32)
    expect(state.cells[3]![3]).toBe('empty')
    expect(isOnBoard(0, 0)).toBe(false)
    expect(isOnBoard(0, 2)).toBe(true)
  })

  it('offers exactly the four jumps into the centre at the start', () => {
    const moves = allMoves(createSolitaireState())
    expect(moves).toHaveLength(4)
    for (const move of moves) expect(move.to).toEqual({ row: 3, col: 3 })
  })

  it('jumps over a peg and removes it', () => {
    const start = createSolitaireState()
    const move = findMove(start, { row: 1, col: 3 }, { row: 3, col: 3 })!
    const next = applyMove(start, move)
    expect(next.cells[1]![3]).toBe('empty')
    expect(next.cells[2]![3]).toBe('empty')
    expect(next.cells[3]![3]).toBe('peg')
    expect(next.pegCount).toBe(31)
    expect(next.moveCount).toBe(1)
    expect(start.cells[3]![3]).toBe('empty')
  })

  it('rejects illegal jumps', () => {
    const start = createSolitaireState()
    expect(findMove(start, { row: 0, col: 3 }, { row: 2, col: 3 })).toBeNull()
    expect(movesFrom(start, { row: 3, col: 3 })).toEqual([])
    expect(() => applyMove(start, {
      from: { row: 3, col: 1 },
      over: { row: 3, col: 2 },
      to: { row: 3, col: 3 },
    })).not.toThrow()
    expect(() => applyMove(start, {
      from: { row: 0, col: 2 },
      over: { row: 1, col: 2 },
      to: { row: 2, col: 2 },
    })).toThrow()
  })

  it('can be solved perfectly with the last peg in the centre', () => {
    let state = createSolitaireState()
    for (const [fromRow, fromCol, toRow, toCol] of SOLUTION) {
      const move = findMove(state, { row: fromRow, col: fromCol }, { row: toRow, col: toCol })
      expect(move).not.toBeNull()
      state = applyMove(state, move!)
    }
    expect(state.pegCount).toBe(1)
    expect(isSolved(state)).toBe(true)
    expect(isPerfect(state)).toBe(true)
    expect(isFinished(state)).toBe(true)
  })
})
