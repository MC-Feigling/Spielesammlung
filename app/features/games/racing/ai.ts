import {
  LANE_COUNT,
  VIEW_AHEAD,
  type RacingState,
} from './engine'
import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from '../shared/ai'

export type RacingLaneDelta = -1 | 1

const LOOKAHEAD_PROGRESS = VIEW_AHEAD
const EASY_RANDOM_CHOICE_PROB = 0.5
const MEDIUM_RANDOM_CHOICE_PROB = 0.25

export interface RacingAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

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
  options: RacingAiOptions = {},
): RacingLaneDelta | null {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

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
  const optimalDelta = freeNeighbors.reduce((best, delta) => (
    car.lane + delta < car.lane + best ? delta : best
  ))

  if (freeNeighbors.length > 1) {
    const randomChoiceProb = difficulty === 'easy'
      ? EASY_RANDOM_CHOICE_PROB
      : difficulty === 'medium'
        ? MEDIUM_RANDOM_CHOICE_PROB
        : 0

    if (randomChoiceProb > 0 && random() < randomChoiceProb) {
      const randomIndex = Math.floor(random() * freeNeighbors.length)
      return freeNeighbors[Math.min(randomIndex, freeNeighbors.length - 1)]!
    }
  }

  return optimalDelta
}
