import type { EngineResult, GameEngine } from '../shared/engine'
import {
  MUEHLE_ADJACENCY,
  MUEHLE_POINT_COUNT,
  MUEHLE_STONES_PER_PLAYER,
  areAdjacent,
  canRemove,
  countStones,
  formsMill,
  isValidPoint,
  removableOpponentPoints,
} from './board'

export type MuehlePhase = 'placing' | 'moving' | 'removing'

export type MuehleAction =
  | { type: 'place'; point: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'remove'; point: number }

export interface MuehleGameState {
  points: Array<number | null>
  stonesToPlace: [number, number]
  phase: MuehlePhase
  currentPlayerIndex: number
  lastAction: MuehleAction | null
}

function cloneState(state: MuehleGameState): MuehleGameState {
  return {
    points: [...state.points],
    stonesToPlace: [state.stonesToPlace[0], state.stonesToPlace[1]],
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    lastAction: state.lastAction === null ? null : { ...state.lastAction },
  }
}

function opponentOf(seat: number): number {
  return 1 - seat
}

function mayFly(points: ReadonlyArray<number | null>, seat: number): boolean {
  return countStones(points, seat) === 3
}

function listMoveActions(
  points: ReadonlyArray<number | null>,
  seat: number,
): Array<Extract<MuehleAction, { type: 'move' }>> {
  const actions: Array<Extract<MuehleAction, { type: 'move' }>> = []
  const fly = mayFly(points, seat)

  for (let from = 0; from < MUEHLE_POINT_COUNT; from += 1) {
    if (points[from] !== seat) continue

    if (fly) {
      for (let to = 0; to < MUEHLE_POINT_COUNT; to += 1) {
        if (points[to] === null) {
          actions.push({ type: 'move', from, to })
        }
      }
      continue
    }

    for (const to of MUEHLE_ADJACENCY[from]!) {
      if (points[to] === null) {
        actions.push({ type: 'move', from, to })
      }
    }
  }

  return actions
}

function resolvePhaseAfterTurn(
  stonesToPlace: [number, number],
): Exclude<MuehlePhase, 'removing'> {
  return stonesToPlace[0] === 0 && stonesToPlace[1] === 0 ? 'moving' : 'placing'
}

