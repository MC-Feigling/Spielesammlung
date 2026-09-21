import { describe, expect, it } from 'vitest'
import { assignFinishedHomeSteps, isOffTrack } from '../../app/features/games/ludo/board'

describe('ludo board helpers', () => {
  it('treats yard and finished home pieces as off the track', () => {
    expect(isOffTrack({ progress: -1 })).toBe(true)
    expect(isOffTrack({ progress: 43 })).toBe(true)
    expect(isOffTrack({ progress: 42 })).toBe(false)
    expect(isOffTrack({ progress: 0 })).toBe(false)
  })

  it('spreads finished home pieces across free home cells from the center', () => {
    const assignment = assignFinishedHomeSteps([
      { progress: 43 },
      { progress: 43 },
      { progress: 41 },
      { progress: -1 },
    ])

    expect(assignment.get(0)).toBe(3)
    expect(assignment.get(1)).toBe(2)
    expect(assignment.has(2)).toBe(false)
    expect(assignment.has(3)).toBe(false)
  })

  it('fills all four home cells when every piece is finished', () => {
    const assignment = assignFinishedHomeSteps([
      { progress: 43 },
      { progress: 43 },
      { progress: 43 },
      { progress: 43 },
    ])

    expect([...assignment.values()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })
})
