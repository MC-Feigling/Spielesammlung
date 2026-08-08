<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import {
  choosePuzzleRaceSwap,
  PUZZLE_RACE_AI_STAGGER_MS,
  PUZZLE_RACE_MOVE_INTERVAL_MS,
} from './ai'
import {
  createPuzzleRaceGame,
  type PuzzleGridSize,
  type PuzzleRaceBoardState,
  type PuzzleRaceState,
} from './engine'

const props = defineProps<{
  players: SessionPlayer[]
  gridSize: PuzzleGridSize
  imageUrl: string
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)

const game = createPuzzleRaceGame({
  players: props.players.map((player) => ({ seatIndex: player.seatIndex, type: player.type })),
  gridSize: props.gridSize,
  imageUrl: props.imageUrl,
})

const state = ref<PuzzleRaceState>(cloneState())
const isPreviewOpen = ref(false)
const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const humanPlayer = computed(() => props.players.find((player) => player.type === 'human') ?? props.players[0]!)
const aiPlayers = computed(() => props.players.filter((player) => player.type === 'ai'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))
const isRacing = computed(() => state.value.phase === 'racing')
const gridN = computed(() => state.value.gridSize)

const humanBoard = computed(() =>
  state.value.boards.find((board) => board.seatIndex === humanPlayer.value.seatIndex)
  ?? state.value.boards[0]!,
)

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
let hasEmittedComplete = false
const aiAccumulators = new Map<number, number>()

function cloneState(): PuzzleRaceState {
  return {
    ...game.state,
    boards: game.state.boards.map((board) => ({
      ...board,
      tiles: [...board.tiles],
    })),
  }
}

function syncState(): void {
  state.value = cloneState()
}

function tileStyle(tileValue: number): Record<string, string> {
  const n = gridN.value
  const col = tileValue % n
  const row = Math.floor(tileValue / n)
  const x = n === 1 ? 0 : (col / (n - 1)) * 100
  const y = n === 1 ? 0 : (row / (n - 1)) * 100
  return {
    backgroundImage: `url(${state.value.imageUrl})`,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
  }
}

function boardForSeat(seatIndex: number): PuzzleRaceBoardState {
  return state.value.boards.find((board) => board.seatIndex === seatIndex) ?? state.value.boards[0]!
}

function onHumanSelect(tileIndex: number): void {
  if (!isRacing.value) return
  game.selectTile(humanPlayer.value.seatIndex, tileIndex)
  syncState()
  checkWinner()
}

function onPointerDown(event: PointerEvent, tileIndex: number): void {
  if (!isRacing.value) return
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture?.(event.pointerId)
  dragFromIndex.value = tileIndex
  dragOverIndex.value = tileIndex
}

function onPointerEnter(tileIndex: number): void {
  if (dragFromIndex.value === null) return
  dragOverIndex.value = tileIndex
}

function onPointerUp(): void {
  if (!isRacing.value || dragFromIndex.value === null) {
    dragFromIndex.value = null
    dragOverIndex.value = null
    return
  }

  const from = dragFromIndex.value
  const to = dragOverIndex.value
  dragFromIndex.value = null
  dragOverIndex.value = null

  if (to === null || to === from) {
    onHumanSelect(from)
    return
  }

  game.swapTiles(humanPlayer.value.seatIndex, from, to)
  syncState()
  checkWinner()
}

function onPointerCancel(): void {
  dragFromIndex.value = null
  dragOverIndex.value = null
}

function checkWinner(): void {
  const winnerSeat = game.getWinnerSeatIndex()
  if (winnerSeat === null || hasEmittedComplete) return
  hasEmittedComplete = true
  play('win')
  emit('complete', [winnerSeat])
}

function runAiMoves(dtMs: number): void {
  if (game.state.phase !== 'racing' || game.state.winnerSeatIndex !== null) return

  for (const player of aiPlayers.value) {
    const interval = PUZZLE_RACE_MOVE_INTERVAL_MS[aiDifficulty.value]
      + player.seatIndex * PUZZLE_RACE_AI_STAGGER_MS
    const previous = aiAccumulators.get(player.seatIndex) ?? 0
    const next = previous + dtMs
    if (next < interval) {
      aiAccumulators.set(player.seatIndex, next)
      continue
    }
    aiAccumulators.set(player.seatIndex, next - interval)

    const board = game.state.boards.find((item) => item.seatIndex === player.seatIndex)
    if (!board) continue
    const move = choosePuzzleRaceSwap(board.tiles, { difficulty: aiDifficulty.value })
    if (!move) continue
    game.applyAiSwap(player.seatIndex, move.a, move.b)
  }
}

