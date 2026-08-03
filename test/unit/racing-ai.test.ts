import { describe, expect, it } from 'vitest'
import { chooseRacingLaneDelta } from '../../app/features/games/racing/ai'
import { createRacingGame } from '../../app/features/games/racing/engine'

describe('racing AI', () => {
  it('returns null when lane is clear ahead', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.cars[0]!.lane = 1
    game.state.cars[0]!.progress = 5
    game.state.obstacles = [{ id: 1, lane: 0, progress: 20 }]
    expect(chooseRacingLaneDelta(game.state, 0)).toBeNull()
  })

  it('changes lane when obstacle is on same lane ahead', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.cars[0]!.lane = 1
    game.state.cars[0]!.progress = 5
    game.state.obstacles = [{ id: 1, lane: 1, progress: 15 }]
    const delta = chooseRacingLaneDelta(game.state, 0)
    expect(delta === -1 || delta === 1).toBe(true)
  })
})
