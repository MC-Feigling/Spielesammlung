import type { EngineResult, GameEngine } from '../shared/engine'

export type ConnectFourAction = { type: 'drop'; column: number }

export interface ConnectFourGameState {
  cells: Array<Array<number | null>>
  currentPlayerIndex: number
  lastMove: { column: number; row: number } | null
}

const COLUMN_COUNT = 7
const ROW_COUNT = 6
const WIN_LENGTH = 4

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

function createEmptyBoard(): Array<Array<number | null>> {
  return Array.from({ length: COLUMN_COUNT }, () =>
    Array.from({ length: ROW_COUNT }, () => null),
  )
}

function cloneState(state: ConnectFourGameState): ConnectFourGameState {
  return {
    cells: state.cells.map((column) => [...column]),
    currentPlayerIndex: state.currentPlayerIndex,
    lastMove: state.lastMove === null ? null : { ...state.lastMove },
  }
}

function isColumnFull(cells: Array<Array<number | null>>, column: number): boolean {
  return cells[column]![ROW_COUNT - 1] !== null
}

function countInDirection(
  cells: Array<Array<number | null>>,
  column: number,
  row: number,
  seat: number,
  deltaColumn: number,
  deltaRow: number,
): number {
  let count = 0
  let nextColumn = column + deltaColumn
  let nextRow = row + deltaRow

  while (
    nextColumn >= 0
    && nextColumn < COLUMN_COUNT
    && nextRow >= 0
    && nextRow < ROW_COUNT
    && cells[nextColumn]![nextRow] === seat
  ) {
    count += 1
    nextColumn += deltaColumn
    nextRow += deltaRow
  }

  return count
}

function hasWinningLine(
  cells: Array<Array<number | null>>,
  column: number,
  row: number,
  seat: number,
): boolean {
  for (const [deltaColumn, deltaRow] of DIRECTIONS) {
    const total = 1
      + countInDirection(cells, column, row, seat, deltaColumn, deltaRow)
      + countInDirection(cells, column, row, seat, -deltaColumn, -deltaRow)

    if (total >= WIN_LENGTH) {
      return true
    }
  }

  return false
}

function isBoardFull(cells: Array<Array<number | null>>): boolean {
  return cells.every((column) => column[ROW_COUNT - 1] !== null)
}

export function createConnectFourGame(): GameEngine<ConnectFourGameState, ConnectFourAction> {
  let state: ConnectFourGameState = {
    cells: createEmptyBoard(),
    currentPlayerIndex: 0,
    lastMove: null,
  }
  let winnerSeatIndexes: number[] = []

  function isTerminal(): boolean {
    return winnerSeatIndexes.length > 0
  }

  function result(): EngineResult<ConnectFourGameState> {
    return {
      state: cloneState(state),
      winnerSeatIndexes: [...winnerSeatIndexes],
    }
  }

  function getValidActions(): ConnectFourAction[] {
    if (isTerminal()) return []

    return Array.from({ length: COLUMN_COUNT }, (_, column) => column)
      .filter((column) => !isColumnFull(state.cells, column))
      .map((column) => ({ type: 'drop' as const, column }))
  }

  function applyAction(action: ConnectFourAction): EngineResult<ConnectFourGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }

    if (action.type !== 'drop') {
      throw new Error('Ungültige Aktion')
    }

    if (!Number.isInteger(action.column) || action.column < 0 || action.column >= COLUMN_COUNT) {
      throw new Error('Ungültige Spalte')
    }

    if (isColumnFull(state.cells, action.column)) {
      throw new Error('Spalte ist voll')
    }

    const row = state.cells[action.column]!.findIndex((cell) => cell === null)
    if (row === -1) {
      throw new Error('Spalte ist voll')
    }

    const cells = state.cells.map((column) => [...column])
    const seat = state.currentPlayerIndex
    cells[action.column]![row] = seat

    const lastMove = { column: action.column, row }

    if (hasWinningLine(cells, action.column, row, seat)) {
      winnerSeatIndexes = [seat]
      state = {
        cells,
        currentPlayerIndex: seat,
        lastMove,
      }
      return result()
    }

    if (isBoardFull(cells)) {
      winnerSeatIndexes = [0, 1]
      state = {
        cells,
        currentPlayerIndex: seat,
        lastMove,
      }
      return result()
    }

    state = {
      cells,
      currentPlayerIndex: 1 - seat,
      lastMove,
    }
    return result()
  }

  return {
    getState: () => cloneState(state),
    getValidActions,
    applyAction,
    isTerminal,
  }
}