function frame(timestamp: number): void {
  if (!lastTimestamp) lastTimestamp = timestamp
  const dtMs = Math.min(50, timestamp - lastTimestamp)
  lastTimestamp = timestamp

  const previousPhase = game.state.phase
  game.tick(dtMs)
  if (previousPhase === 'countdown' && game.state.phase === 'racing' && !hasPlayedStart) {
    play('start')
    hasPlayedStart = true
  }

  runAiMoves(dtMs)
  syncState()
  checkWinner()

  if (game.state.phase !== 'finished') {
    rafId = requestAnimationFrame(frame)
  }
}

onMounted(() => {
  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  if (rafId !== undefined) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[var(--color-panel)] p-4 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
      <p class="font-bold text-[var(--color-ink)]">
        <template v-if="state.phase === 'countdown'">
          Start in {{ countdownSeconds }}…
        </template>
        <template v-else-if="state.phase === 'racing'">
          Los! Tausche die Teile so schnell du kannst.
        </template>
        <template v-else>
          Fertig!
        </template>
      </p>
      <AppButton variant="secondary" @click="isPreviewOpen = true">
        Vorschau
      </AppButton>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <section class="rounded-3xl bg-[var(--color-panel)] p-4 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <div class="mb-3 flex items-center gap-3">
          <img
            class="h-10 w-10"
            :src="`/avatars/${humanPlayer.avatarId}.svg`"
            alt=""
            aria-hidden="true"
          >
          <h2 class="font-[var(--font-display)] text-2xl font-semibold">
            {{ humanPlayer.displayName }}
          </h2>
        </div>

        <div
          class="mx-auto grid max-w-xl gap-1"
          :style="{ gridTemplateColumns: `repeat(${gridN}, minmax(0, 1fr))` }"
          role="grid"
          :aria-label="`Puzzle von ${humanPlayer.displayName}`"
        >
          <button
            v-for="(tileValue, tileIndex) in humanBoard.tiles"
            :key="`human-${tileIndex}`"
            type="button"
            class="aspect-square min-h-[var(--hit-min)] touch-none rounded-lg border-2 border-[#c48a4a] bg-cover bg-no-repeat transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed"
            :class="{
              'ring-4 ring-[var(--color-accent)] scale-[1.03]': humanBoard.selectedIndex === tileIndex || dragFromIndex === tileIndex,
              'ring-2 ring-[#27462f]': dragOverIndex === tileIndex && dragFromIndex !== tileIndex,
            }"
            :style="tileStyle(tileValue)"
            :disabled="!isRacing"
            :aria-label="`Teil ${tileIndex + 1}`"
            @pointerdown="onPointerDown($event, tileIndex)"
            @pointerenter="onPointerEnter(tileIndex)"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
          />
        </div>
        <p class="mt-3 text-center text-sm font-bold text-[#7a5a3a]">
          Antippen zum Tauschen oder ziehen und ablegen.
        </p>
      </section>

      <aside class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <section
          v-for="player in aiPlayers"
          :key="player.seatIndex"
          class="rounded-3xl bg-[#dceddc] p-3 text-[#27462f] shadow-[0_4px_0_#9bb89b] ring-2 ring-[#b7d4b7]"
        >
          <div class="mb-2 flex items-center gap-2">
            <img
              class="h-8 w-8"
              :src="`/avatars/${player.avatarId}.svg`"
              alt=""
              aria-hidden="true"
            >
            <h3 class="font-bold">{{ player.displayName }}</h3>
          </div>
          <div
            class="grid gap-0.5"
            :style="{ gridTemplateColumns: `repeat(${gridN}, minmax(0, 1fr))` }"
            aria-hidden="true"
          >
            <div
              v-for="(tileValue, tileIndex) in boardForSeat(player.seatIndex).tiles"
              :key="`ai-${player.seatIndex}-${tileIndex}`"
              class="aspect-square rounded-sm border border-[#9bb89b] bg-cover bg-no-repeat"
              :style="tileStyle(tileValue)"
            />
          </div>
        </section>
      </aside>
    </div>

    <Teleport to="body">
      <div
        v-if="isPreviewOpen"
        class="fixed inset-0 z-50 grid place-items-center bg-[#2b2118]/55 p-4"
        role="presentation"
        @click.self="isPreviewOpen = false"
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="puzzle-preview-title"
          class="w-full max-w-md rounded-3xl bg-[var(--color-panel)] p-6 shadow-[0_8px_0_#9e3b24] ring-4 ring-[#dfbd8c]"
        >
          <h2 id="puzzle-preview-title" class="font-[var(--font-display)] text-3xl font-semibold">
            Vorschau
          </h2>
          <img
            class="mt-4 w-full rounded-2xl border-2 border-[#c48a4a] object-cover"
            :src="state.imageUrl"
            alt="Lösungsbild"
          >
          <AppButton class="mt-6" block @click="isPreviewOpen = false">
            Schließen
          </AppButton>
        </section>
      </div>
    </Teleport>
  </div>
</template>
