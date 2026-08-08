import { describe, expect, it } from 'vitest'
import { chooseDragonBossActions } from '../../app/features/games/dragonBoss/ai'
import { createDragonBossGame } from '../../app/features/games/dragonBoss/engine'

describe('dragon boss ai', () => {
  it('returns idle actions outside fighting phase', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'ai' },
      ],
    })

    expect(chooseDragonBossActions(game.state, 1, { random: () => 0.99 })).toEqual({
      moveX: 0,
      moveY: 0,
      shoot: false,
    })
  })

  it('dodges nearby fireballs on hard difficulty', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'ai' },
      ],
    })
    game.state.phase = 'fighting'
    const ai = game.state.players[1]!
    ai.x = 50
    ai.y = 50
    game.state.fireballs = [{
      id: 1,
      x: 55,
      y: 50,
      vx: -0.02,
      vy: 0,
    }]

    const actions = chooseDragonBossActions(game.state, 1, {
      difficulty: 'hard',
      random: () => 0.99,
    })

    expect(actions.moveX).toBe(-1)
  })
})