export function createMuehleGame(): GameEngine<MuehleGameState, MuehleAction> {
  let state: MuehleGameState = {
    points: Array.from({ length: MUEHLE_POINT_COUNT }, () => null),
    stonesToPlace: [MUEHLE_STONES_PER_PLAYER, MUEHLE_STONES_PER_PLAYER],
    phase: 'placing',
    currentPlayerIndex: 0,
    lastAction: null,
  }
  let winnerSeatIndexes: number[] = []

  function isTerminal(): boolean {
    return winnerSeatIndexes.length > 0
  }

  function result(): EngineResult<MuehleGameState> {
    return {
      state: cloneState(state),
      winnerSeatIndexes: [...winnerSeatIndexes],
    }
  }

  function finishWithWinner(seat: number) {
    winnerSeatIndexes = [seat]
  }

  function passToOpponentAfterNonRemoval() {
    const nextPhase = resolvePhaseAfterTurn(state.stonesToPlace)
    state.phase = nextPhase

    if (nextPhase === 'placing') {
      let next = opponentOf(state.currentPlayerIndex)
      if (state.stonesToPlace[next]! <= 0) {
        next = opponentOf(next)
      }
      state.currentPlayerIndex = next
      return
    }

    state.currentPlayerIndex = opponentOf(state.currentPlayerIndex)
    if (listMoveActions(state.points, state.currentPlayerIndex).length === 0) {
      finishWithWinner(opponentOf(state.currentPlayerIndex))
    }
  }

  function enterMovingOrPlacingAfterRemoval() {
    const millMaker = state.currentPlayerIndex
    const nextPhase = resolvePhaseAfterTurn(state.stonesToPlace)
    state.phase = nextPhase

    if (nextPhase === 'placing') {
      let next = opponentOf(millMaker)
      if (state.stonesToPlace[next]! <= 0) {
        next = opponentOf(next)
      }
      state.currentPlayerIndex = next
      return
    }

    state.currentPlayerIndex = opponentOf(millMaker)
    if (listMoveActions(state.points, state.currentPlayerIndex).length === 0) {
      finishWithWinner(millMaker)
    }
  }

  function getValidActions(): MuehleAction[] {
    if (isTerminal()) return []

    const seat = state.currentPlayerIndex

    if (state.phase === 'placing') {
      if (state.stonesToPlace[seat]! <= 0) return []
      return state.points
        .map((owner, point) => (owner === null ? point : -1))
        .filter((point) => point >= 0)
        .map((point) => ({ type: 'place' as const, point }))
    }

    if (state.phase === 'removing') {
      return removableOpponentPoints(state.points, opponentOf(seat))
        .map((point) => ({ type: 'remove' as const, point }))
    }

    return listMoveActions(state.points, seat)
  }

  function applyPlace(point: number): EngineResult<MuehleGameState> {
    const seat = state.currentPlayerIndex

    if (state.phase !== 'placing') {
      throw new Error('Jetzt darf nicht gesetzt werden')
    }
    if (state.stonesToPlace[seat]! <= 0) {
      throw new Error('Keine Steine mehr zum Setzen')
    }
    if (!isValidPoint(point)) {
      throw new Error('Ungültiger Punkt')
    }
    if (state.points[point] !== null) {
      throw new Error('Punkt ist belegt')
    }

    const nextPoints = [...state.points]
    nextPoints[point] = seat
    const nextStones: [number, number] = [state.stonesToPlace[0], state.stonesToPlace[1]]
    nextStones[seat] = nextStones[seat]! - 1

    state = {
      points: nextPoints,
      stonesToPlace: nextStones,
      phase: state.phase,
      currentPlayerIndex: seat,
      lastAction: { type: 'place', point },
    }

    if (formsMill(state.points, point, seat)) {
      state.phase = 'removing'
      return result()
    }

    passToOpponentAfterNonRemoval()
    return result()
  }

  function applyMove(from: number, to: number): EngineResult<MuehleGameState> {
    const seat = state.currentPlayerIndex

    if (state.phase !== 'moving') {
      throw new Error('Jetzt darf nicht gezogen werden')
    }
    if (!isValidPoint(from) || !isValidPoint(to)) {
      throw new Error('Ungültiger Punkt')
    }
    if (state.points[from] !== seat) {
      throw new Error('Kein eigener Stein')
    }
    if (state.points[to] !== null) {
      throw new Error('Punkt ist belegt')
    }
    if (!mayFly(state.points, seat) && !areAdjacent(from, to)) {
      throw new Error('Kein Nachbarfeld')
    }

    const nextPoints = [...state.points]
    nextPoints[from] = null
    nextPoints[to] = seat

    state = {
      ...state,
      points: nextPoints,
      lastAction: { type: 'move', from, to },
    }

    if (formsMill(state.points, to, seat)) {
      state.phase = 'removing'
      return result()
    }

    state.currentPlayerIndex = opponentOf(seat)
    if (listMoveActions(state.points, state.currentPlayerIndex).length === 0) {
      finishWithWinner(seat)
    }

    return result()
  }

  function applyRemove(point: number): EngineResult<MuehleGameState> {
    const seat = state.currentPlayerIndex
    const opponent = opponentOf(seat)

    if (state.phase !== 'removing') {
      throw new Error('Jetzt darf kein Stein entfernt werden')
    }
    if (!isValidPoint(point)) {
      throw new Error('Ungültiger Punkt')
    }
    if (state.points[point] !== opponent) {
      throw new Error('Kein Gegnerstein')
    }
    if (!canRemove(state.points, point, opponent)) {
      throw new Error('Stein steht in einer Mühle')
    }

    const nextPoints = [...state.points]
    nextPoints[point] = null

    state = {
      ...state,
      points: nextPoints,
      lastAction: { type: 'remove', point },
    }

    if (countStones(state.points, opponent) < 3 && state.stonesToPlace[opponent] === 0) {
      finishWithWinner(seat)
      state.phase = resolvePhaseAfterTurn(state.stonesToPlace)
      return result()
    }

    enterMovingOrPlacingAfterRemoval()
    return result()
  }

  function applyAction(action: MuehleAction): EngineResult<MuehleGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }

    if (action.type === 'place') return applyPlace(action.point)
    if (action.type === 'move') return applyMove(action.from, action.to)
    return applyRemove(action.point)
  }

  return {
    getState: () => cloneState(state),
    getValidActions,
    applyAction,
    isTerminal,
  }
}
