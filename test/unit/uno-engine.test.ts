import { describe, expect, it } from 'vitest'
import {
  createUnoGame,
  createUnoGameFromState,
  isLegalPlay,
  type UnoCard,
  type UnoGameState,
} from '../../app/features/games/uno/engine'

const NUMBER_RANKS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

function card(id: string, color: UnoCard['color'], rank: UnoCard['rank']): UnoCard {
  return { id, color, rank }
}

function baseState(overrides: Partial<UnoGameState> = {}): UnoGameState {
  return {
    playerCount: 2,
    hands: [
      [card('h0', 'red', '5')],
      [card('h1', 'blue', '3')],
    ],
    drawPile: [card('d0', 'yellow', '1'), card('d1', 'green', '2'), card('d2', 'blue', '7')],
    discardPile: [card('top', 'red', '3')],
    currentColor: 'red',
    currentPlayerIndex: 0,
    direction: 1,
    pendingDrawCount: 0,
    pendingDrawKind: null,
    ...overrides,
  }
}

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

describe('uno engine phase 2: legal play', () => {
  const top = card('top', 'red', '5')

  it('allows color match', () => {
    expect(isLegalPlay(card('c', 'red', '9'), top, 'red', 0, null)).toBe(true)
  })

  it('allows rank match', () => {
    expect(isLegalPlay(card('c', 'blue', '5'), top, 'red', 0, null)).toBe(true)
  })

  it('allows wild and wildDrawFour in normal mode', () => {
    expect(isLegalPlay(card('w', 'wild', 'wild'), top, 'red', 0, null)).toBe(true)
    expect(isLegalPlay(card('w4', 'wild', 'wildDrawFour'), top, 'red', 0, null)).toBe(true)
  })

  it('rejects unrelated color and rank', () => {
    expect(isLegalPlay(card('c', 'blue', '9'), top, 'red', 0, null)).toBe(false)
  })

  it('in stack mode only allows stackable cards', () => {
    expect(isLegalPlay(card('c', 'red', '5'), top, 'red', 2, 'drawTwo')).toBe(false)
    expect(isLegalPlay(card('c', 'red', 'drawTwo'), top, 'red', 2, 'drawTwo')).toBe(true)
    expect(isLegalPlay(card('w4', 'wild', 'wildDrawFour'), top, 'red', 2, 'drawTwo')).toBe(true)
    expect(isLegalPlay(card('c', 'red', 'drawTwo'), top, 'red', 4, 'wildDrawFour')).toBe(false)
    expect(isLegalPlay(card('w4', 'wild', 'wildDrawFour'), top, 'red', 4, 'wildDrawFour')).toBe(true)
  })
})

describe('uno engine phase 2: getValidActions', () => {
  it('lists legal plays and omits draw when a play exists', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('a', 'red', '9'), card('b', 'blue', '1')],
        [card('c', 'green', '2')],
      ],
    }))

    const actions = game.getValidActions()
    expect(actions).toContainEqual({ type: 'play', cardId: 'a' })
    expect(actions).not.toContainEqual({ type: 'draw' })
    expect(actions.some((action) => action.type === 'play' && action.cardId === 'b')).toBe(false)
  })

  it('offers only draw when no legal play', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('a', 'blue', '1'), card('b', 'green', '9')],
        [card('c', 'yellow', '2')],
      ],
    }))

    expect(game.getValidActions()).toEqual([{ type: 'draw' }])
  })

  it('in stack mode offers stackable plays and accept-draw', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [
          card('plus2', 'red', 'drawTwo'),
          card('plus4', 'wild', 'wildDrawFour'),
          card('num', 'red', '5'),
        ],
        [card('c', 'blue', '3')],
      ],
      discardPile: [card('top', 'yellow', 'drawTwo')],
      currentColor: 'yellow',
      pendingDrawCount: 2,
      pendingDrawKind: 'drawTwo',
    }))

    const actions = game.getValidActions()
    expect(actions).toContainEqual({ type: 'play', cardId: 'plus2' })
    expect(actions.some((action) => action.type === 'play' && action.cardId === 'plus4')).toBe(true)
    expect(actions).toContainEqual({ type: 'draw' })
    expect(actions.some((action) => action.type === 'play' && action.cardId === 'num')).toBe(false)
  })
})

