import {
  DEFAULT_AI_DIFFICULTY,
  MOLE_MEADOW_EASY_BLUNDER_RATE,
  MOLE_MEADOW_MEDIUM_BLUNDER_RATE,
  type AiDifficulty,
} from '../shared/ai'
import { MOLE_GOAL, targetField, type MoleMeadowAction, type MoleMeadowState } from './engine'

type MoveAction = Extract<MoleMeadowAction, { type: 'move' }>

export interface MoleMeadowAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

/** Higher is better: reach the tree, never step into the open hole, otherwise run with the leader. */
function scoreMove(state: MoleMeadowState, action: MoveAction): number {
  const piece = { playerIndex: state.currentPlayerIndex, pieceIndex: action.pieceIndex }
  const from = state.pieces[piece.playerIndex]![piece.pieceIndex]!
  const to = targetField(state.pieces, piece, state.pendingRoll as number)
  if (to === MOLE_GOAL) return 1000
  if (to === state.openHole) return -1000
  // Leaving the open hole's neighbourhood behind is nice, but progress of the leader counts most.
  return to * 10 + from
}

export function chooseMoleMeadowAction(
  state: MoleMeadowState,
  actions: MoleMeadowAction[],
  options: MoleMeadowAiOptions = {},
): MoleMeadowAction | null {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  const direct = actions.find((action) => action.type === 'roll' || action.type === 'dig')
  if (direct) return direct

  const moves = actions.filter((action): action is MoveAction => action.type === 'move')
  if (moves.length === 0) return null

  const best = [...moves].sort((a, b) => scoreMove(state, b) - scoreMove(state, a))[0]!
  const blunderRate = difficulty === 'easy'
    ? MOLE_MEADOW_EASY_BLUNDER_RATE
    : difficulty === 'medium' ? MOLE_MEADOW_MEDIUM_BLUNDER_RATE : 0

  if (blunderRate > 0 && moves.length > 1 && scoreMove(state, best) < 1000 && random() < blunderRate) {
    return moves[Math.min(moves.length - 1, Math.floor(random() * moves.length))]!
  }
  return best
}
