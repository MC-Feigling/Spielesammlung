import type { EngineResult, GameEngine } from '../shared/engine'
import {
  getRingIndex,
  isInHome,
  isInYard,
  LUDO_HOME_END_PROGRESS,
  LUDO_PIECES_PER_PLAYER,
  LUDO_PLAYER_COUNT_MAX,
  LUDO_PLAYER_COUNT_MIN,
  LUDO_YARD_PROGRESS,
  type LudoPiece,
} from './board'

export type LudoMoveFrom = 'yard' | 'ring' | 'home'

export type LudoAction =
  | { type: 'roll'; forcedValue?: number }
  | { type: 'move'; pieceIndex: number; from: LudoMoveFrom }

export type LudoEvent = 'capture' | null

export interface LudoGameOptions {
  playerCount: number
  seed?: number
}

export interface LudoGameState {
  playerCount: number
  currentPlayerIndex: number
  pendingRoll: number | null
  pieces: LudoPiece[][]
  lastEvent: LudoEvent
  /** Failed yard-entry rolls this turn (0–2 while retries remain). */
  yardRollAttempts: number
}

export interface LudoGameStateInput {
  playerCount: number
  currentPlayerIndex: number
  pendingRoll: number | null
  pieces: LudoPiece[][]
  yardRollAttempts?: number
}

const MIN_DIE_VALUE = 1
const MAX_DIE_VALUE = 6
export const LUDO_YARD_ROLL_ATTEMPTS_MAX = 3

export function canControlPiece(state: LudoGameState, playerIndex: number): boolean {
  return playerIndex === state.currentPlayerIndex
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0

  return () => {
    value += 0x6D2B79F5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296
  }
}

function cloneState(state: LudoGameState): LudoGameState {
  return {
    ...state,
    pieces: state.pieces.map((playerPieces) => playerPieces.map((piece) => ({ ...piece }))),
  }
}

function validatePlayerCount(playerCount: number) {
  if (!Number.isInteger(playerCount) || playerCount < LUDO_PLAYER_COUNT_MIN || playerCount > LUDO_PLAYER_COUNT_MAX) {
    throw new Error('Mensch ärgere dich nicht braucht zwei bis vier Spieler')
  }
}

function validateState(input: LudoGameStateInput) {
  validatePlayerCount(input.playerCount)

  if (!Number.isInteger(input.currentPlayerIndex) || input.currentPlayerIndex < 0 || input.currentPlayerIndex >= input.playerCount) {
    throw new Error('Der aktuelle Spieler ist ungültig')
  }

  if (input.pendingRoll !== null && (!Number.isInteger(input.pendingRoll) || input.pendingRoll < MIN_DIE_VALUE || input.pendingRoll > MAX_DIE_VALUE)) {
    throw new Error('Der Würfelwert ist ungültig')
  }

  if (input.pieces.length !== input.playerCount || input.pieces.some((pieces) => pieces.length !== LUDO_PIECES_PER_PLAYER)) {
    throw new Error('Jeder Spieler braucht vier Figuren')
  }

  if (input.pieces.some((pieces) => pieces.some((piece) => !Number.isInteger(piece.progress) || piece.progress < LUDO_YARD_PROGRESS || piece.progress > LUDO_HOME_END_PROGRESS))) {
    throw new Error('Eine Figurenposition ist ungültig')
  }

  const yardRollAttempts = input.yardRollAttempts ?? 0
  if (!Number.isInteger(yardRollAttempts) || yardRollAttempts < 0 || yardRollAttempts >= LUDO_YARD_ROLL_ATTEMPTS_MAX) {
    throw new Error('Die Haus-Würfelversuche sind ungültig')
  }
}

function moveFrom(piece: LudoPiece): LudoMoveFrom {
  if (isInYard(piece)) return 'yard'
  return isInHome(piece) ? 'home' : 'ring'
}

function allPiecesInYard(state: LudoGameState, playerIndex: number): boolean {
  return state.pieces[playerIndex].every((piece) => isInYard(piece))
}

function getMoveActions(state: LudoGameState): Extract<LudoAction, { type: 'move' }>[] {
  if (state.pendingRoll === null) return []

  return state.pieces[state.currentPlayerIndex].flatMap((piece, pieceIndex) => {
    if (isInYard(piece)) {
      return state.pendingRoll === MAX_DIE_VALUE
        ? [{ type: 'move' as const, pieceIndex, from: 'yard' as const }]
        : []
    }

    return piece.progress + state.pendingRoll <= LUDO_HOME_END_PROGRESS
      ? [{ type: 'move' as const, pieceIndex, from: moveFrom(piece) }]
      : []
  })
}

function winnerSeatIndexes(state: LudoGameState): number[] {
  return state.pieces.flatMap((pieces, playerIndex) => (
    pieces.every((piece) => piece.progress === LUDO_HOME_END_PROGRESS) ? [playerIndex] : []
  ))
}

