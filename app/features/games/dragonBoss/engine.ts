export const COUNTDOWN_MS = 3000
export const PLAYER_LIVES = 3
export const DRAGON_MAX_HP = 40
export const ARENA_WIDTH = 100
export const ARENA_HEIGHT = 70
export const PLAYER_RADIUS = 2.2
export const DRAGON_RADIUS = 6
export const PROJECTILE_RADIUS = 1.2
export const FIREBALL_RADIUS = 2
export const PLAYER_SPEED = 0.028 // units per ms
export const PROJECTILE_SPEED = 0.055
export const FIREBALL_SPEED = 0.032
export const PLAYER_FIRE_COOLDOWN_MS = 380
export const INVULN_MS = 1400
export const DRAGON_MOVE_SPEED = 0.012
export const DRAGON_FIRE_INTERVAL_START_MS = 1600
export const DRAGON_FIRE_INTERVAL_END_MS = 700
export const DRAGON_SWEEP_INTERVAL_MS = 5200
export const SWEEP_DURATION_MS = 900
export const SWEEP_HALF_WIDTH = 4

export type DragonBossPhase = 'countdown' | 'fighting' | 'finished'

export interface DragonBossPlayerConfig {
  seatIndex: number
  type: 'human' | 'ai'
}

export interface DragonBossPlayer {
  seatIndex: number
  type: 'human' | 'ai'
  x: number
  y: number
  lives: number
  hits: number
  invulnMs: number
  fireCooldownMs: number
  moveX: -1 | 0 | 1
  moveY: -1 | 0 | 1
  alive: boolean
}

export interface DragonBossDragon {
  x: number
  y: number
  hp: number
  maxHp: number
  vx: number
  fireCooldownMs: number
  sweepCooldownMs: number
  sweepMs: number
  sweepY: number
}

export interface DragonBossProjectile {
  id: number
  ownerSeatIndex: number
  x: number
  y: number
  vx: number
  vy: number
}

export interface DragonBossFireball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
}

export interface DragonBossState {
  phase: DragonBossPhase
  countdownMs: number
  elapsedMs: number
  players: DragonBossPlayer[]
  dragon: DragonBossDragon
  projectiles: DragonBossProjectile[]
  fireballs: DragonBossFireball[]
  nextProjectileId: number
  nextFireballId: number
}

