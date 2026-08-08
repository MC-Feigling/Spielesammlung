import { DEFAULT_AI_DIFFICULTY, type AiDifficulty } from '../shared/ai'
import { isPuzzleSolved } from './engine'

/** Chance that easy Puzzle Race AI swaps two random tiles. */
export const PUZZLE_RACE_EASY_BLUNDER_RATE = 0.45

/** Chance that medium Puzzle Race AI swaps two random tiles. */
export const PUZZLE_RACE_MEDIUM_BLUNDER_RATE = 0.22

/** Chance that hard Puzzle Race AI swaps two random tiles. */
export const PUZZLE_RACE_HARD_BLUNDER_RATE = 0.05

export const PUZZLE_RACE_MOVE_INTERVAL_MS: Record<AiDifficulty, number> = {
  easy: 1200,
  medium: 700,
  hard: 350,
}

export const PUZZLE_RACE_AI_STAGGER_MS = 80

function blunderRate(difficulty: AiDifficulty): number {
  if (difficulty === 'easy') return PUZZLE_RACE_EASY_BLUNDER_RATE
  if (difficulty === 'medium') return PUZZLE_RACE_MEDIUM_BLUNDER_RATE
  return PUZZLE_RACE_HARD_BLUNDER_RATE
}

function pickWrongIndex(tiles: readonly number[], random: () => number): number | null {
  const wrongIndexes: number[] = []
  for (let index = 0; index < tiles.length; index += 1) {
    if (tiles[index] !== index) wrongIndexes.push(index)
  }
  if (wrongIndexes.length === 0) return null
  return wrongIndexes[Math.floor(random() * wrongIndexes.length)] ?? null
}

function pickRandomDistinctPair(
  tileCount: number,
  random: () => number,
): { a: number; b: number } | null {
  if (tileCount < 2) return null
  const a = Math.floor(random() * tileCount)
  let b = Math.floor(random() * tileCount)
  let guard = 0
  while (b === a && guard < 16) {
    b = Math.floor(random() * tileCount)
    guard += 1
  }
  if (b === a) {
    b = (a + 1) % tileCount
  }
  return { a, b }
}

export function choosePuzzleRaceSwap(
  tiles: readonly number[],
  options?: {
    difficulty?: AiDifficulty
    random?: () => number
  },
): { a: number; b: number } | null {
  if (isPuzzleSolved(tiles)) return null

  const difficulty = options?.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options?.random ?? Math.random

  if (random() < blunderRate(difficulty)) {
    return pickRandomDistinctPair(tiles.length, random)
  }

  const wrongIndex = pickWrongIndex(tiles, random)
  if (wrongIndex === null) return null

  const correctIndex = tiles[wrongIndex]!
  if (correctIndex === wrongIndex) return null

  return { a: wrongIndex, b: correctIndex }
}
