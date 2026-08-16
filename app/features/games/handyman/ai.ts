import {
  DEFAULT_AI_DIFFICULTY,
  type AiDifficulty,
} from '../shared/ai'
import type { HandymanJob, PartId, ToolId } from './catalog'

export const HANDYMAN_EASY_BLUNDER_RATE = 0.4
export const HANDYMAN_MEDIUM_BLUNDER_RATE = 0.2
export const HANDYMAN_HARD_BLUNDER_RATE = 0.05

export interface HandymanAiOptions {
  difficulty?: AiDifficulty
  random?: () => number
}

function blunderRateFor(difficulty: AiDifficulty): number {
  if (difficulty === 'easy') return HANDYMAN_EASY_BLUNDER_RATE
  if (difficulty === 'medium') return HANDYMAN_MEDIUM_BLUNDER_RATE
  return HANDYMAN_HARD_BLUNDER_RATE
}

function pickFrom<T>(items: readonly T[], random: () => number): T {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length))
  return items[index]!
}

function chooseWithBlunder<T extends string>(
  correctId: T,
  options: readonly T[],
  difficulty: AiDifficulty,
  random: () => number,
): T {
  if (options.length === 0) {
    throw new Error('Handyman AI needs at least one choice')
  }

  const incorrect = options.filter((id) => id !== correctId)
  if (incorrect.length > 0 && random() < blunderRateFor(difficulty)) {
    return pickFrom(incorrect, random)
  }

  if (options.includes(correctId)) {
    return correctId
  }

  return pickFrom(options, random)
}

export function chooseHandymanTool(
  job: HandymanJob,
  tools: ToolId[],
  options: HandymanAiOptions = {},
): ToolId {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random
  return chooseWithBlunder(job.toolId, tools, difficulty, random)
}

export function chooseHandymanPart(
  job: HandymanJob,
  parts: PartId[],
  options: HandymanAiOptions = {},
): PartId {
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const random = options.random ?? Math.random
  return chooseWithBlunder(job.partId, parts, difficulty, random)
}