export interface DragonBossGame {
  state: DragonBossState
  tick: (dtMs: number) => void
  setMove: (seatIndex: number, moveX: -1 | 0 | 1, moveY: -1 | 0 | 1) => void
  shoot: (seatIndex: number) => void
  getWinnerSeatIndexes: () => number[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return Math.hypot(dx, dy)
}

function livingPlayers(state: DragonBossState): DragonBossPlayer[] {
  return state.players.filter((player) => player.alive)
}

function dragonDifficulty(state: DragonBossState): number {
  const lost = state.dragon.maxHp - state.dragon.hp
  return clamp(lost / state.dragon.maxHp, 0, 1)
}

function dragonFireIntervalMs(difficulty: number): number {
  return Math.round(
    DRAGON_FIRE_INTERVAL_START_MS
    + (DRAGON_FIRE_INTERVAL_END_MS - DRAGON_FIRE_INTERVAL_START_MS) * difficulty,
  )
}

function spawnPlayer(
  config: DragonBossPlayerConfig,
  index: number,
  total: number,
): DragonBossPlayer {
  const spacing = ARENA_WIDTH / (total + 1)
  return {
    seatIndex: config.seatIndex,
    type: config.type,
    x: spacing * (index + 1),
    y: ARENA_HEIGHT - 8,
    lives: PLAYER_LIVES,
    hits: 0,
    invulnMs: 0,
    fireCooldownMs: 0,
    moveX: 0,
    moveY: 0,
    alive: true,
  }
}

function damagePlayer(player: DragonBossPlayer): void {
  if (!player.alive || player.invulnMs > 0) return
  player.lives -= 1
  player.invulnMs = INVULN_MS
  if (player.lives <= 0) {
    player.lives = 0
    player.alive = false
    player.moveX = 0
    player.moveY = 0
  }
}

function finishIfNeeded(state: DragonBossState): void {
  if (state.phase !== 'fighting') return
  if (state.dragon.hp <= 0 || livingPlayers(state).length === 0) {
    state.phase = 'finished'
    state.projectiles = []
    state.fireballs = []
    state.dragon.sweepMs = 0
  }
}

export function createDragonBossGame(config: {
  players: DragonBossPlayerConfig[]
}): DragonBossGame {
  const players = config.players.map((player, index) =>
    spawnPlayer(player, index, config.players.length),
  )

  const state: DragonBossState = {
    phase: 'countdown',
    countdownMs: COUNTDOWN_MS,
    elapsedMs: 0,
    players,
    dragon: {
      x: ARENA_WIDTH / 2,
      y: 14,
      hp: DRAGON_MAX_HP,
      maxHp: DRAGON_MAX_HP,
      vx: DRAGON_MOVE_SPEED,
      fireCooldownMs: 900,
      sweepCooldownMs: DRAGON_SWEEP_INTERVAL_MS,
      sweepMs: 0,
      sweepY: 20,
    },
    projectiles: [],
    fireballs: [],
    nextProjectileId: 1,
    nextFireballId: 1,
  }

  function setMove(seatIndex: number, moveX: -1 | 0 | 1, moveY: -1 | 0 | 1): void {
    if (state.phase !== 'fighting') return
    const player = state.players.find((entry) => entry.seatIndex === seatIndex)
    if (!player || !player.alive) return
    player.moveX = moveX
    player.moveY = moveY
  }

  function shoot(seatIndex: number): void {
    if (state.phase !== 'fighting') return
    const player = state.players.find((entry) => entry.seatIndex === seatIndex)
    if (!player || !player.alive || player.fireCooldownMs > 0) return

    player.fireCooldownMs = PLAYER_FIRE_COOLDOWN_MS
    state.projectiles.push({
      id: state.nextProjectileId,
      ownerSeatIndex: seatIndex,
      x: player.x,
      y: player.y - PLAYER_RADIUS,
      vx: 0,
      vy: -PROJECTILE_SPEED,
    })
    state.nextProjectileId += 1
  }

  function spawnFireballToward(target: DragonBossPlayer): void {
    const dx = target.x - state.dragon.x
    const dy = target.y - state.dragon.y
    const len = Math.hypot(dx, dy) || 1
    state.fireballs.push({
      id: state.nextFireballId,
      x: state.dragon.x,
      y: state.dragon.y + DRAGON_RADIUS * 0.4,
      vx: (dx / len) * FIREBALL_SPEED,
      vy: (dy / len) * FIREBALL_SPEED,
    })
    state.nextFireballId += 1
  }

  function tickDragon(dtMs: number): void {
    const dragon = state.dragon
    const difficulty = dragonDifficulty(state)

    if (dragon.sweepMs > 0) {
      dragon.sweepMs = Math.max(0, dragon.sweepMs - dtMs)
      dragon.sweepY += (ARENA_HEIGHT / SWEEP_DURATION_MS) * dtMs
      for (const player of livingPlayers(state)) {
        if (Math.abs(player.y - dragon.sweepY) <= SWEEP_HALF_WIDTH) {
          damagePlayer(player)
        }
      }
    }
    else {
      dragon.x += dragon.vx * dtMs
      if (dragon.x <= DRAGON_RADIUS + 4) {
        dragon.x = DRAGON_RADIUS + 4
        dragon.vx = Math.abs(dragon.vx)
      }
      else if (dragon.x >= ARENA_WIDTH - DRAGON_RADIUS - 4) {
        dragon.x = ARENA_WIDTH - DRAGON_RADIUS - 4
        dragon.vx = -Math.abs(dragon.vx)
      }

      dragon.fireCooldownMs = Math.max(0, dragon.fireCooldownMs - dtMs)
      dragon.sweepCooldownMs = Math.max(0, dragon.sweepCooldownMs - dtMs)

      if (dragon.fireCooldownMs <= 0) {
        const targets = livingPlayers(state)
        if (targets.length > 0) {
          const target = targets.reduce((best, player) =>
            distance(dragon.x, dragon.y, player.x, player.y)
            < distance(dragon.x, dragon.y, best.x, best.y)
              ? player
              : best)
          spawnFireballToward(target)
          dragon.fireCooldownMs = dragonFireIntervalMs(difficulty)
        }
      }

      if (dragon.sweepCooldownMs <= 0 && livingPlayers(state).length > 0) {
        dragon.sweepMs = SWEEP_DURATION_MS
        dragon.sweepY = dragon.y + DRAGON_RADIUS
        dragon.sweepCooldownMs = DRAGON_SWEEP_INTERVAL_MS
      }
    }

    for (const player of livingPlayers(state)) {
      if (distance(player.x, player.y, dragon.x, dragon.y) < PLAYER_RADIUS + DRAGON_RADIUS * 0.75) {
        damagePlayer(player)
      }
    }
  }

  function tick(dtMs: number): void {
    if (state.phase === 'finished') return

    if (state.phase === 'countdown') {
      state.countdownMs = Math.max(0, state.countdownMs - dtMs)
      if (state.countdownMs === 0) {
        state.phase = 'fighting'
      }
      return
    }

    state.elapsedMs += dtMs

    for (const player of state.players) {
      if (!player.alive) continue
      player.invulnMs = Math.max(0, player.invulnMs - dtMs)
      player.fireCooldownMs = Math.max(0, player.fireCooldownMs - dtMs)

      const moveLen = Math.hypot(player.moveX, player.moveY)
      if (moveLen > 0) {
        const nx = player.moveX / moveLen
        const ny = player.moveY / moveLen
        player.x = clamp(
          player.x + nx * PLAYER_SPEED * dtMs,
          PLAYER_RADIUS,
          ARENA_WIDTH - PLAYER_RADIUS,
        )
        player.y = clamp(
          player.y + ny * PLAYER_SPEED * dtMs,
          PLAYER_RADIUS + 10,
          ARENA_HEIGHT - PLAYER_RADIUS,
        )
      }
    }

    tickDragon(dtMs)

    const nextProjectiles: DragonBossProjectile[] = []
    for (const projectile of state.projectiles) {
      projectile.x += projectile.vx * dtMs
      projectile.y += projectile.vy * dtMs

      if (
        projectile.x < -5
        || projectile.x > ARENA_WIDTH + 5
        || projectile.y < -5
        || projectile.y > ARENA_HEIGHT + 5
      ) {
        continue
      }

      if (
        state.dragon.hp > 0
        && distance(projectile.x, projectile.y, state.dragon.x, state.dragon.y)
          < PROJECTILE_RADIUS + DRAGON_RADIUS
      ) {
        state.dragon.hp = Math.max(0, state.dragon.hp - 1)
        const owner = state.players.find((entry) => entry.seatIndex === projectile.ownerSeatIndex)
        if (owner) owner.hits += 1
        continue
      }

      nextProjectiles.push(projectile)
    }
    state.projectiles = nextProjectiles

    const nextFireballs: DragonBossFireball[] = []
    for (const fireball of state.fireballs) {
      fireball.x += fireball.vx * dtMs
      fireball.y += fireball.vy * dtMs

      if (
        fireball.x < -8
        || fireball.x > ARENA_WIDTH + 8
        || fireball.y < -8
        || fireball.y > ARENA_HEIGHT + 8
      ) {
        continue
      }

      let hit = false
      for (const player of livingPlayers(state)) {
        if (distance(fireball.x, fireball.y, player.x, player.y) < FIREBALL_RADIUS + PLAYER_RADIUS) {
          damagePlayer(player)
          hit = true
          break
        }
      }
      if (!hit) nextFireballs.push(fireball)
    }
    state.fireballs = nextFireballs

    finishIfNeeded(state)
  }

  function getWinnerSeatIndexes(): number[] {
    if (state.phase !== 'finished') return []
    const maxHits = Math.max(...state.players.map((player) => player.hits))
    if (maxHits <= 0) {
      return state.players.map((player) => player.seatIndex)
    }
    return state.players
      .filter((player) => player.hits === maxHits)
      .map((player) => player.seatIndex)
  }

  return {
    state,
    tick,
    setMove,
    shoot,
    getWinnerSeatIndexes,
  }
}
