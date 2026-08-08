import { describe, expect, it } from 'vitest'
import { isDragonBossRosterValid } from '../../app/features/games/dragonBoss/lobby'

describe('dragon boss lobby', () => {
  it('requires exactly two seats with 1–2 humans', () => {
    expect(isDragonBossRosterValid([
      { type: 'human' },
      { type: 'human' },
    ])).toBe(true)

    expect(isDragonBossRosterValid([
      { type: 'human' },
      { type: 'ai' },
    ])).toBe(true)

    expect(isDragonBossRosterValid([
      { type: 'ai' },
      { type: 'ai' },
    ])).toBe(false)

    expect(isDragonBossRosterValid([
      { type: 'human' },
    ])).toBe(false)

    expect(isDragonBossRosterValid([
      { type: 'human' },
      { type: 'human' },
      { type: 'ai' },
    ])).toBe(false)
  })
})
