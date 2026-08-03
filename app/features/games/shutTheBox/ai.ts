import {
  DEFAULT_AI_DIFFICULTY,
  SHUT_THE_BOX_EASY_BLUNDER_RATE,
  type AiDifficulty,
} from '../shared/ai'
import type { ShutTheBoxAction, ShutTheBoxGameState } from './engine'

export interface ShutTheBoxAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

function isCloseAction(action: ShutTheBoxAction): action is Extract<ShutTheBoxAction, { type: 'close' }> {
  return action.type === 'close'
}

function wouldPerfectShut(open: boolean[], numbers: number[]): boolean {
  const nextOpen = [...open]
  for (const number of numbers) {
    nextOpen[number - 1] = false
  }
  return nextOpen.every((tile) => !tile)
}

function compareCloseActions(
  first: Extract<ShutTheBoxAction, { type: 'close' }>,
  second: Extract<ShutTheBoxAction, { type: 'close' }>,
  open: boolean[],
): number {
  const firstPerfect = wouldPerfectShut(open, first.numbers)
  const secondPerfect = wouldPerfectShut(open, second.numbers)
  if (firstPerfect !== secondPerfect) {
    return firstPerfect ? -1 : 1
  }

  const firstMax = Math.max(...first.numbers)
  const secondMax = Math.max(...second.numbers)
  if (firstMax !== secondMax) {
    return secondMax - firstMax
  }

  if (first.numbers.length !== second.numbers.length) {
    return second.numbers.length - first.numbers.length
  }

  const firstSum = first.numbers.reduce((sum, number) => sum + number, 0)
  const secondSum = second.numbers.reduce((sum, number) => sum + number, 0)
  return secondSum - firstSum
}

function chooseHardClose(
  state: ShutTheBoxGameState,
  actions: Array<Extract<ShutTheBoxAction, { type: 'close' }>>,
): ShutTheBoxAction {
  const open = state.boxes[state.currentPlayerIndex]!.open
  return [...actions].sort((first, second) => compareCloseActions(first, second, open))[0]!
}

export function chooseShutTheBoxAction(
  state: ShutTheBoxGameState,
  actions: ShutTheBoxAction[],
  options: ShutTheBoxAiOptions = {},
): ShutTheBoxAction | null {
  if (actions.length === 0) return null

  if (state.phase === 'awaitingRoll' || actions.every((action) => action.type === 'roll')) {
    const roll = actions.find((action) => action.type === 'roll')
    return roll ?? null
  }

  const closeActions = actions.filter(isCloseAction)
  if (closeActions.length === 0) return null

  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  if (difficulty === 'easy' && closeActions.length > 1 && random() < SHUT_THE_BOX_EASY_BLUNDER_RATE) {
    const randomIndex = Math.floor(random() * closeActions.length)
    return closeActions[Math.min(randomIndex, closeActions.length - 1)]!
  }

  return chooseHardClose(state, closeActions)
}
