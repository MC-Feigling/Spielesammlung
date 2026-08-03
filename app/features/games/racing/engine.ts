export const LANE_COUNT = 3
/** Clean-run target ≈ 3 minutes at BASE_SPEED. */
export const TARGET_RACE_MS = 180_000
export const BASE_SPEED = 0.015 // progress units per ms → 15/s
export const SLOWDOWN_MS = 400
export const SLOWDOWN_FACTOR = 0.7
export const SPEED_RAMP = 0.5 // +50% at finish → mult 1.0..1.5
export const MEAN_SPEED_MULT = 1 + SPEED_RAMP / 2 // 1.25
export const TRACK_LENGTH = BASE_SPEED * TARGET_RACE_MS * MEAN_SPEED_MULT
export const COUNTDOWN_MS = 3000
export const CAR_HITBOX = 1.8
export const OBSTACLE_HITBOX = 1.4
export const OBSTACLE_SPAWN_AHEAD = 36
export const SPAWN_INTERVAL_START_MS = 1400
export const SPAWN_INTERVAL_END_MS = 480
/** How far ahead of the leader obstacles stay visible for playfeel (UI uses same idea). */
export const VIEW_AHEAD = 42
export const VIEW_BEHIND = 10

export type RacingPhase = 'countdown' | 'racing' | 'finished'

export interface RacingPlayerConfig {
  seatIndex: number
  type: 'human' | 'ai'
}

export interface RacingCar {
  seatIndex: number
  lane: number
  progress: number
  speed: number
  slowdownUntil: number
}

export interface RacingObstacle {
  id: number
  lane: number
  progress: number
}

export interface RacingState {
  phase: RacingPhase
  countdownMs: number
  cars: RacingCar[]
  obstacles: RacingObstacle[]
  trackLength: number
}

export interface RacingGame {
  state: RacingState
  tick: (dtMs: number) => void
  setLaneIntent: (seatIndex: number, laneDelta: -1 | 1) => void
  getWinnerSeatIndex: () => number | null
}

const COLLISION_DISTANCE = CAR_HITBOX + OBSTACLE_HITBOX
const ALL_LANES = [0, 1, 2] as const

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

/** At most 2 lanes blocked so one path stays open. */
export function spawnCountForDifficulty(difficulty: number, random = Math.random): number {
  if (difficulty < 0.25) return 1
  if (difficulty < 0.55) return random() < 0.4 ? 2 : 1
  if (difficulty < 0.8) return random() < 0.7 ? 2 : 1
  return 2
}

export function pickSpawnLanes(count: number, random = Math.random): number[] {
  const capped = Math.min(Math.max(count, 1), LANE_COUNT - 1)
  const shuffled = [...ALL_LANES].sort(() => random() - 0.5)
  return shuffled.slice(0, capped)
}

function clampLane(lane: number): number {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane))
}

function isOverlapping(car: RacingCar, obstacle: RacingObstacle): boolean {
  return (
    car.lane === obstacle.lane
    && Math.abs(car.progress - obstacle.progress) < COLLISION_DISTANCE
  )
}

export function createRacingGame(config: {
  players: RacingPlayerConfig[]
}): RacingGame {
  const state: RacingState = {
    phase: 'countdown',
    countdownMs: COUNTDOWN_MS,
    cars: config.players.map((player, index) => ({
      seatIndex: player.seatIndex,
      lane: index % LANE_COUNT,
      progress: 0,
      speed: BASE_SPEED,
      slowdownUntil: 0,
    })),
    obstacles: [],
    trackLength: TRACK_LENGTH,
  }

  let nowMs = 0
  let winnerSeatIndex: number | null = null
  let nextObstacleId = 1
  let nextSpawnAtMs = 0
  /** Seats currently overlapping an obstacle — edge-trigger slowdown (no per-frame refresh). */
  const collidingSeats = new Set<number>()

  function leaderProgress(): number {
    return state.cars.reduce((max, car) => Math.max(max, car.progress), 0)
  }

  function applySlowdown(car: RacingCar): void {
    car.slowdownUntil = nowMs + SLOWDOWN_MS
    car.speed = BASE_SPEED * speedMultForProgress(car.progress) * SLOWDOWN_FACTOR
  }

  function refreshCarSpeed(car: RacingCar): void {
    const slowdownMultiplier = car.slowdownUntil > nowMs ? SLOWDOWN_FACTOR : 1
    car.speed = BASE_SPEED * speedMultForProgress(car.progress) * slowdownMultiplier
  }

  function spawnObstacles(): void {
    if (nowMs < nextSpawnAtMs) {
      return
    }

    const difficulty = difficultyFromProgress(leaderProgress())
    nextSpawnAtMs = nowMs + spawnIntervalMs(difficulty)

    const cameraProgress = leaderProgress()
    const lanes = pickSpawnLanes(spawnCountForDifficulty(difficulty))

    for (const lane of lanes) {
      state.obstacles.push({
        id: nextObstacleId,
        lane,
        progress: cameraProgress + OBSTACLE_SPAWN_AHEAD,
      })
      nextObstacleId += 1
    }
  }

  function resolveCollisions(): void {
    const nowColliding = new Set<number>()

    for (const car of state.cars) {
      const hit = state.obstacles.some((obstacle) => isOverlapping(car, obstacle))
      if (!hit) {
        continue
      }

      nowColliding.add(car.seatIndex)
      if (!collidingSeats.has(car.seatIndex)) {
        applySlowdown(car)
      }
    }

    collidingSeats.clear()
    for (const seatIndex of nowColliding) {
      collidingSeats.add(seatIndex)
    }
  }

  function pruneObstacles(): void {
    const cameraProgress = leaderProgress()
    state.obstacles = state.obstacles.filter(
      (obstacle) => obstacle.progress >= cameraProgress - VIEW_BEHIND - 5,
    )
  }

  function checkFinish(): void {
    for (const car of state.cars) {
      if (car.progress >= TRACK_LENGTH) {
        state.phase = 'finished'
        winnerSeatIndex = car.seatIndex
        return
      }
    }
  }

  function tickRacing(dtMs: number): void {
    const step = Math.min(dtMs, 32)
    for (const car of state.cars) {
      refreshCarSpeed(car)
      car.progress += car.speed * step
    }

    spawnObstacles()
    resolveCollisions()
    pruneObstacles()
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

  function setLaneIntent(seatIndex: number, laneDelta: -1 | 1): void {
    if (state.phase !== 'racing') {
      return
    }

    const car = state.cars.find((entry) => entry.seatIndex === seatIndex)
    if (!car) {
      return
    }

    car.lane = clampLane(car.lane + laneDelta)
  }

  function getWinnerSeatIndex(): number | null {
    return winnerSeatIndex
  }

  return {
    state,
    tick,
    setLaneIntent,
    getWinnerSeatIndex,
  }
}
