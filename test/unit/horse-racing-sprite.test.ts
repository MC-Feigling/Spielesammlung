import { describe, expect, it } from 'vitest'
import {
  GALLOP_CYCLE,
  GALLOP_FRAMES_PER_UNIT,
  HORSE_POSES,
  coatForLane,
  gallopPose,
} from '../../app/features/games/horseRacing/sprite'

describe('horse sprite', () => {
  it('stands still when not moving and tucks legs in the air', () => {
    expect(gallopPose(10, 0, false)).toBe('stand')
    expect(gallopPose(10, 0.02, true)).toBe('jump')
  })

  it('cycles through all four gallop phases as the horse advances', () => {
    const step = 1 / GALLOP_FRAMES_PER_UNIT
    const poses = [0, 1, 2, 3, 4].map((frame) => gallopPose(frame * step + 0.01, 0.02, false))
    expect(poses.slice(0, 4)).toEqual([...GALLOP_CYCLE])
    expect(poses[4]).toBe(GALLOP_CYCLE[0])
  })

  it('has every pose with four legs ending near the ground', () => {
    for (const pose of Object.values(HORSE_POSES)) {
      for (const leg of [pose.ff, pose.fn, pose.hf, pose.hn]) {
        expect(leg).toHaveLength(4)
        expect(leg[3][1]).toBeLessThanOrEqual(125)
      }
    }
  })

  it('assigns distinct coats per lane and wraps', () => {
    const coats = [0, 1, 2, 3].map(coatForLane)
    expect(new Set(coats).size).toBe(4)
    expect(coatForLane(4)).toBe(coatForLane(0))
    expect(coatForLane(-1)).toBe(coatForLane(3))
  })
})
