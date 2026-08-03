import { describe, expect, it } from 'vitest'
import { createMemoryAi } from '../../app/features/games/memory/ai'
import type { MemoryGameState } from '../../app/features/games/memory/engine'

function createState(faceUpCardIndexes: number[]): MemoryGameState {
  return {
    rows: 2,
    cols: 2,
    cards: [0, 1, 0, 1],
    currentPlayerIndex: 1,
    faceUpCardIndexes,
    matchedPairIds: [],
    matchedPairCounts: [0, 0],
  }
}

describe('memory AI', () => {
  it('selects a remembered matching card before unknown cards', () => {
    const ai = createMemoryAi(() => 0.99)

    ai.observe(createState([0]))
    ai.observe(createState([2]))

    expect(ai.chooseAction(createState([2]))).toEqual({ type: 'flip', cardIndex: 0 })
  })

  it('selects an unknown card when no remembered pair exists', () => {
    const ai = createMemoryAi(() => 0)
    const state = createState([])

    ai.observe(state)

    expect(ai.chooseAction(state)).toEqual({ type: 'flip', cardIndex: 0 })
  })
})
