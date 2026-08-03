import { describe, expect, it } from 'vitest'
import { chooseLudoAction } from '../../app/features/games/ludo/ai'
import { canControlPiece, createLudoGame, createLudoGameFromState } from '../../app/features/games/ludo/engine'

describe('ludo engine', () => {
  it('allows controlling only pieces owned by the current player', () => {
    const game = createLudoGameFromState({
      playerCount: 2,
      currentPlayerIndex: 1,
      pendingRoll: 3,
      pieces: [
        [{ progress: 0 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
        [{ progress: 0 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
      ],
    })
    const state = game.getState()

    expect(canControlPiece(state, 0)).toBe(false)
    expect(canControlPiece(state, 1)).toBe(true)
  })

  it('cannot enter from the yard without rolling a six', () => {
    const game = createLudoGame({ playerCount: 2, seed: 1 })

    game.applyAction({ type: 'roll', forcedValue: 5 })

    const moves = game.getValidActions().filter((action) => action.type === 'move')
    expect(moves.every((action) => action.from !== 'yard')).toBe(true)
  })

  it('allows a piece to enter from the yard on a six', () => {
    const game = createLudoGame({ playerCount: 2, seed: 1 })

    game.applyAction({ type: 'roll', forcedValue: 6 })

    expect(game.getValidActions()).toContainEqual({
      type: 'move',
      pieceIndex: 0,
      from: 'yard',
    })
  })

  it('captures an opponent on the landing field', () => {
    const game = createLudoGameFromState({
      playerCount: 2,
      currentPlayerIndex: 0,
      pendingRoll: 1,
      pieces: [
        [{ progress: 0 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
        [{ progress: 31 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
      ],
    })

    const result = game.applyAction({ type: 'move', pieceIndex: 0, from: 'ring' })

    expect(result.state.pieces[0][0].progress).toBe(1)
    expect(result.state.pieces[1][0].progress).toBe(-1)
    expect(result.state.lastEvent).toBe('capture')
  })

  it('keeps the current player after moving a six', () => {
    const game = createLudoGame({ playerCount: 2, seed: 1 })

    game.applyAction({ type: 'roll', forcedValue: 6 })
    const result = game.applyAction({ type: 'move', pieceIndex: 0, from: 'yard' })

    expect(result.state.currentPlayerIndex).toBe(0)
    expect(result.state.pendingRoll).toBeNull()
  })

  it('wins when all pieces reach the home stretch end', () => {
    const game = createLudoGameFromState({
      playerCount: 2,
      currentPlayerIndex: 0,
      pendingRoll: 1,
      pieces: [
        [{ progress: 43 }, { progress: 43 }, { progress: 43 }, { progress: 42 }],
        [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
      ],
    })

    const result = game.applyAction({ type: 'move', pieceIndex: 3, from: 'home' })

    expect(result.winnerSeatIndexes).toEqual([0])
    expect(game.isTerminal()).toBe(true)
  })
})

describe('ludo AI', () => {
  function captureScenario() {
    return createLudoGameFromState({
      playerCount: 2,
      currentPlayerIndex: 0,
      pendingRoll: 6,
      pieces: [
        [{ progress: 35 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
        [{ progress: 1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }],
      ],
    })
  }

  it('prioritizes a capture over entering a piece from the yard on hard', () => {
    const game = captureScenario()

    expect(chooseLudoAction(game.getState(), game.getValidActions(), {
      difficulty: 'hard',
    })).toEqual({
      type: 'move',
      pieceIndex: 0,
      from: 'ring',
    })
  })

  it('defaults to easy and may skip the optimal capture', () => {
    const game = captureScenario()

    expect(chooseLudoAction(game.getState(), game.getValidActions(), {
      random: () => 0,
    })).toEqual({
      type: 'move',
      pieceIndex: 1,
      from: 'yard',
    })
  })
})
