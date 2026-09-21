export const LUDO_PLAYER_COUNT_MIN = 2
export const LUDO_PLAYER_COUNT_MAX = 4
export const LUDO_PIECES_PER_PLAYER = 4
export const LUDO_RING_SIZE = 40
export const LUDO_HOME_LENGTH = 4
export const LUDO_YARD_PROGRESS = -1
export const LUDO_HOME_START_PROGRESS = LUDO_RING_SIZE
export const LUDO_HOME_END_PROGRESS = LUDO_HOME_START_PROGRESS + LUDO_HOME_LENGTH - 1

export const LUDO_START_INDEXES = [0, 10, 20, 30] as const
export const LUDO_PLAYER_COLORS = ['red', 'yellow', 'blue', 'green'] as const

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

/** Yard or finished home — no piece left on ring / home stretch. */
export function isOffTrack(piece: LudoPiece): boolean {
  return isInYard(piece) || isFullyHome(piece)
}

/**
 * Maps finished home pieces onto free home cells (from the center back),
 * so multiple finished tokens do not stack on the last home step.
 */
export function assignFinishedHomeSteps(
  pieces: readonly LudoPiece[],
): Map<number, number> {
  const occupied = new Set<number>()
  const finishedIndexes: number[] = []

  pieces.forEach((piece, pieceIndex) => {
    if (isFullyHome(piece)) {
      finishedIndexes.push(pieceIndex)
      return
    }
    if (isInHome(piece)) {
      occupied.add(piece.progress - LUDO_HOME_START_PROGRESS)
    }
  })

  const freeSteps: number[] = []
  for (let step = LUDO_HOME_LENGTH - 1; step >= 0; step -= 1) {
    if (!occupied.has(step)) freeSteps.push(step)
  }

  const assignment = new Map<number, number>()
  finishedIndexes.forEach((pieceIndex, order) => {
    const step = freeSteps[order]
    if (step !== undefined) assignment.set(pieceIndex, step)
  })
  return assignment
}
