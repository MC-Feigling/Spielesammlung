import { describe, expect, it } from 'vitest'
import { GAMES, gameTitle, isGameId } from '../../app/constants/games'

describe('games registry', () => {
  it('has unique ids and every id passes isGameId', () => {
    const ids = GAMES.map((game) => game.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(isGameId(id)).toBe(true)
  })

  it('rejects unknown ids', () => {
    expect(isGameId('nope')).toBe(false)
    expect(isGameId('')).toBe(false)
  })

  it('resolves titles from the registry', () => {
    expect(gameTitle('ludo')).toBe('Mensch ärgere dich nicht')
    expect(gameTitle('handyman')).toBe('Handwerker')
    expect(gameTitle(null)).toBe('Spielrunde')
  })
})
