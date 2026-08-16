import { describe, expect, it } from 'vitest'
import { isHandymanRosterValid } from '../../app/features/games/handyman/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('handyman lobby roster', () => {
  it('allows 1 human + 1 AI', () => {
    expect(isHandymanRosterValid([p(0, 'human'), p(1, 'ai')])).toBe(true)
  })

  it('allows 1 human + 3 AI', () => {
    expect(isHandymanRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('rejects 2 humans', () => {
    expect(isHandymanRosterValid([p(0, 'human'), p(1, 'human')])).toBe(false)
  })

  it('rejects only AI', () => {
    expect(isHandymanRosterValid([p(0, 'ai'), p(1, 'ai')])).toBe(false)
  })

  it('rejects only 1 human', () => {
    expect(isHandymanRosterValid([p(0, 'human')])).toBe(false)
  })

  it('rejects length outside 2–4', () => {
    expect(isHandymanRosterValid([])).toBe(false)
    expect(isHandymanRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'), p(3, 'ai'), p(4, 'ai'),
    ])).toBe(false)
  })
})