describe('uno engine phase 2: effects', () => {
  it('skip advances past the next player', () => {
    const game = createUnoGameFromState(baseState({
      playerCount: 4,
      hands: [
        [card('skip', 'red', 'skip'), card('keep', 'blue', '9')],
        [card('a', 'blue', '1')],
        [card('b', 'green', '2')],
        [card('c', 'yellow', '3')],
      ],
      currentPlayerIndex: 0,
    }))

    const result = game.applyAction({ type: 'play', cardId: 'skip' })
    expect(result.state.currentPlayerIndex).toBe(2)
  })

  it('reverse with 4 players flips direction and advances one', () => {
    const game = createUnoGameFromState(baseState({
      playerCount: 4,
      hands: [
        [card('rev', 'red', 'reverse'), card('keep', 'blue', '9')],
        [card('a', 'blue', '1')],
        [card('b', 'green', '2')],
        [card('c', 'yellow', '3')],
      ],
      currentPlayerIndex: 0,
      direction: 1,
    }))

    const result = game.applyAction({ type: 'play', cardId: 'rev' })
    expect(result.state.direction).toBe(-1)
    expect(result.state.currentPlayerIndex).toBe(3)
  })

  it('reverse with 2 players acts as skip (same player again)', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('rev', 'red', 'reverse'), card('keep', 'blue', '1')],
        [card('a', 'green', '2')],
      ],
      currentPlayerIndex: 0,
      direction: 1,
    }))

    const result = game.applyAction({ type: 'play', cardId: 'rev' })
    expect(result.state.direction).toBe(-1)
    expect(result.state.currentPlayerIndex).toBe(0)
  })

  it('wild requires chosenColor and sets currentColor', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('w', 'wild', 'wild'), card('keep', 'yellow', '9')],
        [card('a', 'blue', '1')],
      ],
    }))

    expect(() => game.applyAction({ type: 'play', cardId: 'w' })).toThrow()

    const result = game.applyAction({ type: 'play', cardId: 'w', chosenColor: 'blue' })
    expect(result.state.currentColor).toBe('blue')
    expect(result.state.currentPlayerIndex).toBe(1)
  })
})

