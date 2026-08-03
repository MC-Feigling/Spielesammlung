import { describe, expect, it } from 'vitest'
import { chooseConnectFourAction } from '../../app/features/games/connectFour/ai'
import type { ConnectFourAction, ConnectFourGameState } from '../../app/features/games/connectFour/engine'

function emptyColumn(): Array<number | null> {
  return [null, null, null, null, null, null]
}

function createState(overrides: Partial<ConnectFourGameState> = {}): ConnectFourGameState {
  return {
    cells: Array.from({ length: 7 }, () => emptyColumn()),
    currentPlayerIndex: 0,
    lastMove: null,
    ...overrides,
  }
}

function allColumnActions(): ConnectFourAction[] {
  return Array.from({ length: 7 }, (_, column) => ({ type: 'drop' as const, column }))
}

describe('connect four AI', () => {
  it('returns null when no actions are available', () => {
    expect(chooseConnectFourAction(createState(), [], { difficulty: 'hard' })).toBeNull()
  })

  it('takes a winning drop on hard', () => {
    const state = createState({
      cells: [
        [0, null, null, null, null, null],
        [0, null, null, null, null, null],
        [0, null, null, null, null, null],
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
      ],
      currentPlayerIndex: 0,
    })
    const actions = allColumnActions()

    expect(chooseConnectFourAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'drop',
      column: 3,
    })
  })

  it('blocks an opponent immediate win on hard', () => {
    const state = createState({
      cells: [
        [1, null, null, null, null, null],
        [1, null, null, null, null, null],
        [1, null, null, null, null, null],
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
      ],
      currentPlayerIndex: 0,
    })
    const actions = allColumnActions()

    expect(chooseConnectFourAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'drop',
      column: 3,
    })
  })

  it('prefers the center column on hard when no tactics apply', () => {
    const state = createState()
    const actions = allColumnActions()

    expect(chooseConnectFourAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'drop',
      column: 3,
    })
  })

  it('defaults to easy and may pick a random legal action', () => {
    const state = createState({
      cells: [
        [0, null, null, null, null, null],
        [0, null, null, null, null, null],
        [0, null, null, null, null, null],
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
      ],
      currentPlayerIndex: 0,
    })
    const actions = allColumnActions()

    // random() < blunder rate → blunder; then floor(0 * 7) → column 0 (non-winning)
    expect(chooseConnectFourAction(state, actions, { random: () => 0 })).toEqual({
      type: 'drop',
      column: 0,
    })
  })

  it('still uses the heuristic on easy when the blunder roll misses', () => {
    const state = createState({
      cells: [
        [0, null, null, null, null, null],
        [0, null, null, null, null, null],
        [0, null, null, null, null, null],
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
        emptyColumn(),
      ],
      currentPlayerIndex: 0,
    })
    const actions = allColumnActions()

    expect(chooseConnectFourAction(state, actions, { random: () => 0.99 })).toEqual({
      type: 'drop',
      column: 3,
    })
  })
})
