import { describe, expect, it } from 'vitest'
import { createConnectFourGame } from '../../app/features/games/connectFour/engine'

const COLUMNS = 7
const ROWS = 6

function dropSequence(
  game: ReturnType<typeof createConnectFourGame>,
  columns: number[],
) {
  for (const column of columns) {
    game.applyAction({ type: 'drop', column })
  }
}

/**
 * Full-board drop order for columns patterned 000111 / 111000 alternating —
 * no four-in-a-row (verified).
 */
const DRAW_SEQUENCE = [
  0, 1, 0, 1, 0, 0, 2, 0, 2, 0, 2, 1, 1, 2, 1, 2, 1, 2, 4, 3, 4, 3, 4, 3,
  3, 4, 3, 4, 3, 4, 6, 5, 6, 5, 6, 5, 5, 6, 5, 6, 5, 6,
] as const

describe('connect four engine', () => {
  it('starts with an empty board and seat 0 to move', () => {
    const game = createConnectFourGame()
    const state = game.getState()

    expect(state.cells).toHaveLength(COLUMNS)
    expect(state.cells.every((column) => column.length === ROWS)).toBe(true)
    expect(state.cells.every((column) => column.every((cell) => cell === null))).toBe(true)
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.lastMove).toBeNull()
    expect(game.isTerminal()).toBe(false)
  })

  it('drops into the lowest empty row', () => {
    const game = createConnectFourGame()
    const result = game.applyAction({ type: 'drop', column: 3 })

    expect(result.state.cells[3]![0]).toBe(0)
    expect(result.state.lastMove).toEqual({ column: 3, row: 0 })
    expect(result.state.currentPlayerIndex).toBe(1)
    expect(result.winnerSeatIndexes).toEqual([])
  })

  it('stacks pieces in the same column', () => {
    const game = createConnectFourGame()

    game.applyAction({ type: 'drop', column: 2 })
    const result = game.applyAction({ type: 'drop', column: 2 })

    expect(result.state.cells[2]![0]).toBe(0)
    expect(result.state.cells[2]![1]).toBe(1)
    expect(result.state.lastMove).toEqual({ column: 2, row: 1 })
  })

  it('rejects a drop into a full column with a German error', () => {
    const game = createConnectFourGame()

    // Same column alternating seats → 0,1,0,1,0,1 — no four-in-a-row
    for (let row = 0; row < ROWS; row += 1) {
      game.applyAction({ type: 'drop', column: 0 })
    }

    expect(() => game.applyAction({ type: 'drop', column: 0 })).toThrow('Spalte ist voll')
  })

  it('advances the turn after a non-terminal drop', () => {
    const game = createConnectFourGame()

    expect(game.getState().currentPlayerIndex).toBe(0)
    game.applyAction({ type: 'drop', column: 0 })
    expect(game.getState().currentPlayerIndex).toBe(1)
    game.applyAction({ type: 'drop', column: 1 })
    expect(game.getState().currentPlayerIndex).toBe(0)
  })

  it('lists only non-full columns as valid actions', () => {
    const game = createConnectFourGame()

    for (let row = 0; row < ROWS; row += 1) {
      game.applyAction({ type: 'drop', column: 3 })
    }

    const actions = game.getValidActions()
    expect(actions).toHaveLength(COLUMNS - 1)
    expect(actions.every((action) => action.type === 'drop')).toBe(true)
    expect(actions.map((action) => action.column).sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 5, 6])
  })

  it('wins horizontally with four in a row', () => {
    const game = createConnectFourGame()
    dropSequence(game, [0, 6, 1, 6, 2, 6])
    const result = game.applyAction({ type: 'drop', column: 3 })

    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([0])
  })

  it('wins vertically with four in a row', () => {
    const game = createConnectFourGame()
    dropSequence(game, [0, 1, 0, 1, 0, 1])
    const result = game.applyAction({ type: 'drop', column: 0 })

    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([0])
  })

  it('wins on diagonal bottom-left to top-right', () => {
    const game = createConnectFourGame()
    dropSequence(game, [
      0, // 0@(0,0)
      1, // 1@(1,0)
      1, // 0@(1,1)
      2, // 1@(2,0)
      3, // 0@(3,0)
      2, // 1@(2,1)
      2, // 0@(2,2)
      3, // 1@(3,1)
      4, // 0@(4,0)
      3, // 1@(3,2)
    ])
    const result = game.applyAction({ type: 'drop', column: 3 }) // 0@(3,3)

    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([0])
  })

  it('wins on diagonal top-left to bottom-right', () => {
    const game = createConnectFourGame()
    dropSequence(game, [
      3, // 0@(3,0)
      2, // 1@(2,0)
      2, // 0@(2,1)
      1, // 1@(1,0)
      0, // 0@(0,0)
      1, // 1@(1,1)
      1, // 0@(1,2)
      0, // 1@(0,1)
      4, // 0@(4,0)
      0, // 1@(0,2)
    ])
    const result = game.applyAction({ type: 'drop', column: 0 }) // 0@(0,3)

    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([0])
  })

  it('declares a draw when the board is full without a win', () => {
    const game = createConnectFourGame()

    dropSequence(game, [...DRAW_SEQUENCE.slice(0, -1)])
    const result = game.applyAction({ type: 'drop', column: DRAW_SEQUENCE[DRAW_SEQUENCE.length - 1]! })

    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([0, 1])
    expect(game.getValidActions()).toEqual([])
  })

  it('deep-clones state from getState', () => {
    const game = createConnectFourGame()
    game.applyAction({ type: 'drop', column: 3 })

    const snapshot = game.getState()
    snapshot.cells[3]![0] = 1
    snapshot.currentPlayerIndex = 0
    snapshot.lastMove = null

    const fresh = game.getState()
    expect(fresh.cells[3]![0]).toBe(0)
    expect(fresh.currentPlayerIndex).toBe(1)
    expect(fresh.lastMove).toEqual({ column: 3, row: 0 })
  })

  it('rejects invalid column indexes', () => {
    const game = createConnectFourGame()

    expect(() => game.applyAction({ type: 'drop', column: -1 })).toThrow()
    expect(() => game.applyAction({ type: 'drop', column: 7 })).toThrow()
  })

  it('returns no actions when the game is over', () => {
    const game = createConnectFourGame()
    dropSequence(game, [0, 6, 1, 6, 2, 6, 3])

    expect(game.isTerminal()).toBe(true)
    expect(game.getValidActions()).toEqual([])
    expect(() => game.applyAction({ type: 'drop', column: 4 })).toThrow()
  })
})
