import {
  DEFAULT_AI_DIFFICULTY,
  MEMORY_EASY_FORGET_RATE,
  type AiDifficulty,
} from '../shared/ai'
import type { MemoryAction, MemoryGameState } from './engine'

export interface MemoryAi {
  observe: (state: MemoryGameState) => void
  chooseAction: (state: MemoryGameState) => MemoryAction | null
}

export interface MemoryAiOptions {
  random?: () => number
  difficulty?: AiDifficulty
}

export function createMemoryAi(options: MemoryAiOptions = {}): MemoryAi {
  const random = options.random ?? Math.random
  const difficulty = options.difficulty ?? DEFAULT_AI_DIFFICULTY
  const seenCards = new Map<number, Set<number>>()

  function observe(state: MemoryGameState) {
    for (const cardIndex of state.faceUpCardIndexes) {
      const pairId = state.cards[cardIndex]
      const indexes = seenCards.get(pairId) ?? new Set<number>()
      indexes.add(cardIndex)
      seenCards.set(pairId, indexes)
    }
  }

  function pickRandomFlip(availableIndexes: number[]): MemoryAction {
    const unseenIndexes = availableIndexes.filter((cardIndex) => (
      ![...seenCards.values()].some((indexes) => indexes.has(cardIndex))
    ))
    const randomIndexes = unseenIndexes.length > 0 ? unseenIndexes : availableIndexes
    const randomIndex = Math.floor(random() * randomIndexes.length)
    return { type: 'flip', cardIndex: randomIndexes[Math.min(randomIndex, randomIndexes.length - 1)] }
  }

  function shouldForgetKnownMatch(): boolean {
    return difficulty === 'easy' && random() < MEMORY_EASY_FORGET_RATE
  }

  function chooseAction(state: MemoryGameState): MemoryAction | null {
    observe(state)

    if (state.faceUpCardIndexes.length === 2) {
      return { type: 'resolveMismatch' }
    }

    const faceUpCardIndexes = new Set(state.faceUpCardIndexes)
    const matchedPairIds = new Set(state.matchedPairIds)
    const availableIndexes = state.cards.flatMap((pairId, cardIndex) => (
      matchedPairIds.has(pairId) || faceUpCardIndexes.has(cardIndex) ? [] : [cardIndex]
    ))

    if (availableIndexes.length === 0) return null

    const faceUpCardIndex = state.faceUpCardIndexes[0]
    if (faceUpCardIndex !== undefined) {
      const faceUpPairId = state.cards[faceUpCardIndex]
      const knownPartnerIndex = [...(seenCards.get(faceUpPairId) ?? [])]
        .find((cardIndex) => availableIndexes.includes(cardIndex))

      if (knownPartnerIndex !== undefined) {
        if (shouldForgetKnownMatch()) return pickRandomFlip(availableIndexes)
        return { type: 'flip', cardIndex: knownPartnerIndex }
      }
    }

    for (const [pairId, indexes] of seenCards) {
      if (matchedPairIds.has(pairId) || indexes.size < 2) continue

      const knownIndex = [...indexes].find((cardIndex) => availableIndexes.includes(cardIndex))
      if (knownIndex !== undefined) {
        if (shouldForgetKnownMatch()) return pickRandomFlip(availableIndexes)
        return { type: 'flip', cardIndex: knownIndex }
      }
    }

    return pickRandomFlip(availableIndexes)
  }

  return { observe, chooseAction }
}
