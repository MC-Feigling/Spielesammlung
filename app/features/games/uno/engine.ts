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

function isWildRank(rank: UnoRank): boolean {
  return rank === 'wild' || rank === 'wildDrawFour'
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

function topDiscard(state: UnoGameState): UnoCard {
  const top = state.discardPile[state.discardPile.length - 1]
  if (!top) throw new Error('Ablagestapel ist leer')
  return top
}

export function isLegalPlay(
  card: UnoCard,
  _top: UnoCard,
  currentColor: UnoColor,
  pendingDrawCount: number,
  pendingDrawKind: UnoPendingDrawKind | null,
): boolean {
  if (pendingDrawCount > 0) {
    if (pendingDrawKind === 'wildDrawFour') {
      return card.rank === 'wildDrawFour'
    }
    if (pendingDrawKind === 'drawTwo') {
      return card.rank === 'drawTwo' || card.rank === 'wildDrawFour'
    }
    return false
  }

  if (isWildRank(card.rank)) return true
  if (card.color === currentColor) return true
  if (card.rank === _top.rank) return true
  return false
}

function nextPlayerIndex(state: UnoGameState, steps: number): number {
  const count = state.playerCount
  const raw = state.currentPlayerIndex + state.direction * steps
  return ((raw % count) + count) % count
}

function ensureDrawPile(state: UnoGameState, random: () => number): void {
  if (state.drawPile.length > 0) return
  if (state.discardPile.length <= 1) {
    throw new Error('Keine Karten mehr zum Ziehen')
  }

  const top = state.discardPile[state.discardPile.length - 1]!
  const rest = state.discardPile.slice(0, -1)
  state.discardPile = [top]
  state.drawPile = shuffle(rest, random)
}

function takeCards(state: UnoGameState, count: number, random: () => number): UnoCard[] {
  const drawn: UnoCard[] = []

  for (let index = 0; index < count; index += 1) {
    ensureDrawPile(state, random)
    const card = state.drawPile.shift()
    if (!card) throw new Error('Keine Karten mehr zum Ziehen')
    drawn.push(card)
  }

  return drawn
}

function applyPlayEffects(
  state: UnoGameState,
  card: UnoCard,
  chosenColor: UnoColor | undefined,
): void {
  switch (card.rank) {
    case 'skip': {
      state.currentColor = card.color as UnoColor
      state.currentPlayerIndex = nextPlayerIndex(state, 2)
      break
    }
    case 'reverse': {
      state.currentColor = card.color as UnoColor
      state.direction = state.direction === 1 ? -1 : 1
      const steps = state.playerCount === 2 ? 2 : 1
      state.currentPlayerIndex = nextPlayerIndex(state, steps)
      break
    }
    case 'drawTwo': {
      state.currentColor = card.color as UnoColor
      state.pendingDrawCount += 2
      if (state.pendingDrawKind !== 'wildDrawFour') {
        state.pendingDrawKind = 'drawTwo'
      }
      state.currentPlayerIndex = nextPlayerIndex(state, 1)
      break
    }
    case 'wild': {
      if (!chosenColor) throw new Error('Wild braucht eine Farbwahl')
      state.currentColor = chosenColor
      state.currentPlayerIndex = nextPlayerIndex(state, 1)
      break
    }
    case 'wildDrawFour': {
      if (!chosenColor) throw new Error('Wild+4 braucht eine Farbwahl')
      state.currentColor = chosenColor
      state.pendingDrawCount += 4
      state.pendingDrawKind = 'wildDrawFour'
      state.currentPlayerIndex = nextPlayerIndex(state, 1)
      break
    }
    default: {
      state.currentColor = card.color as UnoColor
      state.currentPlayerIndex = nextPlayerIndex(state, 1)
      break
    }
  }
}

function playCardFromHand(
  state: UnoGameState,
  cardId: string,
  chosenColor: UnoColor | undefined,
): void {
  const hand = state.hands[state.currentPlayerIndex]
  if (!hand) throw new Error('Ungültiger Spieler')

  const cardIndex = hand.findIndex((card) => card.id === cardId)
  if (cardIndex < 0) throw new Error('Karte nicht auf der Hand')

  const card = hand[cardIndex]!
  const top = topDiscard(state)

  if (!isLegalPlay(card, top, state.currentColor, state.pendingDrawCount, state.pendingDrawKind)) {
    throw new Error('Zug ist nicht erlaubt')
  }

  if (isWildRank(card.rank) && !chosenColor) {
    throw new Error('Wild braucht eine Farbwahl')
  }

  if (!isWildRank(card.rank) && chosenColor !== undefined) {
    throw new Error('Farbwahl nur bei Wild-Karten')
  }

  hand.splice(cardIndex, 1)
  state.discardPile.push(card)

  if (hand.length === 0) return

  applyPlayEffects(state, card, chosenColor)
}

function listPlayActions(state: UnoGameState): UnoAction[] {
  const hand = state.hands[state.currentPlayerIndex] ?? []
  const top = topDiscard(state)
  const actions: UnoAction[] = []

  for (const card of hand) {
    if (!isLegalPlay(card, top, state.currentColor, state.pendingDrawCount, state.pendingDrawKind)) {
      continue
    }

    if (isWildRank(card.rank)) {
      for (const color of COLORS) {
        actions.push({ type: 'play', cardId: card.id, chosenColor: color })
      }
    }
    else {
      actions.push({ type: 'play', cardId: card.id })
    }
  }

  return actions
}

function createGame(initialState: UnoGameState, random: () => number): GameEngine<UnoGameState, UnoAction> {
  let state = cloneState(initialState)

  function isTerminal(): boolean {
    return winnerSeatIndexes(state).length > 0
  }

  function result(): EngineResult<UnoGameState> {
    return { state: cloneState(state), winnerSeatIndexes: winnerSeatIndexes(state) }
  }

  function getValidActions(): UnoAction[] {
    if (isTerminal()) return []

    const plays = listPlayActions(state)

    if (state.pendingDrawCount > 0) {
      return [...plays, { type: 'draw' }]
    }

    if (plays.length > 0) return plays
    return [{ type: 'draw' }]
  }

  function applyAction(action: UnoAction): EngineResult<UnoGameState> {
    if (isTerminal()) {
      throw new Error('Das Spiel ist bereits beendet')
    }

    const valid = getValidActions()
    const isValid = valid.some((candidate) => {
      if (candidate.type !== action.type) return false
      if (action.type === 'draw') return true
      return candidate.type === 'play'
        && action.type === 'play'
        && candidate.cardId === action.cardId
        && candidate.chosenColor === action.chosenColor
    })

    if (!isValid) {
      throw new Error('Zug ist nicht erlaubt')
    }

    if (action.type === 'draw') {
      if (state.pendingDrawCount > 0) {
        const penalty = state.pendingDrawCount
        const drawn = takeCards(state, penalty, random)
        state.hands[state.currentPlayerIndex]!.push(...drawn)
        state.pendingDrawCount = 0
        state.pendingDrawKind = null
        state.currentPlayerIndex = nextPlayerIndex(state, 1)
        return result()
      }

      const [drawn] = takeCards(state, 1, random)
      if (!drawn) throw new Error('Keine Karten mehr zum Ziehen')

      const hand = state.hands[state.currentPlayerIndex]!
      const top = topDiscard(state)
      const canPlay = isLegalPlay(drawn, top, state.currentColor, 0, null)

      if (canPlay) {
        // After draw: auto-play legal non-wild with effects.
        // Wild / Wild+4 also auto-play; chosenColor = currentColor (keep color) — no post-draw picker.
        hand.push(drawn)
        const color = isWildRank(drawn.rank) ? state.currentColor : undefined
        playCardFromHand(state, drawn.id, color)
      }
      else {
        hand.push(drawn)
        state.currentPlayerIndex = nextPlayerIndex(state, 1)
      }

      return result()
    }

    playCardFromHand(state, action.cardId, action.chosenColor)
    return result()
  }

  return {
    getState: () => cloneState(state),
    getValidActions,
    applyAction,
    isTerminal,
  }
}

export function createUnoGame(options: UnoGameOptions): GameEngine<UnoGameState, UnoAction> {
  validatePlayerCount(options.playerCount)
  const random = createSeededRandom(options.seed ?? Date.now())
  return createGame(dealInitialState(options.playerCount, random), random)
}

export function createUnoGameFromState(
  input: UnoGameState,
  options?: { seed?: number },
): GameEngine<UnoGameState, UnoAction> {
  validatePlayerCount(input.playerCount)
  const random = createSeededRandom(options?.seed ?? 1)
  return createGame(input, random)
}