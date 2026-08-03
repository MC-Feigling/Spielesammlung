import { describe, expect, it } from 'vitest'
import { legalCloses, openNumbers, remainingSum } from '../../app/features/games/shutTheBox/combos'

function allOpen(): boolean[] {
  return Array.from({ length: 9 }, () => true)
}

describe('shut the box combos', () => {
  it('lists open numbers from the open mask', () => {
    const open = allOpen()
    open[0] = false
    open[8] = false

    expect(openNumbers(open)).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it('sums remaining open numbers', () => {
    expect(remainingSum(allOpen())).toBe(45)

    const open = allOpen()
    open[1] = false
    open[5] = false
    expect(remainingSum(open)).toBe(45 - 2 - 6)
  })

  it('finds all legal closes for target 6 with all tiles open', () => {
    const closes = legalCloses(allOpen(), 6)

    expect(closes).toEqual(
      expect.arrayContaining([
        [6],
        [1, 5],
        [2, 4],
        [1, 2, 3],
      ]),
    )
    expect(closes).toHaveLength(4)
    expect(closes.every((combo) => [...combo].sort((a, b) => a - b).every((n, i) => n === combo[i]))).toBe(true)
  })

  it('returns empty when no subset sums to the target', () => {
    const open = Array.from({ length: 9 }, () => false)
    open[8] = true

    expect(legalCloses(open, 6)).toEqual([])
  })

  it('ignores closed tiles when enumerating closes', () => {
    const open = allOpen()
    open[5] = false

    const closes = legalCloses(open, 6)

    expect(closes).not.toContainEqual([6])
    expect(closes).toEqual(
      expect.arrayContaining([
        [1, 5],
        [2, 4],
        [1, 2, 3],
      ]),
    )
    expect(closes).toHaveLength(3)
  })
})
