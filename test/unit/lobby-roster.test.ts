import { describe, expect, it } from 'vitest'
import {
  addAi,
  removeAt,
  restoreRoster,
  rosterFromSeats,
  toLastLobby,
  toggleProfile,
} from '../../app/features/lobby/roster'
import type { Profile } from '../../app/types/profile'

const mia: Profile = { id: 'mia', name: 'Mia', avatarId: 'fox', wins: {}, createdAt: '' }
const ben: Profile = { id: 'ben', name: 'Ben', avatarId: 'bear', wins: {}, createdAt: '' }

describe('lobby roster', () => {
  it('sits children down in tap order and stands them up again', () => {
    let roster = toggleProfile([], mia, 4)
    roster = toggleProfile(roster, ben, 4)
    expect(roster.map((player) => player.displayName)).toEqual(['Mia', 'Ben'])
    roster = toggleProfile(roster, mia, 4)
    expect(roster.map((player) => player.displayName)).toEqual(['Ben'])
  })

  it('respects the maximum number of players', () => {
    const roster = addAi(toggleProfile([], mia, 2), 2)
    expect(toggleProfile(roster, ben, 2)).toHaveLength(2)
    expect(addAi(roster, 2)).toHaveLength(2)
  })

  it('names robots by their order and renames after removal', () => {
    let roster = addAi(addAi(toggleProfile([], mia, 4), 4), 4)
    expect(roster.map((player) => player.displayName)).toEqual(['Mia', 'Robo-Bär', 'Robo-Fuchs'])
    roster = removeAt(roster, 1)
    expect(roster.map((player) => player.displayName)).toEqual(['Mia', 'Robo-Bär'])
  })

  it('reads players from session seats without empty seats', () => {
    const roster = rosterFromSeats([
      null,
      { seatIndex: 1, type: 'human', profileId: 'mia', displayName: 'Mia', avatarId: 'fox' },
    ])
    expect(roster).toEqual([{ type: 'human', profileId: 'mia', displayName: 'Mia', avatarId: 'fox' }])
  })

  it('restores the last lobby and skips deleted profiles', () => {
    const last = toLastLobby(addAi(toggleProfile(toggleProfile([], mia, 4), ben, 4), 4), { aiDifficulty: 'hard' })
    expect(last.players).toEqual([{ type: 'human', profileId: 'mia' }, { type: 'human', profileId: 'ben' }, { type: 'ai' }])
    const restored = restoreRoster(last, [mia], 4)
    expect(restored.map((player) => player.displayName)).toEqual(['Mia', 'Robo-Bär'])
  })
})
