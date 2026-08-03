import { describe, expect, it } from 'vitest'
import { isRacingRosterValid } from '../../app/features/games/racing/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('racing lobby roster', () => {
  it('allows 2 humans', () => {
    expect(isRacingRosterValid([p(0, 'human'), p(1, 'human')])).toBe(true)
  })

  it('allows 2 humans + 2 AI', () => {
    expect(isRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('rejects 3 humans', () => {
    expect(isRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'human'),
    ])).toBe(false)
  })

  it('rejects 3 AI', () => {
    expect(isRacingRosterValid([
      p(0, 'ai'), p(1, 'ai'), p(2, 'ai'),
    ])).toBe(false)
  })

  it('rejects fewer than 2 players', () => {
    expect(isRacingRosterValid([p(0, 'human')])).toBe(false)
  })
})
