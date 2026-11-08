import { describe, expect, it } from 'vitest'
import { buildPodium, plural, sortStandings } from '../../app/features/games/shared/standings'

describe('standings and podium', () => {
  it('sorts standings in either direction', () => {
    const standings = [
      { seatIndex: 0, score: 3, label: '' },
      { seatIndex: 1, score: 7, label: '' },
    ]
    expect(sortStandings(standings).map((entry) => entry.seatIndex)).toEqual([1, 0])
    expect(sortStandings(standings, false).map((entry) => entry.seatIndex)).toEqual([0, 1])
  })

  it('puts winners first and shares places on equal scores', () => {
    const podium = buildPodium(4, [2], [
      { seatIndex: 2, score: 9, label: '9 Paare' },
      { seatIndex: 0, score: 4, label: '4 Paare' },
      { seatIndex: 3, score: 4, label: '4 Paare' },
      { seatIndex: 1, score: 1, label: '1 Paar' },
    ])
    expect(podium.map((entry) => [entry.seatIndex, entry.place])).toEqual([[2, 1], [0, 2], [3, 2], [1, 4]])
    expect(podium[0]!.label).toBe('9 Paare')
  })

  it('lets several winners share place 1 and falls back to seat order', () => {
    expect(buildPodium(3, [0, 2]).map((entry) => [entry.seatIndex, entry.place])).toEqual([[0, 1], [2, 1], [1, 2]])
  })

  it('pluralises German labels', () => {
    expect(plural(1, 'Paar', 'Paare')).toBe('1 Paar')
    expect(plural(3, 'Paar', 'Paare')).toBe('3 Paare')
  })
})
