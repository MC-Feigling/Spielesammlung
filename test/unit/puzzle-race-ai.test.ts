import { describe, expect, it } from 'vitest'
import { choosePuzzleRaceSwap } from '../../app/features/games/puzzleRace/ai'

describe('puzzle race AI', () => {
  it('returns null when solved', () => {
    expect(choosePuzzleRaceSwap([0, 1, 2, 3], { difficulty: 'hard' })).toBeNull()
  })

  it('hard prefers a correcting swap', () => {
    const tiles = [1, 0, 2, 3]
    const move = choosePuzzleRaceSwap(tiles, {
      difficulty: 'hard',
      random: () => 0.99,
    })
    expect(move).not.toBeNull()
    const next = [...tiles]
    const temp = next[move!.a]!
    next[move!.a] = next[move!.b]!
    next[move!.b] = temp
    expect(next[0] === 0 || next[1] === 1).toBe(true)
  })

  it('easy can blunder into a random swap', () => {
    const tiles = [1, 0, 2, 3]
    const move = choosePuzzleRaceSwap(tiles, {
      difficulty: 'easy',
      random: () => 0,
    })
    expect(move).not.toBeNull()
    expect(move!.a).not.toBe(move!.b)
  })
})
