import type { EngineResult, GameEngine } from '../shared/engine'
import { KNIFFEL_CATEGORIES, type KniffelCategory, scoreCategory, totalScore } from './scoring'

export type KniffelAction =
  | { type: 'roll' }
  | { type: 'toggleHold'; dieIndex: number }
  | { type: 'score'; category: KniffelCategory }

export type KniffelScoreSheet = Partial<Record<KniffelCategory, number>>

export interface KniffelGameOptions {
  playerCount: number
  random?: () => number
}

export interface KniffelGameState {
  currentPlayerIndex: number
  dice: number[]
  heldDice: boolean[]
  rollsUsed: number
  scoreSheets: KniffelScoreSheet[]
}

const MIN_PLAYER_COUNT = 2
const MAX_PLAYER_COUNT = 4
const MAX_ROLLS = 3
const DICE_COUNT = 5

function cloneState(state: KniffelGameState): KniffelGameState {
  return {
    ...state,
    dice: [...state.dice],
    heldDice: [...state.heldDice],
    scoreSheets: state.scoreSheets.map((scoreSheet) => ({ ...scoreSheet })),
  }
}

function rollDie(random: () => number) {
  return Math.min(6, Math.max(1, Math.floor(random() * 6) + 1))
}

export function createKniffelGame(options: KniffelGameOptions): GameEngine<KniffelGameState, KniffelAction> {
  if (!Number.isInteger(options.playerCount) || options.playerCount < MIN_PLAYER_COUNT || options.playerCount > MAX_PLAYER_COUNT) {
    throw new Error('Kniffel braucht zwei bis vier Spieler')
  }

  const random = options.random ?? Math.random
  let state: KniffelGameState = {
    currentPlayerIndex: 0,
    dice: [],
    heldDice: Array.from({ length: DICE_COUNT }, () => false),
    rollsUsed: 0,
    scoreSheets: Array.from({ length: options.playerCount }, () => ({})),
  }

  function isTerminal() {
    return state.scoreSheets.every((scoreSheet) => KNIFFEL_CATEGORIES.every((category) => scoreSheet[category] !== undefined))
  }

  function winnerSeatIndexes() {
    if (!isTerminal()) return []

    const totals = state.scoreSheets.map((scoreSheet) => totalScore(scoreSheet))
    const highestTotal = Math.max(...totals)
    return totals.flatMap((total, index) => total === highestTotal ? [index] : [])
  }

  function result(): EngineResult<KniffelGameState> {
    return { state: cloneState(state), winnerSeatIndexes: winnerSeatIndexes() }
  }

  function getValidActions(): KniffelAction[] {
    if (isTerminal()) return []

    const scoreSheet = state.scoreSheets[state.currentPlayerIndex]
    const categoryActions = state.rollsUsed > 0
      ? KNIFFEL_CATEGORIES.flatMap((category) => scoreSheet[category] === undefined ? [{ type: 'score' as const, category }] : [])
      : []
    const holdActions = state.rollsUsed > 0 && state.rollsUsed < MAX_ROLLS
      ? state.dice.map((_, dieIndex) => ({ type: 'toggleHold' as const, dieIndex }))
      : []
    const rollActions = state.rollsUsed < MAX_ROLLS ? [{ type: 'roll' as const }] : []

    return [...rollActions, ...holdActions, ...categoryActions]
  }

  function applyAction(action: KniffelAction): EngineResult<KniffelGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }

    const isValidAction = getValidActions().some((validAction) => (
      validAction.type === action.type
      && (action.type !== 'toggleHold' || (validAction.type === 'toggleHold' && validAction.dieIndex === action.dieIndex))
      && (action.type !== 'score' || (validAction.type === 'score' && validAction.category === action.category))
    ))

    if (!isValidAction) {
      if (action.type === 'score' && state.rollsUsed === 0) {
        throw new Error('Du musst mindestens einmal würfeln')
      }
      if (action.type === 'score' && state.scoreSheets[state.currentPlayerIndex][action.category] !== undefined) {
        throw new Error('Diese Kategorie wurde bereits gewertet')
      }
      throw new Error('Diese Aktion ist nicht erlaubt')
    }

    if (action.type === 'roll') {
      const dice = Array.from({ length: DICE_COUNT }, (_, dieIndex) => (
        state.heldDice[dieIndex] && state.dice[dieIndex] !== undefined
          ? state.dice[dieIndex]
          : rollDie(random)
      ))
      state = { ...state, dice, rollsUsed: state.rollsUsed + 1 }
      return result()
    }

    if (action.type === 'toggleHold') {
      const heldDice = [...state.heldDice]
      heldDice[action.dieIndex] = !heldDice[action.dieIndex]
      state = { ...state, heldDice }
      return result()
    }

    const scoreSheets = state.scoreSheets.map((scoreSheet, playerIndex) => (
      playerIndex === state.currentPlayerIndex
        ? { ...scoreSheet, [action.category]: scoreCategory(action.category, state.dice) }
        : scoreSheet
    ))
    state = {
      currentPlayerIndex: (state.currentPlayerIndex + 1) % options.playerCount,
      dice: [],
      heldDice: Array.from({ length: DICE_COUNT }, () => false),
      rollsUsed: 0,
      scoreSheets,
    }
    return result()
  }

  return { getState: () => cloneState(state), getValidActions, applyAction, isTerminal }
}
