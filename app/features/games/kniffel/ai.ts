import {
  DEFAULT_AI_DIFFICULTY,
  KNIFFEL_EASY_BLUNDER_RATE,
  KNIFFEL_MEDIUM_BLUNDER_RATE,
  type AiDifficulty,
} from '../shared/ai'
import type { KniffelAction, KniffelGameState } from './engine'
import { KNIFFEL_CATEGORIES, type KniffelCategory, scoreCategory } from './scoring'

const MAX_ROLLS = 3

const STRIKE_PRIORITY: readonly KniffelCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'threeOfKind',
  'fourOfKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'chance',
  'manyPips',
  'fewPips',
  'kniffel',
]

export interface KniffelAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

function chooseBestScore(
  availableCategories: KniffelCategory[],
  dice: number[],
): KniffelCategory | null {
  if (availableCategories.includes('kniffel') && scoreCategory('kniffel', dice) > 0) {
    return 'kniffel'
  }

  const bestCategory = availableCategories.reduce<{ category: KniffelCategory; score: number } | null>(
    (best, category) => {
      const score = scoreCategory(category, dice)
      return score > 0 && (best === null || score > best.score) ? { category, score } : best
    },
    null,
  )

  return bestCategory?.category ?? null
}

export function chooseKniffelAction(
  state: KniffelGameState,
  options: KniffelAiOptions = {},
): KniffelAction | null {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random

  if (state.rollsUsed < MAX_ROLLS) {
    return { type: 'roll' }
  }

  const scoreSheet = state.scoreSheets[state.currentPlayerIndex]
  const availableCategories = KNIFFEL_CATEGORIES.filter((category) => scoreSheet[category] === undefined)
  if (availableCategories.length === 0 || state.dice.length !== 5) return null

  const bestCategory = chooseBestScore(availableCategories, state.dice)

  if (bestCategory) {
    const blunderRate = (
      difficulty === 'easy' ? KNIFFEL_EASY_BLUNDER_RATE
        : difficulty === 'medium' ? KNIFFEL_MEDIUM_BLUNDER_RATE
          : 0
    )

    if (blunderRate > 0 && availableCategories.length > 1 && random() < blunderRate) {
      const randomIndex = Math.floor(random() * availableCategories.length)
      return {
        type: 'score',
        category: availableCategories[Math.min(randomIndex, availableCategories.length - 1)],
      }
    }
    return { type: 'score', category: bestCategory }
  }

  const strikeCategory = STRIKE_PRIORITY.find((category) => availableCategories.includes(category))
  return strikeCategory ? { type: 'score', category: strikeCategory } : null
}