describe('uno engine phase 2: stacking', () => {
  it('+2 → +2 → accept draws 4', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('p2a', 'red', 'drawTwo'), card('keep0', 'green', '9')],
        [card('p2b', 'blue', 'drawTwo'), card('keep1', 'green', '8')],
      ],
      drawPile: [
        card('x0', 'yellow', '1'),
        card('x1', 'yellow', '2'),
        card('x2', 'yellow', '3'),
        card('x3', 'yellow', '4'),
        card('x4', 'yellow', '5'),
      ],
      discardPile: [card('top', 'red', '3')],
      currentColor: 'red',
      currentPlayerIndex: 0,
    }))

    game.applyAction({ type: 'play', cardId: 'p2a' })
    let state = game.getState()
    expect(state.pendingDrawCount).toBe(2)
    expect(state.pendingDrawKind).toBe('drawTwo')
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.hands[1]).toHaveLength(2)

    game.applyAction({ type: 'play', cardId: 'p2b' })
    state = game.getState()
    expect(state.pendingDrawCount).toBe(4)
    expect(state.currentPlayerIndex).toBe(0)

    const result = game.applyAction({ type: 'draw' })
    expect(result.state.pendingDrawCount).toBe(0)
    expect(result.state.pendingDrawKind).toBeNull()
    expect(result.state.hands[0]).toHaveLength(5)
    expect(result.state.currentPlayerIndex).toBe(1)
  })

  it('+2 → +4 → accept draws 6', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('p2', 'red', 'drawTwo'), card('keep0', 'green', '9')],
        [card('p4', 'wild', 'wildDrawFour'), card('keep1', 'yellow', '8')],
      ],
      drawPile: Array.from({ length: 8 }, (_, index) => card(`x${index}`, 'yellow', '1')),
      discardPile: [card('top', 'red', '3')],
      currentColor: 'red',
      currentPlayerIndex: 0,
    }))

    game.applyAction({ type: 'play', cardId: 'p2' })
    game.applyAction({ type: 'play', cardId: 'p4', chosenColor: 'green' })

    let state = game.getState()
    expect(state.pendingDrawCount).toBe(6)
    expect(state.pendingDrawKind).toBe('wildDrawFour')
    expect(state.currentColor).toBe('green')
    expect(state.currentPlayerIndex).toBe(0)

    const result = game.applyAction({ type: 'draw' })
    expect(result.state.hands[0]).toHaveLength(7)
    expect(result.state.pendingDrawCount).toBe(0)
  })

  it('+4 pending rejects +2', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('p2', 'red', 'drawTwo'), card('num', 'blue', '1')],
        [card('other', 'green', '2')],
      ],
      discardPile: [card('top', 'wild', 'wildDrawFour')],
      currentColor: 'blue',
      pendingDrawCount: 4,
      pendingDrawKind: 'wildDrawFour',
      currentPlayerIndex: 0,
    }))

    expect(game.getValidActions().some(
      (action) => action.type === 'play' && action.cardId === 'p2',
    )).toBe(false)

    expect(() => game.applyAction({ type: 'play', cardId: 'p2' })).toThrow()
  })
})

describe('uno engine phase 2: draw + recycle + win', () => {
  it('draws one card when no legal play; auto-plays if legal and not wild', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('dead', 'blue', '9')],
        [card('opp', 'green', '1')],
      ],
      drawPile: [card('playable', 'red', '7'), card('extra', 'yellow', '2')],
      discardPile: [card('top', 'red', '3')],
      currentColor: 'red',
    }))

    const result = game.applyAction({ type: 'draw' })
    expect(result.state.hands[0].some((c) => c.id === 'playable')).toBe(false)
    expect(result.state.discardPile.at(-1)?.id).toBe('playable')
    expect(result.state.currentPlayerIndex).toBe(1)
  })

  it('auto-plays drawn wild with chosenColor = currentColor', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('dead', 'blue', '9')],
        [card('opp', 'green', '1')],
      ],
      drawPile: [card('w', 'wild', 'wild'), card('extra', 'yellow', '2')],
      discardPile: [card('top', 'red', '3')],
      currentColor: 'red',
    }))

    const result = game.applyAction({ type: 'draw' })
    expect(result.state.discardPile.at(-1)?.id).toBe('w')
    expect(result.state.currentColor).toBe('red')
    expect(result.state.currentPlayerIndex).toBe(1)
  })

  it('recycles discard (except top) when draw pile is empty', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('dead', 'blue', '9')],
        [card('opp', 'green', '1')],
      ],
      drawPile: [],
      discardPile: [
        card('old1', 'yellow', '1'),
        card('old2', 'green', '2'),
        card('top', 'red', '3'),
      ],
      currentColor: 'red',
    }))

    const result = game.applyAction({ type: 'draw' })
    expect(result.state.discardPile).toHaveLength(1)
    expect(result.state.discardPile[0].id).toBe('top')
    expect(result.state.drawPile.length + result.state.hands[0].length).toBe(3)
  })

  it('wins when hand is emptied', () => {
    const game = createUnoGameFromState(baseState({
      hands: [
        [card('last', 'red', '5')],
        [card('opp', 'blue', '1')],
      ],
      discardPile: [card('top', 'red', '3')],
      currentColor: 'red',
    }))

    const result = game.applyAction({ type: 'play', cardId: 'last' })
    expect(result.winnerSeatIndexes).toEqual([0])
    expect(game.isTerminal()).toBe(true)
    expect(game.getValidActions()).toEqual([])
  })
})
