import { describe, expect, it } from 'vitest'
import { chooseMoleMeadowAction } from '../../app/features/games/moleMeadow/ai'
import { MOLE_GOAL, type MoleMeadowState } from '../../app/features/games/moleMeadow/engine'

function stateWith(pieces: number[], roll: 1 | 2 | 3, openHole: number | null = null): MoleMeadowState {
  return { pieces: [pieces, [0, 0]], currentPlayerIndex: 0, pendingRoll: roll, openHole, lastEvent: null }
}

const moves = (count: number) => Array.from({ length: count }, (_, pieceIndex) => ({ type: 'move' as const, pieceIndex }))

describe('Maulwurf-Wiese AI', () => {
  it('rolls and digs when that is the only option', () => {
    expect(chooseMoleMeadowAction(stateWith([0, 0], 1), [{ type: 'roll' }])).toEqual({ type: 'roll' })
    expect(chooseMoleMeadowAction(stateWith([0, 0], 1), [{ type: 'dig' }])).toEqual({ type: 'dig' })
  })

  it('reaches the apple tree when possible, even on easy', () => {
    const state = stateWith([3, MOLE_GOAL - 2], 2)
    expect(chooseMoleMeadowAction(state, moves(2), { difficulty: 'easy', random: () => 0 })).toEqual({ type: 'move', pieceIndex: 1 })
  })

  it('avoids the open hole on hard', () => {
    const state = stateWith([5, 2], 3, 8)
    expect(chooseMoleMeadowAction(state, moves(2), { difficulty: 'hard' })).toEqual({ type: 'move', pieceIndex: 1 })
  })
})
