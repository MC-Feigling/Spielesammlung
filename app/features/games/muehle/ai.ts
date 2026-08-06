import {
  DEFAULT_AI_DIFFICULTY,
  MUEHLE_EASY_BLUNDER_RATE,
  MUEHLE_MEDIUM_BLUNDER_RATE,
  type AiDifficulty,
} from '../shared/ai'
import {
  MUEHLE_MILLS,
  formsMill,
} from './board'
import type { MuehleAction, MuehleGameState } from './engine'

export interface MuehleAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

function opponentOf(seat: number): number {
  return 1 - seat
}

function applyActionPreview(
  state: MuehleGameState,
  action: MuehleAction,
): Array<number | null> | null {
  const points = [...state.points]
  const seat = state.currentPlayerIndex

  if (action.type === 'place') {
    if (points[action.point] !== null) return null
    points[action.point] = seat
    return points
  }

  if (action.type === 'move') {
    if (points[action.from] !== seat || points[action.to] !== null) return null
    points[action.from] = null
    points[action.to] = seat
    return points
  }

  if (points[action.point] !== opponentOf(seat)) return null
  points[action.point] = null
  return points
}

function actionFormsMill(state: MuehleGameState, action: MuehleAction): boolean {
  if (action.type === 'remove') return false
  const points = applyActionPreview(state, action)
  if (!points) return false
  const focus = action.type === 'place' ? action.point : action.to
  return formsMill(points, focus, state.currentPlayerIndex)
}

function actionBlocksOpponentMill(state: MuehleGameState, action: MuehleAction): boolean {
  if (action.type === 'remove') return false
  if (action.type === 'place') {
    // Opponent would place here next to complete a mill
    return wouldCompleteMill(state.points, action.point, opponentOf(state.currentPlayerIndex))
  }
  // Moving onto a point that opponent could use to complete a mill
  return wouldCompleteMill(state.points, action.to, opponentOf(state.currentPlayerIndex))
}

function wouldCompleteMill(
  points: ReadonlyArray<number | null>,
  point: number,
  seat: number,
): boolean {
  if (points[point] !== null) return false
  const next = [...points]
  next[point] = seat
  return formsMill(next, point, seat)
}

function millThreatCount(points: ReadonlyArray<number | null>, seat: number): number {
  let threats = 0
  for (const mill of MUEHLE_MILLS) {
    const owners = mill.map((index) => points[index])
    const own = owners.filter((owner) => owner === seat).length
    const empty = owners.filter((owner) => owner === null).length
    if (own === 2 && empty === 1) threats += 1
  }
  return threats
}

function actionMillThreatGain(state: MuehleGameState, action: MuehleAction): number {
  if (action.type === 'remove') return 0
  const points = applyActionPreview(state, action)
  if (!points) return 0
  return millThreatCount(points, state.currentPlayerIndex) - millThreatCount(state.points, state.currentPlayerIndex)
}

function removeScore(state: MuehleGameState, action: Extract<MuehleAction, { type: 'remove' }>): number {
  const opponent = opponentOf(state.currentPlayerIndex)
  const points = [...state.points]
  points[action.point] = null
  // Prefer removing stones that participate in opponent threats
  const before = millThreatCount(state.points, opponent)
  const after = millThreatCount(points, opponent)
  return before - after
}

function chooseHardAction(state: MuehleGameState, actions: MuehleAction[]): MuehleAction {
  const millClose = actions.find((action) => actionFormsMill(state, action))
  if (millClose) return millClose

  const block = actions.find((action) => actionBlocksOpponentMill(state, action))
  if (block) return block

  const removes = actions.filter((action): action is Extract<MuehleAction, { type: 'remove' }> =>
    action.type === 'remove',
  )
  if (removes.length > 0) {
    return [...removes].sort((left, right) =>
      removeScore(state, right) - removeScore(state, left)
      || left.point - right.point,
    )[0]!
  }

  const ranked = [...actions].sort((left, right) =>
    actionMillThreatGain(state, right) - actionMillThreatGain(state, left)
    || actionSortKey(left) - actionSortKey(right),
  )
  return ranked[0]!
}

function actionSortKey(action: MuehleAction): number {
  if (action.type === 'place') return action.point
  if (action.type === 'move') return action.from * 100 + action.to
  return action.point
}

export function chooseMuehleAction(
  state: MuehleGameState,
  actions: MuehleAction[],
  options: MuehleAiOptions = {},
): MuehleAction | null {
  if (actions.length === 0) return null

  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  const blunderRate = (
    difficulty === 'easy' ? MUEHLE_EASY_BLUNDER_RATE
      : difficulty === 'medium' ? MUEHLE_MEDIUM_BLUNDER_RATE
        : 0
  )

  if (blunderRate > 0 && actions.length > 1 && random() < blunderRate) {
    const randomIndex = Math.floor(random() * actions.length)
    return actions[Math.min(randomIndex, actions.length - 1)]!
  }

  return chooseHardAction(state, actions)
}
