import { describe, expect, it } from 'vitest'
import { isMuehleRosterValid } from '../../app/features/games/muehle/lobby'

describe('muehle lobby', () => {
  it('requires exactly two filled seats', () => {
    expect(isMuehleRosterValid([{ type: 'human' }, { type: 'ai' }])).toBe(true)
    expect(isMuehleRosterValid([{ type: 'human' }])).toBe(false)
    expect(isMuehleRosterValid([
      { type: 'human' },
      { type: 'ai' },
      { type: 'ai' },
    ])).toBe(false)
  })
})
