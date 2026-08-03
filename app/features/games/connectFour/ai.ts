import {
  CONNECT_FOUR_EASY_BLUNDER_RATE,
  DEFAULT_AI_DIFFICULTY,
  type AiDifficulty,
} from '../shared/ai'
import type { ConnectFourAction, ConnectFourGameState } from './engine'

const COLUMN_COUNT = 7
const ROW_COUNT = 6
const WIN_LENGTH = 4
const CENTER_COLUMN = 3

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

export interface ConnectFourAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
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

function landingRow(cells: Array<Array<number | null>>, column: number): number | null {
  const row = cells[column]!.findIndex((cell) => cell === null)
  return row === -1 ? null : row
}

function wouldWin(
  cells: Array<Array<number | null>>,
  column: number,
  seat: number,
): boolean {
  const row = landingRow(cells, column)
  if (row === null) return false

  const nextCells = cells.map((col) => [...col])
  nextCells[column]![row] = seat
  return hasWinningLine(nextCells, column, row, seat)
}

function chooseHardAction(
  state: ConnectFourGameState,
  actions: ConnectFourAction[],
): ConnectFourAction {
  const seat = state.currentPlayerIndex
  const opponent = 1 - seat

  const winning = actions.find((action) => wouldWin(state.cells, action.column, seat))
  if (winning) return winning

  const blocking = actions.find((action) => wouldWin(state.cells, action.column, opponent))
  if (blocking) return blocking

  return [...actions].sort((first, second) => (
    Math.abs(first.column - CENTER_COLUMN) - Math.abs(second.column - CENTER_COLUMN)
    || first.column - second.column
  ))[0]!
}

export function chooseConnectFourAction(
  state: ConnectFourGameState,
  actions: ConnectFourAction[],
  options: ConnectFourAiOptions = {},
): ConnectFourAction | null {
  if (actions.length === 0) return null

  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  if (difficulty === 'easy' && actions.length > 1 && random() < CONNECT_FOUR_EASY_BLUNDER_RATE) {
    const randomIndex = Math.floor(random() * actions.length)
    return actions[Math.min(randomIndex, actions.length - 1)]!
  }

  return chooseHardAction(state, actions)
}
