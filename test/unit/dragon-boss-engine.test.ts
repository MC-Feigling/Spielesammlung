import { describe, expect, it } from 'vitest'
import {
  COUNTDOWN_MS,
  DRAGON_MAX_HP,
  PLAYER_FIRE_COOLDOWN_MS,
  PLAYER_LIVES,
  createDragonBossGame,
} from '../../app/features/games/dragonBoss/engine'

describe('dragon boss engine', () => {
  it('starts in countdown with full lives and dragon hp', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })

    expect(game.state.phase).toBe('countdown')
    expect(game.state.countdownMs).toBe(COUNTDOWN_MS)
    expect(game.state.dragon.hp).toBe(DRAGON_MAX_HP)
    expect(game.state.players).toHaveLength(2)
    expect(game.state.players.every((player) => player.lives === PLAYER_LIVES)).toBe(true)
  })

  it('ignores move and shoot during countdown', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    const startX = game.state.players[0]!.x
    game.setMove(0, 1, 0)
    game.shoot(0)
    game.tick(16)
    expect(game.state.players[0]!.x).toBe(startX)
    expect(game.state.projectiles).toHaveLength(0)
  })

  it('moves player and fires projectile while fighting', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'fighting'
    game.state.countdownMs = 0
    const player = game.state.players[0]!
    const startX = player.x
    game.setMove(0, 1, 0)
    game.tick(100)
    expect(player.x).toBeGreaterThan(startX)

    game.shoot(0)
    expect(game.state.projectiles).toHaveLength(1)
    expect(player.fireCooldownMs).toBe(PLAYER_FIRE_COOLDOWN_MS)
  })

  it('damages dragon and counts hits on projectile collision', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'fighting'
    game.state.dragon.x = 50
    game.state.dragon.y = 20
    game.state.projectiles = [{
      id: 1,
      ownerSeatIndex: 0,
      x: 50,
      y: 20,
      vx: 0,
      vy: 0,
    }]

    game.tick(16)
    expect(game.state.dragon.hp).toBe(DRAGON_MAX_HP - 1)
    expect(game.state.players[0]!.hits).toBe(1)
    expect(game.state.projectiles).toHaveLength(0)
  })

  it('applies invulnerability after player hit', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'fighting'
    const player = game.state.players[0]!
    player.x = 40
    player.y = 40
    game.state.fireballs = [{
      id: 1,
      x: 40,
      y: 40,
      vx: 0,
      vy: 0,
    }]

    game.tick(16)
    expect(player.lives).toBe(PLAYER_LIVES - 1)
    expect(player.invulnMs).toBeGreaterThan(0)

    game.state.fireballs = [{
      id: 2,
      x: 40,
      y: 40,
      vx: 0,
      vy: 0,
    }]
    game.tick(16)
    expect(player.lives).toBe(PLAYER_LIVES - 1)
  })

  it('finishes when dragon hp reaches zero and awards hit leader', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'fighting'
    game.state.players[0]!.hits = 12
    game.state.players[1]!.hits = 7
    game.state.dragon.hp = 1
    game.state.projectiles = [{
      id: 9,
      ownerSeatIndex: 1,
      x: game.state.dragon.x,
      y: game.state.dragon.y,
      vx: 0,
      vy: 0,
    }]

    game.tick(16)
    expect(game.state.phase).toBe('finished')
    expect(game.state.dragon.hp).toBe(0)
    expect(game.getWinnerSeatIndexes()).toEqual([0])
  })

  it('finishes when all players are down and ties share win', () => {
    const game = createDragonBossGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'fighting'
    game.state.players[0]!.lives = 0
    game.state.players[0]!.alive = false
    game.state.players[0]!.hits = 5
    game.state.players[1]!.lives = 0
    game.state.players[1]!.alive = false
    game.state.players[1]!.hits = 5

    game.tick(16)
    expect(game.state.phase).toBe('finished')
    expect(game.getWinnerSeatIndexes()).toEqual([0, 1])
  })
})
