import { describe, expect, it } from 'vitest'
import { isConnectFourRosterValid } from '../../app/features/games/connectFour/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('connect four lobby roster', () => {
  it('allows exactly 2 players', () => {
    expect(isConnectFourRosterValid([p(0, 'human'), p(1, 'ai')])).toBe(true)
    expect(isConnectFourRosterValid([p(0, 'human'), p(1, 'human')])).toBe(true)
    expect(isConnectFourRosterValid([p(0, 'ai'), p(1, 'ai')])).toBe(true)
  })

  it('rejects 1 player', () => {
    expect(isConnectFourRosterValid([p(0, 'human')])).toBe(false)
  })

  it('rejects 3 or more players', () => {
    expect(isConnectFourRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'),
    ])).toBe(false)
    expect(isConnectFourRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(false)
  })

  it('rejects empty roster', () => {
    expect(isConnectFourRosterValid([])).toBe(false)
  })
})
