import type { EngineResult, GameEngine } from '../shared/engine'

/**
 * Maulwurf-Wiese: Hasen hoppeln über einen Wiesenpfad zum Apfelbaum.
 * Würfel: 1, 2, 3 oder Maulwurf. Der Maulwurf schließt das offene Loch und
 * gräbt an einer versteckten Stelle ein neues. Wer in ein Loch fällt
 * (oder darauf landet), muss zurück an den Start.
 */

/** Felder 1..PATH_LENGTH; 0 = Start, GOAL = Apfelbaum. */
export const MOLE_PATH_LENGTH = 16
export const MOLE_START = 0
export const MOLE_GOAL = MOLE_PATH_LENGTH + 1
/** Anzahl versteckter Maulwurf-Stellen pro Spiel. */
export const MOLE_SPOT_COUNT = 6
/** Erste und letzte Feldnummer, an der der Maulwurf graben darf. */
export const MOLE_SPOT_MIN = 2
export const MOLE_SPOT_MAX = MOLE_PATH_LENGTH - 1

export type MoleDieFace = 1 | 2 | 3 | 'mole'
export const MOLE_DIE_FACES: readonly MoleDieFace[] = [1, 2, 3, 1, 2, 'mole']

export const MOLE_FIGURE_COUNTS = [2, 3, 4] as const
export type MoleFigureCount = (typeof MOLE_FIGURE_COUNTS)[number]
export const DEFAULT_MOLE_FIGURE_COUNT: MoleFigureCount = 3

export type MoleMeadowAction =
  | { type: 'roll' }
  | { type: 'move'; pieceIndex: number }
  | { type: 'dig' }

export interface MolePieceRef {
  playerIndex: number
  pieceIndex: number
}

export type MoleMeadowEvent =
  | { type: 'rolled'; face: MoleDieFace }
  | { type: 'moved'; piece: MolePieceRef; from: number; to: number; fell: boolean }
  | { type: 'dug'; closed: number | null; opened: number; fallen: MolePieceRef[] }

export interface MoleMeadowState {
  /** pieces[player][piece] = Feldnummer (0 Start, 1..16 Pfad, 17 Apfelbaum). */
  pieces: number[][]
  currentPlayerIndex: number
  pendingRoll: MoleDieFace | null
  /** Das gerade offene Loch (Feldnummer) oder null. */
  openHole: number | null
  lastEvent: MoleMeadowEvent | null
}

export interface MoleMeadowOptions {
  playerCount: number
  figureCount?: number
  random?: () => number
  /** Für Tests: feste Maulwurf-Stellen statt zufälliger. */
  spots?: number[]
}

function pickIndex(random: () => number, length: number): number {
  return Math.min(length - 1, Math.floor(random() * length))
}

/** Wählt `count` verschiedene Felder zwischen MOLE_SPOT_MIN und MOLE_SPOT_MAX. */
export function pickMoleSpots(random: () => number, count = MOLE_SPOT_COUNT): number[] {
  const pool = Array.from({ length: MOLE_SPOT_MAX - MOLE_SPOT_MIN + 1 }, (_, index) => MOLE_SPOT_MIN + index)
  const spots: number[] = []
  while (spots.length < count && pool.length > 0) {
    spots.push(pool.splice(pickIndex(random, pool.length), 1)[0]!)
  }
  return spots.sort((a, b) => a - b)
}

function isOccupied(pieces: number[][], field: number, except?: MolePieceRef): boolean {
  return pieces.some((own, playerIndex) => own.some((position, pieceIndex) => (
    position === field
    && !(except && except.playerIndex === playerIndex && except.pieceIndex === pieceIndex)
  )))
}

/**
 * Zielfeld eines Hasen: besetzte Felder werden übersprungen (zählen nicht),
 * der Apfelbaum beendet den Lauf sofort.
 */
export function targetField(pieces: number[][], piece: MolePieceRef, steps: number): number {
  let position = pieces[piece.playerIndex]![piece.pieceIndex]!
  let remaining = steps
  while (remaining > 0 && position < MOLE_GOAL) {
    position += 1
    if (position === MOLE_GOAL || !isOccupied(pieces, position, piece)) remaining -= 1
  }
  return position
}

function cloneState(state: MoleMeadowState): MoleMeadowState {
  return {
    pieces: state.pieces.map((own) => [...own]),
    currentPlayerIndex: state.currentPlayerIndex,
    pendingRoll: state.pendingRoll,
    openHole: state.openHole,
    lastEvent: state.lastEvent ? structuredClone(state.lastEvent) : null,
  }
}

