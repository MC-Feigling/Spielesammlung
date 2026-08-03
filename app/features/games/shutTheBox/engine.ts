import type { EngineResult, GameEngine } from '../shared/engine'
import { legalCloses, remainingSum } from './combos'

export type ShutTheBoxAction =
  | { type: 'roll' }
  | { type: 'close'; numbers: number[] }

export type ShutTheBoxPhase = 'awaitingRoll' | 'awaitingClose'

export interface ShutTheBoxPlayerBox {
  open: boolean[]
  score: number | null
}

export interface ShutTheBoxGameState {
  currentPlayerIndex: number
  phase: ShutTheBoxPhase
  dice: number[]
  boxes: ShutTheBoxPlayerBox[]
}

export interface ShutTheBoxGameOptions {
  playerCount: number
  random?: () => number
}

const MIN_PLAYER_COUNT = 2
const MAX_PLAYER_COUNT = 4
const TILE_COUNT = 9
const DICE_COUNT = 2

function createEmptyBox(): ShutTheBoxPlayerBox {
  return {
    open: Array.from({ length: TILE_COUNT }, () => true),
    score: null,
  }
}

function cloneBox(box: ShutTheBoxPlayerBox): ShutTheBoxPlayerBox {
  return {
    open: [...box.open],
    score: box.score,
  }
}

function cloneState(state: ShutTheBoxGameState): ShutTheBoxGameState {
  return {
    currentPlayerIndex: state.currentPlayerIndex,
    phase: state.phase,
    dice: [...state.dice],
    boxes: state.boxes.map(cloneBox),
  }
}

function rollDie(random: () => number): number {
  return Math.min(6, Math.max(1, Math.floor(random() * 6) + 1))
}

function sortedNumbers(numbers: number[]): number[] {
  return [...numbers].sort((left, right) => left - right)
}

function sameNumberList(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export function createShutTheBoxGame(
  options: ShutTheBoxGameOptions,
): GameEngine<ShutTheBoxGameState, ShutTheBoxAction> {
  if (
    !Number.isInteger(options.playerCount)
    || options.playerCount < MIN_PLAYER_COUNT
    || options.playerCount > MAX_PLAYER_COUNT
  ) {
    throw new Error('Shut the Box braucht zwei bis vier Spieler')
  }

  const random = options.random ?? Math.random
  let state: ShutTheBoxGameState = {
    currentPlayerIndex: 0,
    phase: 'awaitingRoll',
    dice: [],
    boxes: Array.from({ length: options.playerCount }, () => createEmptyBox()),
  }

  function isTerminal(): boolean {
    return state.boxes.every((box) => box.score !== null)
  }

  function winnerSeatIndexes(): number[] {
    if (!isTerminal()) return []

    const scores = state.boxes.map((box) => box.score!)
    const lowestScore = Math.min(...scores)
    return scores.flatMap((score, index) => (score === lowestScore ? [index] : []))
  }

  function result(): EngineResult<ShutTheBoxGameState> {
    return { state: cloneState(state), winnerSeatIndexes: winnerSeatIndexes() }
  }

  function currentBox(): ShutTheBoxPlayerBox {
    return state.boxes[state.currentPlayerIndex]!
  }

  function diceSum(): number {
    return state.dice[0]! + state.dice[1]!
  }

  function getValidActions(): ShutTheBoxAction[] {
    if (isTerminal()) return []

    if (state.phase === 'awaitingRoll') {
      return [{ type: 'roll' }]
    }

    return legalCloses(currentBox().open, diceSum()).map((numbers) => ({
      type: 'close' as const,
      numbers,
    }))
  }

  function endTurn(score: number): void {
    const boxes = state.boxes.map((box, index) => (
      index === state.currentPlayerIndex
        ? { open: [...box.open], score }
        : cloneBox(box)
    ))

    state = {
      currentPlayerIndex: (state.currentPlayerIndex + 1) % options.playerCount,
      phase: 'awaitingRoll',
      dice: [],
      boxes,
    }
  }

  function isValidAction(action: ShutTheBoxAction): boolean {
    return getValidActions().some((validAction) => {
      if (validAction.type !== action.type) return false
      if (action.type === 'roll') return true
      if (validAction.type !== 'close') return false
      return sameNumberList(validAction.numbers, sortedNumbers(action.numbers))
    })
  }

  function applyAction(action: ShutTheBoxAction): EngineResult<ShutTheBoxGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }

    if (!isValidAction(action)) {
      if (action.type === 'roll' && state.phase === 'awaitingClose') {
        throw new Error('Diese Aktion ist nicht erlaubt')
      }
      if (action.type === 'close' && state.phase === 'awaitingRoll') {
        throw new Error('Diese Aktion ist nicht erlaubt')
      }
      if (action.type === 'close') {
        throw new Error('Diese Kombination ist ungültig')
      }
      throw new Error('Diese Aktion ist nicht erlaubt')
    }

    if (action.type === 'roll') {
      const dice = Array.from({ length: DICE_COUNT }, () => rollDie(random))
      const closes = legalCloses(currentBox().open, dice[0]! + dice[1]!)

      if (closes.length === 0) {
        endTurn(remainingSum(currentBox().open))
        return result()
      }

      state = {
        ...state,
        dice,
        phase: 'awaitingClose',
      }
      return result()
    }

    const numbers = sortedNumbers(action.numbers)
    const open = [...currentBox().open]
    for (const number of numbers) {
      open[number - 1] = false
    }

    const boxes = state.boxes.map((box, index) => (
      index === state.currentPlayerIndex
        ? { open, score: box.score }
        : cloneBox(box)
    ))

    if (open.every((tile) => !tile)) {
      state = { ...state, boxes }
      endTurn(0)
      return result()
    }

    state = {
      ...state,
      boxes,
      dice: [],
      phase: 'awaitingRoll',
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
