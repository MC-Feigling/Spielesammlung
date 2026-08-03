import { describe, expect, it } from 'vitest'
import { isUnoRosterValid } from '../../app/features/games/uno/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('uno lobby roster', () => {
  it('allows 1 human + 1 AI', () => {
    expect(isUnoRosterValid([p(0, 'human'), p(1, 'ai')])).toBe(true)
  })

  it('allows 1 human + 3 AI', () => {
    expect(isUnoRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('rejects 2 humans', () => {
    expect(isUnoRosterValid([p(0, 'human'), p(1, 'human')])).toBe(false)
  })

  it('rejects only AI', () => {
    expect(isUnoRosterValid([p(0, 'ai'), p(1, 'ai')])).toBe(false)
  })

  it('rejects only 1 human', () => {
    expect(isUnoRosterValid([p(0, 'human')])).toBe(false)
  })
})
