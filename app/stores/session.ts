import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { GameId, SessionPlayer } from '~/types/game'
import { AI_DIFFICULTIES, DEFAULT_AI_DIFFICULTY, type AiDifficulty } from '../features/games/shared/ai'
import {
  DEFAULT_PUZZLE_GRID_SIZE,
  PUZZLE_GRID_SIZES,
  type PuzzleGridSize,
} from '../features/games/puzzleRace/engine'
import {
  DEFAULT_PUZZLE_IMAGE_ID,
  isKnownPuzzleImageId,
} from '../features/games/puzzleRace/images'

export type SessionSeat = SessionPlayer | null
export type SessionPlayerInput = Omit<SessionPlayer, 'seatIndex'>
export type MemoryGridSize = '4x3' | '4x4'
export type { PuzzleGridSize }

export const MIN_SEAT_COUNT = 2
export const MAX_SEAT_COUNT = 4
export const DEFAULT_MEMORY_GRID_SIZE: MemoryGridSize = '4x3'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isValidSessionPlayer(player: SessionSeat): player is SessionPlayer {
  if (!player || !Number.isInteger(player.seatIndex) || player.seatIndex < 0 || player.seatIndex >= MAX_SEAT_COUNT) {
    return false
  }

  if ((player.type !== 'human' && player.type !== 'ai') || !isNonEmptyString(player.displayName) || !isNonEmptyString(player.avatarId)) {
    return false
  }

  return player.type === 'ai' || isNonEmptyString(player.profileId)
}

export function canBeginSession(seats: readonly SessionSeat[]): boolean {
  return seats.filter(isValidSessionPlayer).length >= MIN_SEAT_COUNT
}

function createSeats(count: number): SessionSeat[] {
  return Array.from({ length: count }, () => null)
}

function resetPuzzleFields(
  puzzleGridSize: { value: PuzzleGridSize },
  puzzleImageId: { value: string },
  puzzleImageDataUrl: { value: string | null },
) {
  puzzleGridSize.value = DEFAULT_PUZZLE_GRID_SIZE
  puzzleImageId.value = DEFAULT_PUZZLE_IMAGE_ID
  puzzleImageDataUrl.value = null
}

export const useSessionStore = defineStore('session', () => {
  const gameId = ref<GameId | null>(null)
  const seats = ref<SessionSeat[]>(createSeats(MIN_SEAT_COUNT))
  const memoryGridSize = ref<MemoryGridSize>(DEFAULT_MEMORY_GRID_SIZE)
  const aiDifficulty = ref<AiDifficulty>(DEFAULT_AI_DIFFICULTY)
  const puzzleGridSize = ref<PuzzleGridSize>(DEFAULT_PUZZLE_GRID_SIZE)
  const puzzleImageId = ref<string>(DEFAULT_PUZZLE_IMAGE_ID)
  const puzzleImageDataUrl = ref<string | null>(null)

  const players = computed(() => seats.value.filter(isValidSessionPlayer))
  const seatCount = computed(() => seats.value.length)
  const canBegin = computed(() => canBeginSession(seats.value))

  function startLobby(nextGameId: GameId) {
    gameId.value = nextGameId
    seats.value = createSeats(MIN_SEAT_COUNT)
    memoryGridSize.value = DEFAULT_MEMORY_GRID_SIZE
    aiDifficulty.value = DEFAULT_AI_DIFFICULTY
    resetPuzzleFields(puzzleGridSize, puzzleImageId, puzzleImageDataUrl)
  }

  function setSeatCount(nextSeatCount: number) {
    if (!Number.isInteger(nextSeatCount) || nextSeatCount < MIN_SEAT_COUNT || nextSeatCount > MAX_SEAT_COUNT) {
      throw new Error('Ungültige Sitzanzahl')
    }

    seats.value = Array.from(
      { length: nextSeatCount },
      (_, seatIndex) => seats.value[seatIndex] ?? null,
    )
  }

  function setSeat(seatIndex: number, player: SessionPlayerInput | null) {
    if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex >= seats.value.length) {
      throw new Error('Ungültiger Sitzplatz')
    }

    const nextPlayer = player ? { ...player, seatIndex } : null
    if (!isValidSessionPlayer(nextPlayer)) {
      if (player) throw new Error('Ungültiger Spieler')
      seats.value = seats.value.map((seat, index) => (index === seatIndex ? null : seat))
      return
    }

    seats.value = seats.value.map((seat, index) => (index === seatIndex ? nextPlayer : seat))
  }

  function setMemoryGridSize(nextGridSize: MemoryGridSize) {
    if (nextGridSize !== '4x3' && nextGridSize !== '4x4') {
      throw new Error('Ungültige Memory-Rastergröße')
    }

    memoryGridSize.value = nextGridSize
  }

  function setPuzzleGridSize(nextGridSize: PuzzleGridSize) {
    if (!PUZZLE_GRID_SIZES.includes(nextGridSize)) {
      throw new Error('Ungültige Puzzle-Rastergröße')
    }

    puzzleGridSize.value = nextGridSize
  }

  function setPuzzleImageId(nextImageId: string) {
    if (!isKnownPuzzleImageId(nextImageId)) {
      throw new Error('Ungültiges Puzzle-Bild')
    }

    puzzleImageId.value = nextImageId
    puzzleImageDataUrl.value = null
  }

  function setPuzzleImageDataUrl(nextDataUrl: string | null) {
    if (nextDataUrl !== null && (typeof nextDataUrl !== 'string' || nextDataUrl.length === 0)) {
      throw new Error('Ungültiges Puzzle-Upload')
    }

    puzzleImageDataUrl.value = nextDataUrl
  }

  function setAiDifficulty(nextDifficulty: AiDifficulty) {
    if (!AI_DIFFICULTIES.includes(nextDifficulty)) {
      throw new Error('Ungültiger KI-Schwierigkeitsgrad')
    }

    aiDifficulty.value = nextDifficulty
  }

  function beginPlay(): boolean {
    if (!gameId.value || !canBegin.value) return false

    void navigateTo(`/play/${gameId.value}`)
    return true
  }

  function endSession() {
    gameId.value = null
    seats.value = createSeats(MIN_SEAT_COUNT)
    memoryGridSize.value = DEFAULT_MEMORY_GRID_SIZE
    aiDifficulty.value = DEFAULT_AI_DIFFICULTY
    resetPuzzleFields(puzzleGridSize, puzzleImageId, puzzleImageDataUrl)
  }

  return {
    gameId,
    seats,
    memoryGridSize,
    aiDifficulty,
    puzzleGridSize,
    puzzleImageId,
    puzzleImageDataUrl,
    players,
    seatCount,
    canBegin,
    startLobby,
    setSeatCount,
    setSeat,
    setMemoryGridSize,
    setPuzzleGridSize,
    setPuzzleImageId,
    setPuzzleImageDataUrl,
    setAiDifficulty,
    beginPlay,
    endSession,
  }
})
