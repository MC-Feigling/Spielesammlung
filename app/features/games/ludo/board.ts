export const LUDO_PLAYER_COUNT_MIN = 2
export const LUDO_PLAYER_COUNT_MAX = 4
export const LUDO_PIECES_PER_PLAYER = 4
export const LUDO_RING_SIZE = 40
export const LUDO_HOME_LENGTH = 4
export const LUDO_YARD_PROGRESS = -1
export const LUDO_HOME_START_PROGRESS = LUDO_RING_SIZE
export const LUDO_HOME_END_PROGRESS = LUDO_HOME_START_PROGRESS + LUDO_HOME_LENGTH - 1

export const LUDO_START_INDEXES = [0, 10, 20, 30] as const
export const LUDO_PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'] as const

export type LudoPlayerColor = (typeof LUDO_PLAYER_COLORS)[number]

export interface LudoPiece {
  progress: number
}

export function getRingIndex(playerIndex: number, progress: number): number | null {
  if (progress < 0 || progress >= LUDO_RING_SIZE) return null

  return (LUDO_START_INDEXES[playerIndex] + progress) % LUDO_RING_SIZE
}

export function isInYard(piece: LudoPiece): boolean {
  return piece.progress === LUDO_YARD_PROGRESS
}

export function isInHome(piece: LudoPiece): boolean {
  return piece.progress >= LUDO_HOME_START_PROGRESS
}

export function isFullyHome(piece: LudoPiece): boolean {
  return piece.progress === LUDO_HOME_END_PROGRESS
}