export interface MoleMeadowGame extends GameEngine<MoleMeadowState, MoleMeadowAction> {
  getWinnerSeatIndexes: () => number[]
  /** Nur für Tests und die Auflösung am Spielende – die UI zeigt die Stellen nicht. */
  getSpots: () => number[]
}

export function createMoleMeadowGame(options: MoleMeadowOptions): MoleMeadowGame {
  const { playerCount } = options
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) {
    throw new Error('Maulwurf-Wiese braucht 2 bis 4 Spieler')
  }
  const figureCount = options.figureCount ?? DEFAULT_MOLE_FIGURE_COUNT
  if (!MOLE_FIGURE_COUNTS.includes(figureCount as MoleFigureCount)) {
    throw new Error('Ungültige Hasen-Anzahl')
  }
  const random = options.random ?? Math.random
  const spots = options.spots ? [...options.spots] : pickMoleSpots(random)

  let state: MoleMeadowState = {
    pieces: Array.from({ length: playerCount }, () => Array.from({ length: figureCount }, () => MOLE_START)),
    currentPlayerIndex: 0,
    pendingRoll: null,
    openHole: null,
    lastEvent: null,
  }
  let winnerSeatIndexes: number[] = []

  const isTerminal = () => winnerSeatIndexes.length > 0

  function result(): EngineResult<MoleMeadowState> {
    return { state: cloneState(state), winnerSeatIndexes: [...winnerSeatIndexes] }
  }

  function getValidActions(): MoleMeadowAction[] {
    if (isTerminal()) return []
    if (state.pendingRoll === null) return [{ type: 'roll' }]
    if (state.pendingRoll === 'mole') return [{ type: 'dig' }]
    return state.pieces[state.currentPlayerIndex]!
      .map((position, pieceIndex) => ({ position, pieceIndex }))
      .filter(({ position }) => position < MOLE_GOAL)
      .map(({ pieceIndex }) => ({ type: 'move' as const, pieceIndex }))
  }

  function nextPlayer() {
    state.pendingRoll = null
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount
  }

  function applyAction(action: MoleMeadowAction): EngineResult<MoleMeadowState> {
    if (isTerminal()) throw new Error('Das Spiel ist bereits beendet')
    const valid = getValidActions()

    if (action.type === 'roll') {
      if (!valid.some((entry) => entry.type === 'roll')) throw new Error('Jetzt wird nicht gewürfelt')
      const face = MOLE_DIE_FACES[pickIndex(random, MOLE_DIE_FACES.length)]!
      state = { ...cloneState(state), pendingRoll: face, lastEvent: { type: 'rolled', face } }
      return result()
    }

    if (action.type === 'dig') {
      if (!valid.some((entry) => entry.type === 'dig')) throw new Error('Kein Maulwurf gewürfelt')
      const next = cloneState(state)
      const closed = next.openHole
      const candidates = spots.filter((spot) => spot !== closed)
      const opened = candidates[pickIndex(random, candidates.length)]!
      const fallen: MolePieceRef[] = []
      next.pieces.forEach((own, playerIndex) => own.forEach((position, pieceIndex) => {
        if (position === opened) {
          own[pieceIndex] = MOLE_START
          fallen.push({ playerIndex, pieceIndex })
        }
      }))
      next.openHole = opened
      next.lastEvent = { type: 'dug', closed, opened, fallen }
      state = next
      nextPlayer()
      return result()
    }

    if (action.type === 'move') {
      if (!valid.some((entry) => entry.type === 'move' && entry.pieceIndex === action.pieceIndex)) {
        throw new Error('Dieser Hase kann nicht hoppeln')
      }
      const next = cloneState(state)
      const piece = { playerIndex: next.currentPlayerIndex, pieceIndex: action.pieceIndex }
      const from = next.pieces[piece.playerIndex]![piece.pieceIndex]!
      const to = targetField(next.pieces, piece, next.pendingRoll as number)
      const fell = to === next.openHole
      next.pieces[piece.playerIndex]![piece.pieceIndex] = fell ? MOLE_START : to
      next.lastEvent = { type: 'moved', piece, from, to, fell }
      state = next
      if (to === MOLE_GOAL) {
        winnerSeatIndexes = [piece.playerIndex]
        state.pendingRoll = null
        return result()
      }
      nextPlayer()
      return result()
    }

    throw new Error('Ungültige Aktion')
  }

  return {
    getState: () => cloneState(state),
    getValidActions,
    applyAction,
    isTerminal,
    getWinnerSeatIndexes: () => [...winnerSeatIndexes],
    getSpots: () => [...spots],
  }
}
