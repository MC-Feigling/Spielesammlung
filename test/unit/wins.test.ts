import { describe, expect, it } from 'vitest'
import { favoriteFromWins, withWin } from '../../app/features/profiles/wins'
import type { Profile } from '../../app/types/profile'

const base: Profile = {
  id: '1',
  name: 'Mia',
  avatarId: 'fox',
  wins: {},
  createdAt: '2026-01-01',
}

describe('withWin', () => {
  it('increments wins and sets favorite', () => {
    const once = withWin(base, 'memory')
    expect(once.wins.memory).toBe(1)
    const twice = withWin(once, 'memory')
    const kniffel = withWin(twice, 'kniffel')
    expect(kniffel.favoriteGameId).toBe('memory')
    expect(favoriteFromWins({ kniffel: 5, memory: 1 })).toBe('kniffel')
  })
})
