import { describe, expect, it } from 'vitest'
import { createMemoryGame } from '../../app/features/games/memory/engine'

describe('memory engine', () => {
  it('rejects odd cell counts', () => {
    expect(() => createMemoryGame({ playerCount: 2, rows: 3, cols: 3 })).toThrow()
  })

  it('matches a pair and grants the current player another turn', () => {
    const game = createMemoryGame({ playerCount: 2, rows: 2, cols: 2, deck: [0, 0, 1, 1] })

    game.applyAction({ type: 'flip', cardIndex: 0 })
    const result = game.applyAction({ type: 'flip', cardIndex: 1 })

    expect(result.state.matchedPairIds).toContain(0)
    expect(result.state.currentPlayerIndex).toBe(0)
  })

  it('switches player after resolving a mismatch', () => {
    const game = createMemoryGame({ playerCount: 2, rows: 2, cols: 2, deck: [0, 1, 0, 1] })

    game.applyAction({ type: 'flip', cardIndex: 0 })
    game.applyAction({ type: 'flip', cardIndex: 1 })
    game.applyAction({ type: 'resolveMismatch' })

    expect(game.getState().currentPlayerIndex).toBe(1)
  })

  it('rejects flipping an already revealed card', () => {
    const game = createMemoryGame({ playerCount: 2, rows: 2, cols: 2, deck: [0, 0, 1, 1] })

    game.applyAction({ type: 'flip', cardIndex: 0 })

    expect(() => game.applyAction({ type: 'flip', cardIndex: 0 })).toThrow()
  })
})
