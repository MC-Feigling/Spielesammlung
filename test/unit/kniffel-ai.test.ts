import { describe, expect, it } from 'vitest'
import { chooseKniffelAction } from '../../app/features/games/kniffel/ai'
import type { KniffelGameState } from '../../app/features/games/kniffel/engine'

function createState(overrides: Partial<KniffelGameState> = {}): KniffelGameState {
  return {
    currentPlayerIndex: 0,
    dice: [6, 6, 6, 6, 1],
    heldDice: [false, false, false, false, false],
    rollsUsed: 3,
    scoreSheets: [{}, {}],
    ...overrides,
  }
}

describe('kniffel AI', () => {
  it('rolls until the third roll', () => {
    expect(chooseKniffelAction(createState({ rollsUsed: 1 }), { difficulty: 'hard' })).toEqual({
      type: 'roll',
    })
  })

  it('prefers an available Kniffel on hard', () => {
    expect(chooseKniffelAction(createState({ dice: [6, 6, 6, 6, 6] }), {
      difficulty: 'hard',
    })).toEqual({
      type: 'score',
      category: 'kniffel',
    })
  })

  it('chooses the highest positive available score on hard', () => {
    expect(chooseKniffelAction(createState(), { difficulty: 'hard' })).toEqual({
      type: 'score',
      category: 'manyPips',
    })
  })

  it('strikes the lowest-opportunity category without positive scores on hard', () => {
    expect(chooseKniffelAction(createState({
      dice: [1, 2, 3, 3, 5],
      scoreSheets: [{
        ones: 0,
        twos: 0,
        threes: 0,
        fours: 0,
        fives: 0,
        sixes: 0,
        chance: 0,
        manyPips: 0,
        fewPips: 0,
      }, {}],
    }), { difficulty: 'hard' })).toEqual({
      type: 'score',
      category: 'threeOfKind',
    })
  })

  it('defaults to easy and may skip the best positive score', () => {
    expect(chooseKniffelAction(createState(), { random: () => 0 })).toEqual({
      type: 'score',
      category: 'ones',
    })
  })
})
