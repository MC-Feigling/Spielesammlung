import { describe, expect, it } from 'vitest'
import { formatPlayerRange, GAMES } from '../../app/constants/games'

describe('formatPlayerRange', () => {
  it('shows a single count when min and max match', () => {
    expect(formatPlayerRange(2, 2)).toBe('2 Spieler')
  })

  it('shows a range when min and max differ', () => {
    expect(formatPlayerRange(2, 4)).toBe('2–4 Spieler')
  })

  it('labels fixed two-player games without a duplicate range', () => {
    const fixedTwoPlayerGames = GAMES.filter((game) => game.minPlayers === game.maxPlayers)

    expect(fixedTwoPlayerGames.map((game) => game.id)).toEqual(['connectFour', 'muehle'])
    for (const game of fixedTwoPlayerGames) {
      expect(formatPlayerRange(game.minPlayers, game.maxPlayers)).toBe('2 Spieler')
    }
  })
})
