import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from '../shared/ai'
import {
  JUMP_LOOKAHEAD,
  type HorseRacingState,
} from './engine'

export interface HorseRacingAiActions {
  hold: boolean
  jump: boolean
}

export interface HorseRacingAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

const EASY_BLUNDER_PROB = 0.45
const MEDIUM_BLUNDER_PROB = 0.2

function hasHurdleAhead(state: HorseRacingState, progress: number): boolean {
  return state.hurdles.some((hurdle) => (
    hurdle.progress > progress
    && hurdle.progress <= progress + JUMP_LOOKAHEAD
  ))
}

export function chooseHorseRacingActions(
  state: HorseRacingState,
  seatIndex: number,
  options: HorseRacingAiOptions = {},
): HorseRacingAiActions {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  const horse = state.horses.find((entry) => entry.seatIndex === seatIndex)
  if (!horse || state.phase !== 'racing') {
    return { hold: false, jump: false }
  }

  const shouldConsiderJump = hasHurdleAhead(state, horse.progress) && horse.airMs === 0
  let jump = false

  if (shouldConsiderJump) {
    const blunderProb = difficulty === 'easy'
      ? EASY_BLUNDER_PROB
      : difficulty === 'medium'
        ? MEDIUM_BLUNDER_PROB
        : 0

    jump = blunderProb === 0 || random() >= blunderProb
  }

  return { hold: true, jump }
}
