import { describe, expect, it } from 'vitest'
import {
  MUEHLE_ADJACENCY,
  MUEHLE_MILLS,
  MUEHLE_POINT_COUNT,
  areAdjacent,
  canRemove,
  countStones,
  formsMill,
  isInMill,
  removableOpponentPoints,
} from '../../app/features/games/muehle/board'

describe('muehle board geometry', () => {
  it('has 24 points and 16 mills', () => {
    expect(MUEHLE_POINT_COUNT).toBe(24)
    expect(MUEHLE_MILLS).toHaveLength(16)
    expect(MUEHLE_ADJACENCY).toHaveLength(24)
  })

  it('connects ring edges and midpoint spokes', () => {
    expect(areAdjacent(0, 1)).toBe(true)
    expect(areAdjacent(0, 2)).toBe(false)
    expect(areAdjacent(1, 9)).toBe(true)
    expect(areAdjacent(9, 17)).toBe(true)
    expect(areAdjacent(0, 8)).toBe(false)
    expect(areAdjacent(3, 11)).toBe(true)
  })

  it('detects a completed mill on a ring side', () => {
    const points: Array<number | null> = Array.from({ length: 24 }, () => null)
    points[0] = 0
    points[1] = 0
    points[2] = 0

    expect(formsMill(points, 1, 0)).toBe(true)
    expect(formsMill(points, 1, 1)).toBe(false)
    expect(isInMill(points, 0)).toBe(true)
  })

  it('detects a spoke mill', () => {
    const points: Array<number | null> = Array.from({ length: 24 }, () => null)
    points[1] = 1
    points[9] = 1
    points[17] = 1

    expect(formsMill(points, 9, 1)).toBe(true)
  })

  it('counts stones per seat', () => {
    const points: Array<number | null> = Array.from({ length: 24 }, () => null)
    points[0] = 0
    points[1] = 0
    points[5] = 1

    expect(countStones(points, 0)).toBe(2)
    expect(countStones(points, 1)).toBe(1)
  })

  it('removes non-mill stones before mill stones', () => {
    const points: Array<number | null> = Array.from({ length: 24 }, () => null)
    points[0] = 1
    points[1] = 1
    points[2] = 1
    points[10] = 1

    expect(removableOpponentPoints(points, 1)).toEqual([10])
    expect(canRemove(points, 10, 1)).toBe(true)
    expect(canRemove(points, 0, 1)).toBe(false)
  })

  it('allows removing mill stones when all opponent stones are in mills', () => {
    const points: Array<number | null> = Array.from({ length: 24 }, () => null)
    points[0] = 1
    points[1] = 1
    points[2] = 1

    expect(removableOpponentPoints(points, 1).sort()).toEqual([0, 1, 2])
    expect(canRemove(points, 0, 1)).toBe(true)
  })
})
