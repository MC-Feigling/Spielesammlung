import { describe, expect, it } from 'vitest'
import { chooseUnoAction } from '../../app/features/games/uno/ai'
import type { UnoAction, UnoCard, UnoGameState } from '../../app/features/games/uno/engine'

function card(id: string, color: UnoCard['color'], rank: UnoCard['rank']): UnoCard {
  return { id, color, rank }
}

function createState(overrides: Partial<UnoGameState> = {}): UnoGameState {
  return {
    playerCount: 2,
    hands: [[], []],
    drawPile: [],
    discardPile: [card('discard-red-5', 'red', '5')],
    currentColor: 'red',
    currentPlayerIndex: 0,
    direction: 1,
    pendingDrawCount: 0,
    pendingDrawKind: null,
    ...overrides,
  }
}

describe('uno AI', () => {
  it('returns null when no actions are available', () => {
    expect(chooseUnoAction(createState(), [], { difficulty: 'hard' })).toBeNull()
  })

  it('prefers stacking over accepting the penalty on hard', () => {
    const drawTwo = card('hand-red-drawTwo', 'red', 'drawTwo')
    const state = createState({
      hands: [[drawTwo], []],
      discardPile: [card('discard-blue-drawTwo', 'blue', 'drawTwo')],
      currentColor: 'blue',
      pendingDrawCount: 2,
      pendingDrawKind: 'drawTwo',
    })
    const actions: UnoAction[] = [
      { type: 'draw' },
      { type: 'play', cardId: drawTwo.id },
    ]

    expect(chooseUnoAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'play',
      cardId: drawTwo.id,
    })
  })

  it('prefers skip and drawTwo over a plain number on hard', () => {
    const numberCard = card('hand-red-3', 'red', '3')
    const skip = card('hand-red-skip', 'red', 'skip')
    const state = createState({
      hands: [[numberCard, skip], []],
    })
    const actions: UnoAction[] = [
      { type: 'play', cardId: numberCard.id },
      { type: 'play', cardId: skip.id },
    ]

    expect(chooseUnoAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'play',
      cardId: skip.id,
    })
  })

  it('keeps the most common hand color on hard', () => {
    const blueSkip = card('hand-blue-skip', 'blue', 'skip')
    const redSkip = card('hand-red-skip', 'red', 'skip')
    const redNine = card('hand-red-9', 'red', '9')
    const state = createState({
      hands: [[blueSkip, redSkip, redNine], []],
      discardPile: [card('discard-yellow-skip', 'yellow', 'skip')],
      currentColor: 'yellow',
    })
    const actions: UnoAction[] = [
      { type: 'play', cardId: blueSkip.id },
      { type: 'play', cardId: redSkip.id },
    ]

    expect(chooseUnoAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'play',
      cardId: redSkip.id,
    })
  })

  it('plays wild only when no colored legal card exists on hard', () => {
    const wild = card('hand-wild', 'wild', 'wild')
    const greenTwo = card('hand-green-2', 'green', '2')
    const state = createState({
      hands: [[wild, greenTwo], []],
      currentColor: 'green',
    })
    const actions: UnoAction[] = [
      { type: 'play', cardId: wild.id, chosenColor: 'red' },
      { type: 'play', cardId: wild.id, chosenColor: 'yellow' },
      { type: 'play', cardId: wild.id, chosenColor: 'green' },
      { type: 'play', cardId: wild.id, chosenColor: 'blue' },
      { type: 'play', cardId: greenTwo.id },
    ]

    expect(chooseUnoAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'play',
      cardId: greenTwo.id,
    })
  })

  it('chooses the most common hand color for wild on hard', () => {
    const wild = card('hand-wild', 'wild', 'wild')
    const blueOne = card('hand-blue-1', 'blue', '1')
    const blueThree = card('hand-blue-3', 'blue', '3')
    const yellowFive = card('hand-yellow-5', 'yellow', '5')
    const state = createState({
      hands: [[wild, blueOne, blueThree, yellowFive], []],
      currentColor: 'red',
    })
    const actions: UnoAction[] = [
      { type: 'play', cardId: wild.id, chosenColor: 'red' },
      { type: 'play', cardId: wild.id, chosenColor: 'yellow' },
      { type: 'play', cardId: wild.id, chosenColor: 'green' },
      { type: 'play', cardId: wild.id, chosenColor: 'blue' },
    ]

    expect(chooseUnoAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'play',
      cardId: wild.id,
      chosenColor: 'blue',
    })
  })

  it('defaults to easy and may pick a random legal action', () => {
    const numberCard = card('hand-red-3', 'red', '3')
    const skip = card('hand-red-skip', 'red', 'skip')
    const state = createState({
      hands: [[numberCard, skip], []],
    })
    const actions: UnoAction[] = [
      { type: 'play', cardId: numberCard.id },
      { type: 'play', cardId: skip.id },
    ]

    expect(chooseUnoAction(state, actions, { random: () => 0 })).toEqual({
      type: 'play',
      cardId: numberCard.id,
    })
  })

  it('still uses the heuristic on easy when the blunder roll misses', () => {
    const numberCard = card('hand-red-3', 'red', '3')
    const skip = card('hand-red-skip', 'red', 'skip')
    const state = createState({
      hands: [[numberCard, skip], []],
    })
    const actions: UnoAction[] = [
      { type: 'play', cardId: numberCard.id },
      { type: 'play', cardId: skip.id },
    ]

    expect(chooseUnoAction(state, actions, { random: () => 0.99 })).toEqual({
      type: 'play',
      cardId: skip.id,
    })
  })
})