function advanceTurn(state: LudoGameState): LudoGameState {
  return {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.playerCount,
    pendingRoll: null,
    yardRollAttempts: 0,
  }
}

function createGame(initialState: LudoGameState, random: () => number): GameEngine<LudoGameState, LudoAction> {
  let state = cloneState(initialState)

  function isTerminal() {
    return winnerSeatIndexes(state).length > 0
  }

  function result(): EngineResult<LudoGameState> {
    return { state: cloneState(state), winnerSeatIndexes: winnerSeatIndexes(state) }
  }

  function getValidActions(): LudoAction[] {
    if (isTerminal()) return []
    if (state.pendingRoll === null) return [{ type: 'roll' }]
    return getMoveActions(state)
  }

  function applyAction(action: LudoAction): EngineResult<LudoGameState> {
    if (isTerminal()) throw new Error('Das Spiel ist bereits beendet')

    if (action.type === 'roll') {
      if (state.pendingRoll !== null) throw new Error('Die Figur muss zuerst bewegt werden')
      if (action.forcedValue !== undefined && (!Number.isInteger(action.forcedValue) || action.forcedValue < MIN_DIE_VALUE || action.forcedValue > MAX_DIE_VALUE)) {
        throw new Error('Der Würfelwert ist ungültig')
      }

      const pendingRoll = action.forcedValue ?? Math.floor(random() * MAX_DIE_VALUE) + MIN_DIE_VALUE
      const rollingPlayerIndex = state.currentPlayerIndex
      state = { ...state, pendingRoll, lastEvent: null }

      if (getMoveActions(state).length > 0) {
        state = { ...state, yardRollAttempts: 0 }
        return result()
      }

      if (allPiecesInYard(state, rollingPlayerIndex)) {
        const attempts = state.yardRollAttempts + 1
        if (attempts < LUDO_YARD_ROLL_ATTEMPTS_MAX) {
          state = {
            ...state,
            pendingRoll: null,
            yardRollAttempts: attempts,
          }
          return result()
        }
      }

      state = advanceTurn(state)
      return result()
    }

    const validMove = getMoveActions(state).some((move) => (
      move.pieceIndex === action.pieceIndex && move.from === action.from
    ))
    if (!validMove) throw new Error('Diese Figur kann nicht bewegt werden')

    const movingPlayerIndex = state.currentPlayerIndex
    const roll = state.pendingRoll
    const pieces = state.pieces.map((playerPieces) => playerPieces.map((piece) => ({ ...piece })))
    const movingPiece = pieces[movingPlayerIndex][action.pieceIndex]
    const targetProgress = isInYard(movingPiece) ? 0 : movingPiece.progress + roll!
    movingPiece.progress = targetProgress

    let captured = false
    const landingRingIndex = getRingIndex(movingPlayerIndex, targetProgress)
    if (landingRingIndex !== null) {
      pieces.forEach((playerPieces, playerIndex) => {
        if (playerIndex === movingPlayerIndex) return

        playerPieces.forEach((piece) => {
          if (getRingIndex(playerIndex, piece.progress) === landingRingIndex) {
            piece.progress = LUDO_YARD_PROGRESS
            captured = true
          }
        })
      })
    }

    const keepsTurn = roll === MAX_DIE_VALUE
    state = {
      ...state,
      pieces,
      currentPlayerIndex: keepsTurn ? movingPlayerIndex : (movingPlayerIndex + 1) % state.playerCount,
      pendingRoll: null,
      lastEvent: captured ? 'capture' : null,
      yardRollAttempts: 0,
    }
    return result()
  }

  return { getState: () => cloneState(state), getValidActions, applyAction, isTerminal }
}

export function createLudoGame(options: LudoGameOptions): GameEngine<LudoGameState, LudoAction> {
  validatePlayerCount(options.playerCount)
  const initialState: LudoGameState = {
    playerCount: options.playerCount,
    currentPlayerIndex: 0,
    pendingRoll: null,
    pieces: Array.from({ length: options.playerCount }, () => (
      Array.from({ length: LUDO_PIECES_PER_PLAYER }, () => ({ progress: LUDO_YARD_PROGRESS }))
    )),
    lastEvent: null,
    yardRollAttempts: 0,
  }

  return createGame(initialState, createSeededRandom(options.seed ?? Date.now()))
}

export function createLudoGameFromState(input: LudoGameStateInput): GameEngine<LudoGameState, LudoAction> {
  validateState(input)
  return createGame({
    playerCount: input.playerCount,
    currentPlayerIndex: input.currentPlayerIndex,
    pendingRoll: input.pendingRoll,
    pieces: input.pieces,
    lastEvent: null,
    yardRollAttempts: input.yardRollAttempts ?? 0,
  }, Math.random)
}
