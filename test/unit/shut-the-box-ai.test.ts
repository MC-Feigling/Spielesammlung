import { describe, expect, it } from 'vitest'
import { chooseShutTheBoxAction } from '../../app/features/games/shutTheBox/ai'
import type { ShutTheBoxAction, ShutTheBoxGameState, ShutTheBoxPlayerBox } from '../../app/features/games/shutTheBox/engine'

function allOpen(): boolean[] {
  return Array.from({ length: 9 }, () => true)
}

function openMask(closed: number[]): boolean[] {
  const open = allOpen()
  for (const number of closed) {
    open[number - 1] = false
  }
  return open
}

function createBox(overrides: Partial<ShutTheBoxPlayerBox> = {}): ShutTheBoxPlayerBox {
  return {
    open: allOpen(),
    score: null,
    ...overrides,
  }
}

function createState(overrides: Partial<ShutTheBoxGameState> = {}): ShutTheBoxGameState {
  return {
    currentPlayerIndex: 0,
    phase: 'awaitingRoll',
    dice: [],
    boxes: [createBox(), createBox()],
    ...overrides,
  }
}

describe('shut the box AI', () => {
  it('returns null when no actions are available', () => {
    expect(chooseShutTheBoxAction(createState(), [], { difficulty: 'hard' })).toBeNull()
  })

  it('always rolls when awaitingRoll', () => {
    const state = createState({ phase: 'awaitingRoll' })
    const actions: ShutTheBoxAction[] = [{ type: 'roll' }]

    expect(chooseShutTheBoxAction(state, actions, { difficulty: 'hard' })).toEqual({ type: 'roll' })
    expect(chooseShutTheBoxAction(state, actions, { difficulty: 'easy', random: () => 0 })).toEqual({
      type: 'roll',
    })
  })

  it('chooses a perfect-shut close on hard', () => {
    const state = createState({
      phase: 'awaitingClose',
      dice: [3, 3],
      boxes: [
        createBox({ open: openMask([4, 5, 6, 7, 8, 9]) }),
        createBox(),
      ],
    })
    const actions: ShutTheBoxAction[] = [
      { type: 'close', numbers: [1, 2, 3] },
      { type: 'close', numbers: [1, 5] },
      { type: 'close', numbers: [2, 4] },
      { type: 'close', numbers: [6] },
    ]

    expect(chooseShutTheBoxAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'close',
      numbers: [1, 2, 3],
    })
  })

  it('prefers higher-number tiles on hard when comparable', () => {
    const state = createState({
      phase: 'awaitingClose',
      dice: [3, 3],
      boxes: [createBox(), createBox()],
    })
    const actions: ShutTheBoxAction[] = [
      { type: 'close', numbers: [1, 2, 3] },
      { type: 'close', numbers: [6] },
    ]

    expect(chooseShutTheBoxAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'close',
      numbers: [6],
    })
  })

  it('prefers more tiles on hard when the highest number ties', () => {
    const state = createState({
      phase: 'awaitingClose',
      dice: [4, 5],
      boxes: [createBox(), createBox()],
    })
    const actions: ShutTheBoxAction[] = [
      { type: 'close', numbers: [4, 5] },
      { type: 'close', numbers: [1, 3, 5] },
    ]

    expect(chooseShutTheBoxAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'close',
      numbers: [1, 3, 5],
    })
  })

  it('defaults to easy and may pick a random legal close', () => {
    const state = createState({
      phase: 'awaitingClose',
      dice: [3, 3],
      boxes: [createBox(), createBox()],
    })
    const actions: ShutTheBoxAction[] = [
      { type: 'close', numbers: [1, 2, 3] },
      { type: 'close', numbers: [6] },
    ]

    // random() < blunder rate → blunder; then floor(0 * 2) → first action
    expect(chooseShutTheBoxAction(state, actions, { random: () => 0 })).toEqual({
      type: 'close',
      numbers: [1, 2, 3],
    })
  })

  it('still uses the heuristic on easy when the blunder roll misses', () => {
    const state = createState({
      phase: 'awaitingClose',
      dice: [3, 3],
      boxes: [createBox(), createBox()],
    })
    const actions: ShutTheBoxAction[] = [
      { type: 'close', numbers: [1, 2, 3] },
      { type: 'close', numbers: [6] },
    ]

    expect(chooseShutTheBoxAction(state, actions, { random: () => 0.99 })).toEqual({
      type: 'close',
      numbers: [6],
    })
  })
})
