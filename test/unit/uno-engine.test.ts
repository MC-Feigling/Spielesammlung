import { describe, expect, it } from 'vitest'
import { createUnoGame } from '../../app/features/games/uno/engine'

const NUMBER_RANKS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

describe('uno engine phase 1: deck + deal', () => {
  it('deals a full 108-card deck across hands and piles', () => {
    const game = createUnoGame({ playerCount: 2, seed: 1 })
    const state = game.getState()

    const totalCards =
      state.hands.reduce((sum, hand) => sum + hand.length, 0)
      + state.drawPile.length
      + state.discardPile.length

    expect(totalCards).toBe(108)
  })

  it.each([2, 3, 4])('deals 7 cards to each of %i players', (playerCount) => {
    const game = createUnoGame({ playerCount, seed: 42 })
    const state = game.getState()

    expect(state.hands).toHaveLength(playerCount)
    expect(state.hands.every((hand) => hand.length === 7)).toBe(true)
  })

  it('starts discard with a number card and matching currentColor', () => {
    const game = createUnoGame({ playerCount: 4, seed: 7 })
    const state = game.getState()
    const top = state.discardPile[state.discardPile.length - 1]

    expect(top).toBeDefined()
    expect(NUMBER_RANKS.has(top.rank)).toBe(true)
    expect(top.color).not.toBe('wild')
    expect(state.currentColor).toBe(top.color)
  })

  it('initializes pendingDrawCount to 0', () => {
    const game = createUnoGame({ playerCount: 3, seed: 99 })
    const state = game.getState()

    expect(state.pendingDrawCount).toBe(0)
    expect(state.pendingDrawKind).toBeNull()
  })

  it('is not terminal after deal', () => {
    const game = createUnoGame({ playerCount: 2, seed: 1 })
    expect(game.isTerminal()).toBe(false)
  })
})
