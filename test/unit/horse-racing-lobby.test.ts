import { describe, expect, it } from 'vitest'
import { isHorseRacingRosterValid } from '../../app/features/games/horseRacing/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('horse racing lobby roster', () => {
  it('allows 1 human + 1 AI', () => {
    expect(isHorseRacingRosterValid([p(0, 'human'), p(1, 'ai')])).toBe(true)
  })

  it('allows 1 human + 3 AI', () => {
    expect(isHorseRacingRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('allows 2 humans + 0 AI', () => {
    expect(isHorseRacingRosterValid([p(0, 'human'), p(1, 'human')])).toBe(true)
  })

  it('allows 2 humans + 2 AI', () => {
    expect(isHorseRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('rejects 0 humans', () => {
    expect(isHorseRacingRosterValid([p(0, 'ai'), p(1, 'ai')])).toBe(false)
  })

  it('rejects 3 humans', () => {
    expect(isHorseRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'human'),
    ])).toBe(false)
  })

  it('rejects fewer than 2 players', () => {
    expect(isHorseRacingRosterValid([p(0, 'human')])).toBe(false)
  })
})
