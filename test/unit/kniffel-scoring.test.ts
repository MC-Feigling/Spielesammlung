import { describe, expect, it } from 'vitest'
import { scoreCategory } from '../../app/features/games/kniffel/scoring'

describe('kniffel scoring', () => {
  it('scores kniffel as 60', () => {
    expect(scoreCategory('kniffel', [6, 6, 6, 6, 6])).toBe(60)
    expect(scoreCategory('kniffel', [6, 6, 6, 6, 5])).toBe(0)
  })

  it('scores manyPips at 25 or more', () => {
    expect(scoreCategory('manyPips', [6, 6, 6, 6, 1])).toBe(40)
    expect(scoreCategory('manyPips', [6, 6, 6, 5, 1])).toBe(0)
  })

  it('scores fewPips at 10 or fewer', () => {
    expect(scoreCategory('fewPips', [1, 1, 1, 1, 1])).toBe(40)
    expect(scoreCategory('fewPips', [2, 2, 2, 2, 2])).toBe(40)
    expect(scoreCategory('fewPips', [3, 2, 2, 2, 2])).toBe(0)
  })

  it('scores chance as the dice sum', () => {
    expect(scoreCategory('chance', [1, 2, 3, 4, 5])).toBe(15)
  })

  it('scores classic German Kniffel categories', () => {
    expect(scoreCategory('ones', [1, 1, 2, 3, 4])).toBe(2)
    expect(scoreCategory('threeOfKind', [3, 3, 3, 4, 5])).toBe(18)
    expect(scoreCategory('fourOfKind', [2, 2, 2, 2, 5])).toBe(13)
    expect(scoreCategory('fullHouse', [2, 2, 3, 3, 3])).toBe(25)
    expect(scoreCategory('smallStraight', [1, 2, 3, 4, 6])).toBe(30)
    expect(scoreCategory('largeStraight', [2, 3, 4, 5, 6])).toBe(40)
  })

  it('returns zero for unqualified categories', () => {
    expect(scoreCategory('threeOfKind', [1, 1, 2, 3, 4])).toBe(0)
    expect(scoreCategory('fullHouse', [2, 2, 2, 2, 3])).toBe(0)
    expect(scoreCategory('smallStraight', [1, 2, 2, 4, 6])).toBe(0)
    expect(scoreCategory('largeStraight', [1, 2, 3, 4, 6])).toBe(0)
  })

  it('rejects non-dice rolls', () => {
    expect(() => scoreCategory('chance', [1, 2, 3, 4] as never)).toThrow('fünf Würfel')
    expect(() => scoreCategory('chance', [1, 2, 3, 4, 7] as never)).toThrow('ungültige Augenzahlen')
  })
})
