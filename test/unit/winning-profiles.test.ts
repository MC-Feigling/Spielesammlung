import { describe, expect, it } from 'vitest'
import { humanWinnerProfileIds } from '../../app/features/profiles/winning-profiles'
import type { SessionPlayer } from '../../app/types/game'

const players: SessionPlayer[] = [
  { seatIndex: 0, type: 'human', profileId: 'mia', displayName: 'Mia', avatarId: 'fox' },
  { seatIndex: 1, type: 'ai', displayName: 'Robo-Bär', avatarId: 'bear' },
  { seatIndex: 2, type: 'human', profileId: 'noah', displayName: 'Noah', avatarId: 'owl' },
]

describe('humanWinnerProfileIds', () => {
  it('returns only profiled human winners', () => {
    expect(humanWinnerProfileIds(players, [0, 1, 2])).toEqual(['mia', 'noah'])
  })

  it('ignores missing seats and duplicate winner indexes', () => {
    expect(humanWinnerProfileIds(players, [0, 0, 3])).toEqual(['mia'])
  })
})
