/** Clean-run target ≈ 2.5 minutes at mean speed. */
export const TARGET_RACE_MS = 150_000
export const BASE_SPEED = 0.015
export const SPEED_RAMP = 0.5
export const MEAN_SPEED_MULT = 1 + SPEED_RAMP / 2
export const TRACK_LENGTH = BASE_SPEED * TARGET_RACE_MS * MEAN_SPEED_MULT
export const COUNTDOWN_MS = 3000
export const ACCEL_PER_MS = 0.00008
export const DECEL_PER_MS = 0.00005
export const COAST_SPEED_FACTOR = 0.25
export const JUMP_AIR_MS = 420
export const HURDLE_HITBOX = 1.6
export const HORSE_HITBOX = 1.2
export const SLOWDOWN_MS = 400
export const SLOWDOWN_FACTOR = 0.7
export const HURDLE_SPAWN_AHEAD = 28
export const SPAWN_INTERVAL_START_MS = 2200
export const SPAWN_INTERVAL_END_MS = 1100
export const VIEW_AHEAD = 36
export const VIEW_BEHIND = 10
export const JUMP_LOOKAHEAD = 10

export type HorseRacingPhase = 'countdown' | 'racing' | 'finished'

export interface HorseRacingPlayerConfig {
  seatIndex: number
  type: 'human' | 'ai'
}

export interface HorseRacingHorse {
  seatIndex: number
  progress: number
  speed: number
  hold: boolean
  airMs: number
  slowdownUntil: number
}

export interface HorseRacingHurdle {
  id: number
  progress: number
}

export interface HorseRacingState {
  phase: HorseRacingPhase
  countdownMs: number
  horses: HorseRacingHorse[]
  hurdles: HorseRacingHurdle[]
  trackLength: number
}

export interface HorseRacingGame {
  state: HorseRacingState
  tick: (dtMs: number) => void
  setHold: (seatIndex: number, held: boolean) => void
  jump: (seatIndex: number) => void
  getWinnerSeatIndex: () => number | null
}

const COLLISION_DISTANCE = HORSE_HITBOX + HURDLE_HITBOX

export function difficultyFromProgress(progress: number): number {
  if (TRACK_LENGTH <= 0) return 0
  return Math.min(1, Math.max(0, progress / TRACK_LENGTH))
}

export function speedMultForProgress(progress: number): number {
  return 1 + SPEED_RAMP * difficultyFromProgress(progress)
}

export function spawnIntervalMs(difficulty: number): number {
  const t = Math.min(1, Math.max(0, difficulty))
  return Math.round(SPAWN_INTERVAL_START_MS + (SPAWN_INTERVAL_END_MS - SPAWN_INTERVAL_START_MS) * t)
}

export function maxSpeedForProgress(progress: number): number {
  return BASE_SPEED * speedMultForProgress(progress)
}

export function coastSpeedForProgress(progress: number): number {
  return maxSpeedForProgress(progress) * COAST_SPEED_FACTOR
}

