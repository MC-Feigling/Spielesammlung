export type KniffelCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'threeOfKind'
  | 'fourOfKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'kniffel'
  | 'chance'
  | 'manyPips'
  | 'fewPips'

export const KNIFFEL_CATEGORIES: readonly KniffelCategory[] = [
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
  'kniffel',
  'chance',
  'manyPips',
  'fewPips',
]

export const KNIFFEL_CATEGORY_LABELS: Record<KniffelCategory, string> = {
  ones: 'Einser',
  twos: 'Zweier',
  threes: 'Dreier',
  fours: 'Vierer',
  fives: 'Fünfer',
  sixes: 'Sechser',
  threeOfKind: 'Dreierpasch',
  fourOfKind: 'Viererpasch',
  fullHouse: 'Full House',
  smallStraight: 'Kleine Straße',
  largeStraight: 'Große Straße',
  kniffel: 'Kniffel',
  chance: 'Chance',
  manyPips: 'Viele Augen (≥25)',
  fewPips: 'Wenig Augen (≤10)',
}

export const UPPER_CATEGORIES: readonly KniffelCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
]

export const UPPER_BONUS_THRESHOLD = 63
export const UPPER_BONUS_POINTS = 35

export function upperSum(scoreSheet: Partial<Record<KniffelCategory, number>>): number {
  return UPPER_CATEGORIES.reduce((sum, category) => sum + (scoreSheet[category] ?? 0), 0)
}

export function upperBonus(scoreSheet: Partial<Record<KniffelCategory, number>>): number {
  return upperSum(scoreSheet) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0
}

export function totalScore(scoreSheet: Partial<Record<KniffelCategory, number>>): number {
  const categoryTotal = Object.values(scoreSheet).reduce((sum, score) => sum + (score ?? 0), 0)
  return categoryTotal + upperBonus(scoreSheet)
}

export type DiceRoll = readonly [number, number, number, number, number]

function validateDice(dice: readonly number[]): asserts dice is DiceRoll {
  if (dice.length !== 5) {
    throw new Error('Kniffel braucht fünf Würfel')
  }

  if (dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new Error('Kniffel enthält ungültige Augenzahlen')
  }
}

function sumDice(dice: DiceRoll) {
  return dice.reduce((sum, die) => sum + die, 0)
}

function countsByValue(dice: DiceRoll) {
  const counts = Array.from({ length: 6 }, () => 0)
  for (const die of dice) counts[die - 1] += 1
  return counts
}

function hasStraight(dice: DiceRoll, length: 4 | 5) {
  const values = new Set(dice)
  const straights = length === 4
    ? [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]]
    : [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]]

  return straights.some((straight) => straight.every((value) => values.has(value)))
}

export function scoreCategory(category: KniffelCategory, dice: readonly number[]): number {
  validateDice(dice)

  const total = sumDice(dice)
  const counts = countsByValue(dice)
  const upperCategoryIndex = KNIFFEL_CATEGORIES.indexOf(category)

  if (upperCategoryIndex >= 0 && upperCategoryIndex < 6) {
    return counts[upperCategoryIndex] * (upperCategoryIndex + 1)
  }

  switch (category) {
    case 'threeOfKind':
      return counts.some((count) => count >= 3) ? total : 0
    case 'fourOfKind':
      return counts.some((count) => count >= 4) ? total : 0
    case 'fullHouse':
      return counts.includes(2) && counts.includes(3) ? 25 : 0
    case 'smallStraight':
      return hasStraight(dice, 4) ? 30 : 0
    case 'largeStraight':
      return hasStraight(dice, 5) ? 40 : 0
    case 'kniffel':
      return counts.includes(5) ? 60 : 0
    case 'chance':
      return total
    case 'manyPips':
      return total >= 25 ? 40 : 0
    case 'fewPips':
      return total <= 10 ? 40 : 0
  }
}
