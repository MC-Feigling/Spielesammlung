import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { createKniffelGame } from '../../app/features/games/kniffel/engine'

describe('kniffel engine', () => {
  it('rolls five dice and preserves held dice', () => {
    const game = createKniffelGame({ playerCount: 2, random: () => 0 })

    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'toggleHold', dieIndex: 0 })
    const result = game.applyAction({ type: 'roll' })

    expect(result.state.dice).toEqual([1, 1, 1, 1, 1])
    expect(result.state.rollsUsed).toBe(2)
    expect(result.state.heldDice).toEqual([true, false, false, false, false])
  })

  it('requires a roll before a category can be scored', () => {
    const game = createKniffelGame({ playerCount: 2 })

    expect(() => game.applyAction({ type: 'score', category: 'chance' })).toThrow('mindestens einmal würfeln')
  })

  it('advances to the next player after scoring an unused category', () => {
    const game = createKniffelGame({ playerCount: 2, random: () => 0 })

    game.applyAction({ type: 'roll' })
    const result = game.applyAction({ type: 'score', category: 'ones' })

    expect(result.state.scoreSheets[0].ones).toBe(5)
    expect(result.state.currentPlayerIndex).toBe(1)
    expect(result.state.dice).toEqual([])
    expect(result.state.rollsUsed).toBe(0)
  })

  it('prevents scoring a category twice', () => {
    const game = createKniffelGame({ playerCount: 2, random: () => 0 })

    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'score', category: 'ones' })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'score', category: 'chance' })
    game.applyAction({ type: 'roll' })

    expect(() => game.applyAction({ type: 'score', category: 'ones' })).toThrow('bereits gewertet')
  })

  it('only permits scoring after the third roll', () => {
    const game = createKniffelGame({ playerCount: 2, random: () => 0 })

    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'roll' })

    expect(game.getValidActions().some((action) => action.type === 'roll')).toBe(false)
    expect(game.getValidActions().filter((action) => action.type === 'score')).toHaveLength(15)
  })

  it('exposes toggleHold in reactive validActions after the first roll', () => {
    const game = createKniffelGame({ playerCount: 2, random: () => 0 })
    const state = ref(game.getState())
    const validActions = computed(() => {
      void state.value
      return game.getValidActions()
    })

    expect(validActions.value.some((action) => action.type === 'toggleHold')).toBe(false)

    state.value = game.applyAction({ type: 'roll' }).state

    expect(validActions.value.some((action) => action.type === 'toggleHold')).toBe(true)
  })
})