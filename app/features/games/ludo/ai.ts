import {
  DEFAULT_AI_DIFFICULTY,
  LUDO_EASY_BLUNDER_RATE,
  type AiDifficulty,
} from '../shared/ai'
import { getRingIndex, isInYard } from './board'
import type { LudoAction, LudoGameState } from './engine'

type LudoMoveAction = Extract<LudoAction, { type: 'move' }>

export interface LudoAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

function isCapture(state: LudoGameState, action: LudoMoveAction): boolean {
  const roll = state.pendingRoll
  if (roll === null) return false

  const piece = state.pieces[state.currentPlayerIndex][action.pieceIndex]
  const targetProgress = isInYard(piece) ? 0 : piece.progress + roll
  const landingRingIndex = getRingIndex(state.currentPlayerIndex, targetProgress)
  if (landingRingIndex === null) return false

  return state.pieces.some((pieces, playerIndex) => (
    playerIndex !== state.currentPlayerIndex
      && pieces.some((opponentPiece) => getRingIndex(playerIndex, opponentPiece.progress) === landingRingIndex)
  ))
}

function entersHome(state: LudoGameState, action: LudoMoveAction): boolean {
  const roll = state.pendingRoll
  if (roll === null) return false

  const piece = state.pieces[state.currentPlayerIndex][action.pieceIndex]
  return piece.progress < 40 && !isInYard(piece) && piece.progress + roll >= 40
}

function chooseOptimalMove(state: LudoGameState, moves: LudoMoveAction[]): LudoMoveAction {
  return moves.find((action) => isCapture(state, action))
    ?? moves.find((action) => entersHome(state, action))
    ?? moves.find((action) => action.from === 'yard')
    ?? [...moves].sort((first, second) => (
      state.pieces[state.currentPlayerIndex][second.pieceIndex].progress
      - state.pieces[state.currentPlayerIndex][first.pieceIndex].progress
    ))[0]
}

export function chooseLudoAction(
  state: LudoGameState,
  actions: LudoAction[],
  options: LudoAiOptions = {},
): LudoAction | null {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  const rollAction = actions.find((action) => action.type === 'roll')
  if (rollAction) return rollAction

  const moves = actions.filter((action): action is LudoMoveAction => action.type === 'move')
  if (moves.length === 0) return null

  const optimal = chooseOptimalMove(state, moves)

  if (difficulty === 'easy' && moves.length > 1 && random() < LUDO_EASY_BLUNDER_RATE) {
    const alternatives = moves.filter((action) => (
      action.pieceIndex !== optimal.pieceIndex || action.from !== optimal.from
    ))
    const pool = alternatives.length > 0 ? alternatives : moves
    const randomIndex = Math.floor(random() * pool.length)
    return pool[Math.min(randomIndex, pool.length - 1)]
  }

  return optimal
}