export function createHorseRacingGame(config: {
  players: HorseRacingPlayerConfig[]
}): HorseRacingGame {
  const state: HorseRacingState = {
    phase: 'countdown',
    countdownMs: COUNTDOWN_MS,
    horses: config.players.map((player) => ({
      seatIndex: player.seatIndex,
      progress: 0,
      speed: 0,
      hold: false,
      airMs: 0,
      slowdownUntil: 0,
    })),
    hurdles: [],
    trackLength: TRACK_LENGTH,
  }

  let nowMs = 0
  let winnerSeatIndex: number | null = null
  let nextHurdleId = 1
  let nextSpawnAtMs = 0
  const collidingSeats = new Set<number>()

  function leaderProgress(): number {
    return state.horses.reduce((max, horse) => Math.max(max, horse.progress), 0)
  }

  function applySlowdown(horse: HorseRacingHorse): void {
    horse.slowdownUntil = nowMs + SLOWDOWN_MS
  }

  function refreshHorseSpeed(horse: HorseRacingHorse, dtMs: number): void {
    const maxSpeed = maxSpeedForProgress(horse.progress)
    const coastSpeed = coastSpeedForProgress(horse.progress)
    const target = horse.hold ? maxSpeed : coastSpeed

    if (horse.speed < target) {
      horse.speed = Math.min(target, horse.speed + ACCEL_PER_MS * dtMs)
    }
    else if (horse.speed > target) {
      horse.speed = Math.max(target, horse.speed - DECEL_PER_MS * dtMs)
    }

    if (horse.slowdownUntil > nowMs) {
      horse.speed *= SLOWDOWN_FACTOR
    }
  }

  function spawnHurdles(): void {
    if (nowMs < nextSpawnAtMs) {
      return
    }

    const difficulty = difficultyFromProgress(leaderProgress())
    nextSpawnAtMs = nowMs + spawnIntervalMs(difficulty)

    state.hurdles.push({
      id: nextHurdleId,
      progress: leaderProgress() + HURDLE_SPAWN_AHEAD,
    })
    nextHurdleId += 1
  }

  function isOverlapping(horse: HorseRacingHorse, hurdle: HorseRacingHurdle): boolean {
    return Math.abs(horse.progress - hurdle.progress) < COLLISION_DISTANCE
  }

  function resolveCollisions(): void {
    const nowColliding = new Set<number>()

    for (const horse of state.horses) {
      if (horse.airMs > 0) {
        continue
      }

      const hit = state.hurdles.some((hurdle) => isOverlapping(horse, hurdle))
      if (!hit) {
        continue
      }

      nowColliding.add(horse.seatIndex)
      if (!collidingSeats.has(horse.seatIndex)) {
        applySlowdown(horse)
      }
    }

    collidingSeats.clear()
    for (const seatIndex of nowColliding) {
      collidingSeats.add(seatIndex)
    }
  }

  function pruneHurdles(): void {
    const cameraProgress = leaderProgress()
    state.hurdles = state.hurdles.filter(
      (hurdle) => hurdle.progress >= cameraProgress - VIEW_BEHIND - 5,
    )
  }

  function checkFinish(): void {
    for (const horse of state.horses) {
      if (horse.progress >= TRACK_LENGTH) {
        state.phase = 'finished'
        winnerSeatIndex = horse.seatIndex
        return
      }
    }
  }

  function tickRacing(dtMs: number): void {
    const step = Math.min(dtMs, 32)
    for (const horse of state.horses) {
      if (horse.airMs > 0) {
        horse.airMs = Math.max(0, horse.airMs - step)
      }
      refreshHorseSpeed(horse, step)
      horse.progress += horse.speed * step
    }

    spawnHurdles()
    resolveCollisions()
    pruneHurdles()
    checkFinish()
  }

  function tick(dtMs: number): void {
    if (state.phase === 'finished' || dtMs <= 0) {
      return
    }

    nowMs += dtMs

    if (state.phase === 'countdown') {
      state.countdownMs = Math.max(0, state.countdownMs - dtMs)
      if (state.countdownMs === 0) {
        state.phase = 'racing'
        nextSpawnAtMs = nowMs
      }
      return
    }

    tickRacing(dtMs)
  }

  function setHold(seatIndex: number, held: boolean): void {
    if (state.phase !== 'racing') {
      return
    }

    const horse = state.horses.find((entry) => entry.seatIndex === seatIndex)
    if (!horse) {
      return
    }

    horse.hold = held
  }

  function jump(seatIndex: number): void {
    if (state.phase !== 'racing') {
      return
    }

    const horse = state.horses.find((entry) => entry.seatIndex === seatIndex)
    if (!horse || horse.airMs > 0) {
      return
    }

    horse.airMs = JUMP_AIR_MS
  }

  function getWinnerSeatIndex(): number | null {
    return winnerSeatIndex
  }

  return {
    state,
    tick,
    setHold,
    jump,
    getWinnerSeatIndex,
  }
}
