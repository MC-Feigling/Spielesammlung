export type PuzzleGridSize = '3x3' | '5x5' | '7x7'

export const PUZZLE_GRID_SIZES = ['3x3', '5x5', '7x7'] as const

export const DEFAULT_PUZZLE_GRID_SIZE: PuzzleGridSize = '3x3'

export function parsePuzzleGridSize(value: PuzzleGridSize): number {
  if (value === '3x3') return 3
  if (value === '5x5') return 5
  return 7
}

export type PuzzleRacePhase = 'countdown' | 'racing' | 'finished'

export const PUZZLE_RACE_COUNTDOWN_MS = 3000

export interface PuzzleRaceBoardState {
  seatIndex: number
  tiles: number[]
  selectedIndex: number | null
}

export interface PuzzleRaceState {
  phase: PuzzleRacePhase
  countdownMs: number
  gridSize: number
  imageUrl: string
  boards: PuzzleRaceBoardState[]
  winnerSeatIndex: number | null
}

export interface PuzzleRaceGame {
  state: PuzzleRaceState
  tick: (dtMs: number) => void
  selectTile: (seatIndex: number, tileIndex: number) => void
  swapTiles: (seatIndex: number, a: number, b: number) => void
  applyAiSwap: (seatIndex: number, a: number, b: number) => void
  getWinnerSeatIndex: () => number | null
}

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

export function isPuzzleSolved(tiles: readonly number[]): boolean {
  return tiles.every((tile, index) => tile === index)
}

export function createScrambledTiles(tileCount: number, random: () => number): number[] {
  const identity = Array.from({ length: tileCount }, (_, index) => index)
  let scrambled = shuffle(identity, random)
  let guard = 0

  while (isPuzzleSolved(scrambled) && guard < 32) {
    scrambled = shuffle(identity, random)
    guard += 1
  }

  if (isPuzzleSolved(scrambled) && tileCount > 1) {
    ;[scrambled[0], scrambled[1]] = [scrambled[1]!, scrambled[0]!]
  }

  return scrambled
}

function findBoard(state: PuzzleRaceState, seatIndex: number): PuzzleRaceBoardState | undefined {
  return state.boards.find((board) => board.seatIndex === seatIndex)
}

function tryFinish(state: PuzzleRaceState, board: PuzzleRaceBoardState): void {
  if (state.winnerSeatIndex !== null) return
  if (!isPuzzleSolved(board.tiles)) return
  state.winnerSeatIndex = board.seatIndex
  state.phase = 'finished'
}

function swapInPlace(tiles: number[], a: number, b: number): void {
  const temp = tiles[a]!
  tiles[a] = tiles[b]!
  tiles[b] = temp
}

export function createPuzzleRaceGame(config: {
  players: Array<{ seatIndex: number; type: 'human' | 'ai' }>
  gridSize: PuzzleGridSize
  imageUrl: string
  seed?: number
}): PuzzleRaceGame {
  const gridSize = parsePuzzleGridSize(config.gridSize)
  const tileCount = gridSize * gridSize
  const random = createSeededRandom(config.seed ?? Date.now())
  const scrambled = createScrambledTiles(tileCount, random)

  const state: PuzzleRaceState = {
    phase: 'countdown',
    countdownMs: PUZZLE_RACE_COUNTDOWN_MS,
    gridSize,
    imageUrl: config.imageUrl,
    boards: config.players.map((player) => ({
      seatIndex: player.seatIndex,
      tiles: [...scrambled],
      selectedIndex: null,
    })),
    winnerSeatIndex: null,
  }

  function tick(dtMs: number): void {
    if (state.phase !== 'countdown') return
    state.countdownMs = Math.max(0, state.countdownMs - Math.max(0, dtMs))
    if (state.countdownMs === 0) {
      state.phase = 'racing'
    }
  }

  function selectTile(seatIndex: number, tileIndex: number): void {
    if (state.phase !== 'racing' || state.winnerSeatIndex !== null) return
    const board = findBoard(state, seatIndex)
    if (!board) return
    if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= board.tiles.length) return

    if (board.selectedIndex === null) {
      board.selectedIndex = tileIndex
      return
    }

    if (board.selectedIndex === tileIndex) {
      board.selectedIndex = null
      return
    }

    swapInPlace(board.tiles, board.selectedIndex, tileIndex)
    board.selectedIndex = null
    tryFinish(state, board)
  }

  function swapTiles(seatIndex: number, a: number, b: number): void {
    if (state.phase !== 'racing' || state.winnerSeatIndex !== null) return
    const board = findBoard(state, seatIndex)
    if (!board) return
    if (!Number.isInteger(a) || !Number.isInteger(b)) return
    if (a < 0 || b < 0 || a >= board.tiles.length || b >= board.tiles.length) return
    if (a === b) return

    swapInPlace(board.tiles, a, b)
    board.selectedIndex = null
    tryFinish(state, board)
  }

  function applyAiSwap(seatIndex: number, a: number, b: number): void {
    swapTiles(seatIndex, a, b)
  }

  function getWinnerSeatIndex(): number | null {
    return state.winnerSeatIndex
  }

  return {
    state,
    tick,
    selectTile,
    swapTiles,
    applyAiSwap,
    getWinnerSeatIndex,
  }
}
