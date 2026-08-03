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

export function chooseKniffelAction(state: KniffelGameState): KniffelAction | null {
  if (state.rollsUsed < MAX_ROLLS) {
    return { type: 'roll' }
  }

  const scoreSheet = state.scoreSheets[state.currentPlayerIndex]
  const availableCategories = KNIFFEL_CATEGORIES.filter((category) => scoreSheet[category] === undefined)
  if (availableCategories.length === 0 || state.dice.length !== 5) return null

  if (availableCategories.includes('kniffel') && scoreCategory('kniffel', state.dice) > 0) {
    return { type: 'score', category: 'kniffel' }
  }

  const bestCategory = availableCategories.reduce<{ category: KniffelCategory; score: number } | null>(
    (best, category) => {
      const score = scoreCategory(category, state.dice)
      return score > 0 && (best === null || score > best.score) ? { category, score } : best
    },
    null,
  )
  if (bestCategory) return { type: 'score', category: bestCategory.category }

  const strikeCategory = STRIKE_PRIORITY.find((category) => availableCategories.includes(category))
  return strikeCategory ? { type: 'score', category: strikeCategory } : null
}
