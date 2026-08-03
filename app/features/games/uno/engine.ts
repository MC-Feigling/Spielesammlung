import type { EngineResult, GameEngine } from '../shared/engine'

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue'

export type UnoRank =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'drawTwo' | 'wild' | 'wildDrawFour'

export interface UnoCard {
  id: string
  color: UnoColor | 'wild'
  rank: UnoRank
}

export type UnoAction =
  | { type: 'play'; cardId: string; chosenColor?: UnoColor }
  | { type: 'draw' }

export type UnoPendingDrawKind = 'drawTwo' | 'wildDrawFour'

export interface UnoGameState {
  playerCount: number
  hands: UnoCard[][]
  drawPile: UnoCard[]
  discardPile: UnoCard[]
  currentColor: UnoColor
  currentPlayerIndex: number
  direction: 1 | -1
  pendingDrawCount: number
  pendingDrawKind: UnoPendingDrawKind | null
}

export interface UnoGameOptions {
  playerCount: number
  seed?: number
}

const MIN_PLAYER_COUNT = 2
const MAX_PLAYER_COUNT = 4
const CARDS_PER_HAND = 7
const COLORS: readonly UnoColor[] = ['red', 'yellow', 'green', 'blue']
const NUMBER_RANKS: readonly UnoRank[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const COLORED_ACTION_RANKS: readonly UnoRank[] = ['skip', 'reverse', 'drawTwo']

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

function shuffle<T>(values: T[], random: () => number): T[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

function isNumberRank(rank: UnoRank): boolean {
  return (NUMBER_RANKS as readonly string[]).includes(rank)
}

function buildDeck(): UnoCard[] {
  const cards: UnoCard[] = []
  let nextId = 0

  const push = (color: UnoColor | 'wild', rank: UnoRank) => {
    cards.push({ id: `uno-${nextId}`, color, rank })
    nextId += 1
  }

  for (const color of COLORS) {
    push(color, '0')

    for (const rank of NUMBER_RANKS.slice(1)) {
      push(color, rank)
      push(color, rank)
    }

    for (const rank of COLORED_ACTION_RANKS) {
      push(color, rank)
      push(color, rank)
    }
  }

  for (let index = 0; index < 4; index += 1) {
    push('wild', 'wild')
    push('wild', 'wildDrawFour')
  }

  return cards
}

function validatePlayerCount(playerCount: number) {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYER_COUNT || playerCount > MAX_PLAYER_COUNT) {
    throw new Error('UNO braucht zwei bis vier Spieler')
  }
}

function cloneState(state: UnoGameState): UnoGameState {
  return {
    ...state,
    hands: state.hands.map((hand) => hand.map((card) => ({ ...card }))),
    drawPile: state.drawPile.map((card) => ({ ...card })),
    discardPile: state.discardPile.map((card) => ({ ...card })),
  }
}

function dealInitialState(playerCount: number, random: () => number): UnoGameState {
  const deck = shuffle(buildDeck(), random)
  const hands: UnoCard[][] = Array.from({ length: playerCount }, () => [])

  for (let dealRound = 0; dealRound < CARDS_PER_HAND; dealRound += 1) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
      const card = deck.shift()
      if (!card) throw new Error('Deck zu klein zum Austeilen')
      hands[playerIndex].push(card)
    }
  }

  const nonStarterCards: UnoCard[] = []
  let startCard: UnoCard | undefined

  while (deck.length > 0) {
    const card = deck.shift()!
    if (isNumberRank(card.rank) && card.color !== 'wild') {
      startCard = card
      break
    }
    nonStarterCards.push(card)
  }

  if (!startCard) {
    throw new Error('Keine Zahlenkarte für den Ablagestapel gefunden')
  }

  const drawPile = [...deck, ...nonStarterCards]

  return {
    playerCount,
    hands,
    drawPile,
    discardPile: [startCard],
    currentColor: startCard.color as UnoColor,
    currentPlayerIndex: 0,
    direction: 1,
    pendingDrawCount: 0,
    pendingDrawKind: null,
  }
}

function winnerSeatIndexes(state: UnoGameState): number[] {
  return state.hands.flatMap((hand, seatIndex) => (hand.length === 0 ? [seatIndex] : []))
}

export function createUnoGame(options: UnoGameOptions): GameEngine<UnoGameState, UnoAction> {
  validatePlayerCount(options.playerCount)

  const random = createSeededRandom(options.seed ?? Date.now())
  let state = dealInitialState(options.playerCount, random)

  function isTerminal(): boolean {
    return winnerSeatIndexes(state).length > 0
  }

  function result(): EngineResult<UnoGameState> {
    return { state: cloneState(state), winnerSeatIndexes: winnerSeatIndexes(state) }
  }

  function getValidActions(): UnoAction[] {
    if (isTerminal()) return []
    return []
  }

  function applyAction(_action: UnoAction): EngineResult<UnoGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }
    throw new Error('UNO-Züge sind in Phase 1 noch nicht implementiert')
  }

  return {
    getState: () => cloneState(state),
    getValidActions,
    applyAction,
    isTerminal,
  }
}
