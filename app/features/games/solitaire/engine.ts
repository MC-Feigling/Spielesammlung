/**
 * Solitär (englisches Brett, 33 Löcher in Kreuzform).
 * Eine Kugel springt waagerecht oder senkrecht über eine Nachbarkugel in ein
 * freies Loch, die übersprungene Kugel wird entfernt. Ziel: nur noch eine Kugel.
 */

export const SOLITAIRE_SIZE = 7
export const SOLITAIRE_CENTER = 3

export type SolitaireCell = 'peg' | 'empty' | null

export interface SolitairePos {
  row: number
  col: number
}

export interface SolitaireMove {
  from: SolitairePos
  over: SolitairePos
  to: SolitairePos
}

export interface SolitaireState {
  /** cells[row][col]; null = kein Loch (Ecken außerhalb des Kreuzes). */
  cells: SolitaireCell[][]
  pegCount: number
  moveCount: number
  lastMove: SolitaireMove | null
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function isOnBoard(row: number, col: number): boolean {
  if (row < 0 || col < 0 || row >= SOLITAIRE_SIZE || col >= SOLITAIRE_SIZE) return false
  return (row >= 2 && row <= 4) || (col >= 2 && col <= 4)
}

export function createSolitaireState(): SolitaireState {
  const cells = Array.from({ length: SOLITAIRE_SIZE }, (_, row) =>
    Array.from({ length: SOLITAIRE_SIZE }, (_, col): SolitaireCell => {
      if (!isOnBoard(row, col)) return null
      return row === SOLITAIRE_CENTER && col === SOLITAIRE_CENTER ? 'empty' : 'peg'
    }),
  )
  return { cells, pegCount: 32, moveCount: 0, lastMove: null }
}

function cellAt(state: SolitaireState, row: number, col: number): SolitaireCell {
  return isOnBoard(row, col) ? state.cells[row]![col]! : null
}

/** Alle erlaubten Sprünge der Kugel auf `from`. */
export function movesFrom(state: SolitaireState, from: SolitairePos): SolitaireMove[] {
  if (cellAt(state, from.row, from.col) !== 'peg') return []
  const moves: SolitaireMove[] = []
  for (const [dr, dc] of DIRECTIONS) {
    const over = { row: from.row + dr, col: from.col + dc }
    const to = { row: from.row + dr * 2, col: from.col + dc * 2 }
    if (cellAt(state, over.row, over.col) === 'peg' && cellAt(state, to.row, to.col) === 'empty') {
      moves.push({ from: { ...from }, over, to })
    }
  }
  return moves
}

export function allMoves(state: SolitaireState): SolitaireMove[] {
  const moves: SolitaireMove[] = []
  for (let row = 0; row < SOLITAIRE_SIZE; row += 1) {
    for (let col = 0; col < SOLITAIRE_SIZE; col += 1) {
      moves.push(...movesFrom(state, { row, col }))
    }
  }
  return moves
}

/** Der Sprung von `from` nach `to`, falls erlaubt. */
export function findMove(state: SolitaireState, from: SolitairePos, to: SolitairePos): SolitaireMove | null {
  return movesFrom(state, from).find((move) => move.to.row === to.row && move.to.col === to.col) ?? null
}

export function applyMove(state: SolitaireState, move: SolitaireMove): SolitaireState {
  const legal = findMove(state, move.from, move.to)
  if (!legal) throw new Error('Ungültiger Sprung')

  const cells = state.cells.map((row) => [...row])
  cells[legal.from.row]![legal.from.col] = 'empty'
  cells[legal.over.row]![legal.over.col] = 'empty'
  cells[legal.to.row]![legal.to.col] = 'peg'
  return {
    cells,
    pegCount: state.pegCount - 1,
    moveCount: state.moveCount + 1,
    lastMove: legal,
  }
}

export function isFinished(state: SolitaireState): boolean {
  return allMoves(state).length === 0
}

/** Gelöst: genau eine Kugel übrig. */
export function isSolved(state: SolitaireState): boolean {
  return state.pegCount === 1
}

/** Perfekt gelöst: die letzte Kugel steht in der Mitte. */
export function isPerfect(state: SolitaireState): boolean {
  return isSolved(state) && state.cells[SOLITAIRE_CENTER]![SOLITAIRE_CENTER] === 'peg'
}
