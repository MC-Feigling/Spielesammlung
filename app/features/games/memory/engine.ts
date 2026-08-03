import type { EngineResult, GameEngine } from '../shared/engine'

export type MemoryAction =
  | { type: 'flip'; cardIndex: number }
  | { type: 'resolveMismatch' }

export interface MemoryGameOptions {
  playerCount: number
  rows: number
  cols: number
  seed?: number
  deck?: number[]
}

export interface MemoryGameState {
  rows: number
  cols: number
  cards: number[]
  currentPlayerIndex: number
  faceUpCardIndexes: number[]
  matchedPairIds: number[]
  matchedPairCounts: number[]
}

const MIN_PLAYER_COUNT = 2
const MAX_PLAYER_COUNT = 4

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0

  return () => {
    value += 0x6D2B79F5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296
  }
}

function shuffle(values: number[], random: () => number): number[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

function createDeck(cellCount: number, seed?: number): number[] {
  const pairs = Array.from({ length: cellCount / 2 }, (_, pairId) => [pairId, pairId]).flat()
  return shuffle(pairs, createSeededRandom(seed ?? Date.now()))
}

function validateDeck(deck: readonly number[], cellCount: number) {
  if (deck.length !== cellCount) {
    throw new Error('Das Kartendeck passt nicht zur Rastergröße')
  }

  const counts = new Map<number, number>()

  for (const pairId of deck) {
    if (!Number.isInteger(pairId) || pairId < 0) {
      throw new Error('Das Kartendeck enthält ungültige Karten')
    }

    counts.set(pairId, (counts.get(pairId) ?? 0) + 1)
  }

  if ([...counts.values()].some((count) => count !== 2)) {
    throw new Error('Jede Karte muss genau ein Paar haben')
  }
}

function cloneState(state: MemoryGameState): MemoryGameState {
  return {
    ...state,
    cards: [...state.cards],
    faceUpCardIndexes: [...state.faceUpCardIndexes],
    matchedPairIds: [...state.matchedPairIds],
    matchedPairCounts: [...state.matchedPairCounts],
  }
}

export function createMemoryGame(options: MemoryGameOptions): GameEngine<MemoryGameState, MemoryAction> {
  const cellCount = options.rows * options.cols

  if (!Number.isInteger(options.playerCount) || options.playerCount < MIN_PLAYER_COUNT || options.playerCount > MAX_PLAYER_COUNT) {
    throw new Error('Memory braucht zwei bis vier Spieler')
  }

  if (!Number.isInteger(options.rows) || !Number.isInteger(options.cols) || options.rows < 1 || options.cols < 1 || cellCount % 2 !== 0) {
    throw new Error('Das Raster braucht eine gerade Anzahl Karten')
  }

  const cards = options.deck ? [...options.deck] : createDeck(cellCount, options.seed)
  validateDeck(cards, cellCount)

  let state: MemoryGameState = {
    rows: options.rows,
    cols: options.cols,
    cards,
    currentPlayerIndex: 0,
    faceUpCardIndexes: [],
    matchedPairIds: [],
    matchedPairCounts: Array.from({ length: options.playerCount }, () => 0),
  }

  function isTerminal() {
    return state.matchedPairIds.length === cellCount / 2
  }

  function winnerSeatIndexes(): number[] {
    if (!isTerminal()) return []

    const highestScore = Math.max(...state.matchedPairCounts)
    return state.matchedPairCounts
      .map((score, index) => score === highestScore ? index : -1)
      .filter((index) => index >= 0)
  }

  function result(): EngineResult<MemoryGameState> {
    return {
      state: cloneState(state),
      winnerSeatIndexes: winnerSeatIndexes(),
    }
  }

  function getValidActions(): MemoryAction[] {
    if (isTerminal()) return []

    if (state.faceUpCardIndexes.length === 2) {
      return [{ type: 'resolveMismatch' }]
    }

    const matchedCardIndexes = new Set(
      state.cards.flatMap((pairId, cardIndex) => state.matchedPairIds.includes(pairId) ? [cardIndex] : []),
    )

    return state.cards.flatMap((_, cardIndex) => (
      matchedCardIndexes.has(cardIndex) || state.faceUpCardIndexes.includes(cardIndex)
        ? []
        : [{ type: 'flip' as const, cardIndex }]
    ))
  }

  function applyAction(action: MemoryAction): EngineResult<MemoryGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }

    if (action.type === 'resolveMismatch') {
      if (state.faceUpCardIndexes.length !== 2) {
        throw new Error('Es gibt kein offenes Kartenpaar')
      }

      const [firstIndex, secondIndex] = state.faceUpCardIndexes
      if (state.cards[firstIndex] === state.cards[secondIndex]) {
        throw new Error('Gleiche Karten werden sofort gewertet')
      }

      state = {
        ...state,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % options.playerCount,
        faceUpCardIndexes: [],
      }
      return result()
    }

    if (!Number.isInteger(action.cardIndex) || !getValidActions().some((validAction) => validAction.type === 'flip' && validAction.cardIndex === action.cardIndex)) {
      throw new Error('Diese Karte kann nicht aufgedeckt werden')
    }

    const faceUpCardIndexes = [...state.faceUpCardIndexes, action.cardIndex]
    if (faceUpCardIndexes.length < 2) {
      state = { ...state, faceUpCardIndexes }
      return result()
    }

    const [firstIndex, secondIndex] = faceUpCardIndexes
    const pairId = state.cards[firstIndex]
    if (pairId !== state.cards[secondIndex]) {
      state = { ...state, faceUpCardIndexes }
      return result()
    }

    const matchedPairCounts = [...state.matchedPairCounts]
    matchedPairCounts[state.currentPlayerIndex] += 1
    state = {
      ...state,
      faceUpCardIndexes: [],
      matchedPairIds: [...state.matchedPairIds, pairId],
      matchedPairCounts,
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
