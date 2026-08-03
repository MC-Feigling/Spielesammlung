import {
  LANE_COUNT,
  VIEW_AHEAD,
  type RacingState,
} from './engine'

export type RacingLaneDelta = -1 | 1

const LOOKAHEAD_PROGRESS = VIEW_AHEAD

function hasObstacleAheadInLane(
  state: RacingState,
  lane: number,
  progress: number,
): boolean {
  return state.obstacles.some((obstacle) => (
    obstacle.lane === lane
    && obstacle.progress > progress
    && obstacle.progress <= progress + LOOKAHEAD_PROGRESS
  ))
}

export function chooseRacingLaneDelta(
  state: RacingState,
  seatIndex: number,
): RacingLaneDelta | null {
  const car = state.cars.find((entry) => entry.seatIndex === seatIndex)
  if (!car) {
    return null
  }

  if (!hasObstacleAheadInLane(state, car.lane, car.progress)) {
    return null
  }

  const candidates: RacingLaneDelta[] = []
  if (car.lane - 1 >= 0) {
    candidates.push(-1)
  }
  if (car.lane + 1 < LANE_COUNT) {
    candidates.push(1)
  }

  const freeNeighbors = candidates.filter((delta) => (
    !hasObstacleAheadInLane(state, car.lane + delta, car.progress)
  ))

  if (freeNeighbors.length === 0) {
    return null
  }

  // Prefer lower target lane index when both neighbors are free.
  return freeNeighbors.reduce((best, delta) => (
    car.lane + delta < car.lane + best ? delta : best
  ))
}
