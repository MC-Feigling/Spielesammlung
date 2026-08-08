export interface PuzzleImage {
  id: string
  label: string
  src: string
}

export const PUZZLE_IMAGES: PuzzleImage[] = [
  { id: 'meadow', label: 'Wiese', src: '/puzzles/meadow.svg' },
  { id: 'balloon', label: 'Ballon', src: '/puzzles/balloon.svg' },
  { id: 'castle', label: 'Burg', src: '/puzzles/castle.svg' },
  { id: 'ocean', label: 'Meer', src: '/puzzles/ocean.svg' },
  { id: 'forest', label: 'Wald', src: '/puzzles/forest.svg' },
  { id: 'rocket', label: 'Rakete', src: '/puzzles/rocket.svg' },
]

export const DEFAULT_PUZZLE_IMAGE_ID = PUZZLE_IMAGES[0]!.id

export const PUZZLE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024

export const PUZZLE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp'

export function resolvePuzzleImageUrl(
  imageId: string,
  dataUrl: string | null | undefined,
): string {
  if (typeof dataUrl === 'string' && dataUrl.length > 0) {
    return dataUrl
  }

  return PUZZLE_IMAGES.find((image) => image.id === imageId)?.src
    ?? PUZZLE_IMAGES[0]!.src
}

export function isKnownPuzzleImageId(imageId: string): boolean {
  return PUZZLE_IMAGES.some((image) => image.id === imageId)
}
