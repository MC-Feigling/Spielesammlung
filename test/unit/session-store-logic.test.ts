import { describe, expect, it } from 'vitest'
import { canBeginSession, isValidSessionPlayer } from '../../app/stores/session'

describe('session lobby validation', () => {
  it('requires a profile for human players', () => {
    expect(isValidSessionPlayer({
      seatIndex: 0,
      type: 'human',
      displayName: 'Mia',
      avatarId: 'fox',
    })).toBe(false)

    expect(isValidSessionPlayer({
      seatIndex: 0,
      type: 'human',
      profileId: 'mia',
      displayName: 'Mia',
      avatarId: 'fox',
    })).toBe(true)
  })

  it('starts only with at least two valid players', () => {
    const aiPlayer = {
      seatIndex: 1,
      type: 'ai' as const,
      displayName: 'Robo-Bär',
      avatarId: 'bear',
    }

    expect(canBeginSession([
      {
        seatIndex: 0,
        type: 'human',
        profileId: 'mia',
        displayName: 'Mia',
        avatarId: 'fox',
      },
      null,
    ])).toBe(false)

    expect(canBeginSession([
      {
        seatIndex: 0,
        type: 'human',
        profileId: 'mia',
        displayName: 'Mia',
        avatarId: 'fox',
      },
      aiPlayer,
    ])).toBe(true)
  })

  it('never starts with robots only', () => {
    const robot = (seatIndex: number) => ({
      seatIndex,
      type: 'ai' as const,
      displayName: `Robo ${seatIndex}`,
      avatarId: 'bear',
    })

    expect(canBeginSession([robot(0), robot(1)])).toBe(false)
    expect(canBeginSession([robot(0), robot(1), robot(2), robot(3)])).toBe(false)
  })
})
