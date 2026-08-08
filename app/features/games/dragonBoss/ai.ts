import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from '../shared/ai'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type DragonBossState,
} from './engine'

export interface DragonBossAiActions {
  moveX: -1 | 0 | 1
  moveY: -1 | 0 | 1
  shoot: boolean
}

export interface DragonBossAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

const EASY_BLUNDER_PROB = 0.4
const MEDIUM_BLUNDER_PROB = 0.18

function blunderProb(difficulty: AiDifficulty): number {
  if (difficulty === 'easy') return EASY_BLUNDER_PROB
  if (difficulty === 'medium') return MEDIUM_BLUNDER_PROB
  return 0
}

function sign(value: number): -1 | 0 | 1 {
  if (value > 0.8) return 1
  if (value < -0.8) return -1
  return 0
}

export function chooseDragonBossActions(
  state: DragonBossState,
  seatIndex: number,
  options: DragonBossAiOptions = {},
): DragonBossAiActions {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  const player = state.players.find((entry) => entry.seatIndex === seatIndex)
  if (!player || !player.alive || state.phase !== 'fighting') {
    return { moveX: 0, moveY: 0, shoot: false }
  }

  if (random() < blunderProb(difficulty)) {
    return {
      moveX: sign(random() - 0.5),
      moveY: sign(random() - 0.5),
      shoot: random() > 0.55,
    }
  }

  let moveX: -1 | 0 | 1 = 0
  let moveY: -1 | 0 | 1 = 0

  const nearestFireball = state.fireballs
    .map((fireball) => ({
      fireball,
      dist: Math.hypot(fireball.x - player.x, fireball.y - player.y),
    }))
    .sort((a, b) => a.dist - b.dist)[0]

  if (nearestFireball && nearestFireball.dist < 18) {
    const fx = nearestFireball.fireball.x - player.x
    moveX = sign(-fx)
    moveY = player.y < ARENA_HEIGHT - 12 ? 1 : -1
  }
  else if (state.dragon.sweepMs > 0 && Math.abs(player.y - state.dragon.sweepY) < 12) {
    moveY = player.y > state.dragon.sweepY ? 1 : -1
  }
  else {
    moveX = sign(state.dragon.x - player.x)
    const preferredY = ARENA_HEIGHT * 0.62
    moveY = sign(preferredY - player.y)
  }

  if (player.x < 8) moveX = 1
  if (player.x > ARENA_WIDTH - 8) moveX = -1
  if (player.y < 16) moveY = 1
  if (player.y > ARENA_HEIGHT - 6) moveY = -1

  const aligned = Math.abs(player.x - state.dragon.x) < 10
  const shoot = aligned && player.fireCooldownMs <= 0

  return { moveX, moveY, shoot }
}
