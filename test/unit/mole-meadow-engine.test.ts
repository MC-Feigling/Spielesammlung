import { describe, expect, it } from 'vitest'
import {
  MOLE_DIE_FACES,
  MOLE_GOAL,
  MOLE_SPOT_COUNT,
  MOLE_SPOT_MAX,
  MOLE_SPOT_MIN,
  createMoleMeadowGame,
  pickMoleSpots,
  targetField,
} from '../../app/features/games/moleMeadow/engine'

/** random() value that makes the die show `face`. */
function rollTo(face: (typeof MOLE_DIE_FACES)[number]): number {
  return (MOLE_DIE_FACES.indexOf(face) + 0.5) / MOLE_DIE_FACES.length
}

function sequence(values: number[]): () => number {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]!
}

describe('Maulwurf-Wiese engine', () => {
  it('starts everybody at the start with the chosen rabbit count', () => {
    const game = createMoleMeadowGame({ playerCount: 3, figureCount: 2, spots: [4, 8] })
    expect(game.getState().pieces).toEqual([[0, 0], [0, 0], [0, 0]])
    expect(game.getValidActions()).toEqual([{ type: 'roll' }])
  })

  it('rejects invalid setups', () => {
    expect(() => createMoleMeadowGame({ playerCount: 1 })).toThrow()
    expect(() => createMoleMeadowGame({ playerCount: 2, figureCount: 5 })).toThrow()
  })

  it('picks distinct hidden spots inside the path', () => {
    const spots = pickMoleSpots(Math.random)
    expect(new Set(spots).size).toBe(MOLE_SPOT_COUNT)
    for (const spot of spots) {
      expect(spot).toBeGreaterThanOrEqual(MOLE_SPOT_MIN)
      expect(spot).toBeLessThanOrEqual(MOLE_SPOT_MAX)
    }
  })

  it('skips occupied fields when counting steps', () => {
    const pieces = [[2, 0], [3, 0]]
    expect(targetField(pieces, { playerIndex: 0, pieceIndex: 0 }, 1)).toBe(4)
    expect(targetField(pieces, { playerIndex: 0, pieceIndex: 1 }, 3)).toBe(5)
    expect(targetField([[15, 0], [16, 0]], { playerIndex: 0, pieceIndex: 0 }, 3)).toBe(MOLE_GOAL)
  })

  it('moves a rabbit and passes the turn', () => {
    const game = createMoleMeadowGame({ playerCount: 2, spots: [5, 9], random: sequence([rollTo(3)]) })
    game.applyAction({ type: 'roll' })
    expect(game.getState().pendingRoll).toBe(3)
    expect(game.getValidActions()).toHaveLength(3)
    const { state } = game.applyAction({ type: 'move', pieceIndex: 1 })
    expect(state.pieces[0]).toEqual([0, 3, 0])
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.pendingRoll).toBeNull()
  })

  it('the mole opens a hole and sends rabbits on it back to start', () => {
    // P0 rolls 2 and moves to field 2, P1 rolls mole → hole opens on field 2.
    const game = createMoleMeadowGame({
      playerCount: 2,
      spots: [2, 9],
      random: sequence([rollTo(2), rollTo('mole'), 0]),
    })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'move', pieceIndex: 0 })
    game.applyAction({ type: 'roll' })
    expect(game.getValidActions()).toEqual([{ type: 'dig' }])
    const { state } = game.applyAction({ type: 'dig' })
    expect(state.openHole).toBe(2)
    expect(state.pieces[0]![0]).toBe(0)
    expect(state.lastEvent).toEqual({ type: 'dug', closed: null, opened: 2, fallen: [{ playerIndex: 0, pieceIndex: 0 }] })
  })

  it('a new hole always opens somewhere else and closes the old one', () => {
    const game = createMoleMeadowGame({
      playerCount: 2,
      spots: [4, 7],
      random: sequence([rollTo('mole'), 0, rollTo('mole'), 0]),
    })
    game.applyAction({ type: 'roll' })
    expect(game.applyAction({ type: 'dig' }).state.openHole).toBe(4)
    game.applyAction({ type: 'roll' })
    const { state } = game.applyAction({ type: 'dig' })
    expect(state.openHole).toBe(7)
    expect(state.lastEvent).toMatchObject({ closed: 4, opened: 7 })
  })

  it('landing on the open hole means falling back to start', () => {
    const game = createMoleMeadowGame({
      playerCount: 2,
      spots: [3, 9],
      random: sequence([rollTo('mole'), 0, rollTo(3)]),
    })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'dig' })
    game.applyAction({ type: 'roll' })
    const { state } = game.applyAction({ type: 'move', pieceIndex: 0 })
    expect(state.pieces[1]![0]).toBe(0)
    expect(state.lastEvent).toMatchObject({ type: 'moved', to: 3, fell: true })
  })

  it('the first rabbit at the apple tree wins', () => {
    const game = createMoleMeadowGame({ playerCount: 2, figureCount: 2, spots: [4, 8], random: () => rollTo(3) })
    let result = game.applyAction({ type: 'roll' })
    while (!game.isTerminal()) {
      const action = game.getValidActions()[0]!
      result = game.applyAction(action)
    }
    expect(result.winnerSeatIndexes).toHaveLength(1)
    expect(result.state.pieces[result.winnerSeatIndexes[0]!]).toContain(MOLE_GOAL)
    expect(game.getValidActions()).toEqual([])
  })
})
