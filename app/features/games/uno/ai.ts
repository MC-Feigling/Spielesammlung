import {
  DEFAULT_AI_DIFFICULTY,
  UNO_EASY_BLUNDER_RATE,
  type AiDifficulty,
} from '../shared/ai'
import type { UnoAction, UnoCard, UnoColor, UnoGameState, UnoRank } from './engine'

export interface UnoAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

type UnoPlayAction = Extract<UnoAction, { type: 'play' }>

const COLORS: readonly UnoColor[] = ['red', 'yellow', 'green', 'blue']

function isWildCard(card: UnoCard): boolean {
  return card.rank === 'wild' || card.rank === 'wildDrawFour'
}

function findCard(hand: UnoCard[], cardId: string): UnoCard | undefined {
  return hand.find((card) => card.id === cardId)
}

function mostCommonColor(hand: UnoCard[]): UnoColor {
  const counts: Record<UnoColor, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  }

  for (const card of hand) {
    if (card.color === 'wild') continue
    counts[card.color] += 1
  }

  let bestColor: UnoColor = COLORS[0]
  let bestCount = -1

  for (const color of COLORS) {
    if (counts[color] > bestCount) {
      bestCount = counts[color]
      bestColor = color
    }
  }

  return bestColor
}

function blockScore(rank: UnoRank): number {
  switch (rank) {
    case 'wildDrawFour':
      return 300
    case 'drawTwo':
      return 200
    case 'skip':
      return 150
    case 'reverse':
      return 50
    default:
      return 0
  }
}

function scorePlay(
  state: UnoGameState,
  action: UnoPlayAction,
  card: UnoCard,
  preferredColor: UnoColor,
): number {
  let score = blockScore(card.rank)

  if (!isWildCard(card)) {
    if (card.color === preferredColor) score += 40
    else if (card.color === state.currentColor) score += 20
  }

  if (action.chosenColor !== undefined) {
    if (action.chosenColor === preferredColor) score += 100
    else score -= 50
  }

  return score
}

function chooseOptimalAction(state: UnoGameState, actions: UnoAction[]): UnoAction {
  const hand = state.hands[state.currentPlayerIndex] ?? []
  const preferredColor = mostCommonColor(hand)

  const playActions = actions.filter((action): action is UnoPlayAction => action.type === 'play')
  const drawAction = actions.find((action) => action.type === 'draw')

  if (playActions.length === 0) {
    return drawAction ?? actions[0]!
  }

  // Hard always stacks when a stack-continue play exists.
  if (state.pendingDrawCount > 0) {
    const stackPlays = playActions
    const bestStack = pickBestPlay(state, stackPlays, hand, preferredColor)
    if (bestStack) return bestStack
  }

  const coloredPlays = playActions.filter((action) => {
    const card = findCard(hand, action.cardId)
    return card !== undefined && !isWildCard(card)
  })

  const candidates = coloredPlays.length > 0 ? coloredPlays : playActions
  return pickBestPlay(state, candidates, hand, preferredColor) ?? candidates[0]!
}

function pickBestPlay(
  state: UnoGameState,
  plays: UnoPlayAction[],
  hand: UnoCard[],
  preferredColor: UnoColor,
): UnoPlayAction | null {
  if (plays.length === 0) return null

  let best: UnoPlayAction = plays[0]!
  let bestScore = Number.NEGATIVE_INFINITY

  for (const action of plays) {
    const card = findCard(hand, action.cardId)
    if (!card) continue

    const score = scorePlay(state, action, card, preferredColor)
    if (score > bestScore) {
      bestScore = score
      best = action
    }
  }

  return best
}

function pickRandomAction(actions: UnoAction[], random: () => number): UnoAction {
  const randomIndex = Math.floor(random() * actions.length)
  return actions[Math.min(randomIndex, actions.length - 1)]!
}

export function chooseUnoAction(
  state: UnoGameState,
  actions: UnoAction[],
  options: UnoAiOptions = {},
): UnoAction | null {
  if (actions.length === 0) return null

  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  const optimal = chooseOptimalAction(state, actions)

  if (difficulty === 'easy' && actions.length > 1 && random() < UNO_EASY_BLUNDER_RATE) {
    return pickRandomAction(actions, random)
  }

  return optimal
}
