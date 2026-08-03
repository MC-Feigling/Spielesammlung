export const LANE_COUNT = 3
export const TRACK_LENGTH = 120
export const BASE_SPEED = 0.02 // progress units per ms
export const SLOWDOWN_MS = 700
export const SLOWDOWN_FACTOR = 0.35
export const COUNTDOWN_MS = 3000
export const CAR_HITBOX = 2 // progress half-extent
export const OBSTACLE_HITBOX = 1.5
export const OBSTACLE_SPAWN_AHEAD = 40
export const OBSTACLE_SPAWN_INTERVAL_MS = 900

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

  function applySlowdown(car: RacingCar): void {
    car.slowdownUntil = nowMs + SLOWDOWN_MS
    car.speed = BASE_SPEED * SLOWDOWN_FACTOR
  }

  function refreshCarSpeed(car: RacingCar): void {
    if (car.slowdownUntil > nowMs) {
      car.speed = BASE_SPEED * SLOWDOWN_FACTOR
      return
    }

    car.speed = BASE_SPEED
  }

  function spawnObstacles(): void {
    if (nowMs < nextSpawnAtMs) {
      return
    }

    nextSpawnAtMs = nowMs + OBSTACLE_SPAWN_INTERVAL_MS

    const cameraProgress = state.cars.reduce(
      (max, car) => Math.max(max, car.progress),
      0,
    )

    state.obstacles.push({
      id: nextObstacleId,
      lane: Math.floor(Math.random() * LANE_COUNT),
      progress: cameraProgress + OBSTACLE_SPAWN_AHEAD,
    })
    nextObstacleId += 1
  }

  function resolveCollisions(): void {
    for (const car of state.cars) {
      for (const obstacle of state.obstacles) {
        if (isOverlapping(car, obstacle)) {
          applySlowdown(car)
          break
        }
      }
    }
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
    for (const car of state.cars) {
      refreshCarSpeed(car)
      car.progress += car.speed * dtMs
    }

    spawnObstacles()
    resolveCollisions()
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
