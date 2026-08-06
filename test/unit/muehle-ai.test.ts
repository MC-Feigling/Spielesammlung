import { describe, expect, it } from 'vitest'
import { chooseMuehleAction } from '../../app/features/games/muehle/ai'
import type { MuehleAction, MuehleGameState } from '../../app/features/games/muehle/engine'

function emptyPoints(): Array<number | null> {
  return Array.from({ length: 24 }, () => null)
}

function createState(overrides: Partial<MuehleGameState> = {}): MuehleGameState {
  return {
    points: emptyPoints(),
    stonesToPlace: [9, 9],
    phase: 'placing',
    currentPlayerIndex: 0,
    lastAction: null,
    ...overrides,
  }
}

describe('muehle AI', () => {
  it('returns null when no actions are available', () => {
    expect(chooseMuehleAction(createState(), [], { difficulty: 'hard' })).toBeNull()
  })

  it('closes an own mill on hard while placing', () => {
    const points = emptyPoints()
    points[0] = 0
    points[1] = 0
    const state = createState({ points, stonesToPlace: [7, 9], currentPlayerIndex: 0 })
    const actions: MuehleAction[] = [
      { type: 'place', point: 2 },
      { type: 'place', point: 5 },
      { type: 'place', point: 10 },
    ]

    expect(chooseMuehleAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'place',
      point: 2,
    })
  })

  it('blocks an opponent mill threat on hard', () => {
    const points = emptyPoints()
    points[0] = 1
    points[1] = 1
    const state = createState({ points, stonesToPlace: [8, 7], currentPlayerIndex: 0 })
    const actions: MuehleAction[] = [
      { type: 'place', point: 2 },
      { type: 'place', point: 8 },
      { type: 'place', point: 12 },
    ]

    expect(chooseMuehleAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'place',
      point: 2,
    })
  })

  it('prefers removing a stone that breaks opponent threats', () => {
    const points = emptyPoints()
    points[0] = 1
    points[1] = 1
    points[8] = 1
    const state = createState({
      points,
      phase: 'removing',
      currentPlayerIndex: 0,
      stonesToPlace: [5, 6],
    })
    const actions: MuehleAction[] = [
      { type: 'remove', point: 0 },
      { type: 'remove', point: 8 },
    ]

    expect(chooseMuehleAction(state, actions, { difficulty: 'hard' })).toEqual({
      type: 'remove',
      point: 0,
    })
  })

  it('defaults to easy and may pick a random legal action', () => {
    const points = emptyPoints()
    points[0] = 0
    points[1] = 0
    const state = createState({ points, stonesToPlace: [7, 9] })
    const actions: MuehleAction[] = [
      { type: 'place', point: 2 },
      { type: 'place', point: 5 },
    ]

    const picks = new Set<number>()
    for (let index = 0; index < 40; index += 1) {
      const action = chooseMuehleAction(state, actions, {
        difficulty: 'easy',
        random: () => 0.01,
      })
      if (action?.type === 'place') picks.add(action.point)
    }

    expect(picks.size).toBeGreaterThan(0)
  })
})
