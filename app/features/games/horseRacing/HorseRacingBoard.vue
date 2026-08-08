<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import {
  TRACK_LENGTH,
  VIEW_AHEAD,
  VIEW_BEHIND,
  createHorseRacingGame,
  maxSpeedForProgress,
  type HorseRacingState,
} from './engine'
import { chooseHorseRacingActions } from './ai'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()

const HORSE_COLORS = ['#e45b3a', '#f0b429', '#3d8fd1', '#4faf6a'] as const

const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)

const game = createHorseRacingGame({
  players: props.players.map((player) => ({ seatIndex: player.seatIndex, type: player.type })),
})

const state = ref<HorseRacingState>(cloneState())

const humanPlayers = computed(() => props.players.filter((player) => player.type === 'human'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))
const cameraProgress = computed(() => Math.max(0, ...state.value.horses.map((horse) => horse.progress)))
const raceProgressPercent = computed(() => Math.min(100, (cameraProgress.value / TRACK_LENGTH) * 100))

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
let hasEmittedComplete = false
const previousSlowdowns = new Map<number, number>()
const keysHeld = new Set<string>()

function cloneState(): HorseRacingState {
  return {
    ...game.state,
    horses: game.state.horses.map((horse) => ({ ...horse })),
    hurdles: game.state.hurdles.map((hurdle) => ({ ...hurdle })),
  }
}

function syncState(): void {
  state.value = cloneState()
}

function clearAllHolds(): void {
  for (const horse of game.state.horses) {
    game.setHold(horse.seatIndex, false)
  }
  syncState()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (state.value.phase !== 'racing') return

  const key = event.key
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
    event.preventDefault()
  }

  if (keysHeld.has(key)) return
  keysHeld.add(key)

  const humans = humanPlayers.value
  if (humans.length >= 1 && (key === 'a' || key === 'A')) {
    game.setHold(humans[0]!.seatIndex, true)
    syncState()
  }
  else if (humans.length >= 1 && (key === 'w' || key === 'W')) {
    game.jump(humans[0]!.seatIndex)
    syncState()
  }
  else if (humans.length >= 2 && key === 'ArrowLeft') {
    game.setHold(humans[1]!.seatIndex, true)
    syncState()
  }
  else if (humans.length >= 2 && key === 'ArrowUp') {
    game.jump(humans[1]!.seatIndex)
    syncState()
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  const key = event.key
  keysHeld.delete(key)

  if (state.value.phase !== 'racing') return

  const humans = humanPlayers.value
  if (humans.length >= 1 && (key === 'a' || key === 'A')) {
    game.setHold(humans[0]!.seatIndex, false)
    syncState()
  }
  else if (humans.length >= 2 && key === 'ArrowLeft') {
    game.setHold(humans[1]!.seatIndex, false)
    syncState()
  }
}

function handleWindowBlur(): void {
  keysHeld.clear()
  clearAllHolds()
}

function progressToLeftPercent(progress: number): number {
  const span = VIEW_AHEAD + VIEW_BEHIND
  const left = ((progress - (cameraProgress.value - VIEW_BEHIND)) / span) * 100
  return Math.min(110, Math.max(-10, left))
}

function horseBottomPercent(seatIndex: number, airMs: number): number {
  const laneOffset = 12 + (seatIndex % 4) * 10
  const jumpLift = airMs > 0 ? 14 : 0
  return laneOffset + jumpLift
}

function getHorsePlayer(seatIndex: number): SessionPlayer | undefined {
  return props.players.find((player) => player.seatIndex === seatIndex)
}

function getHorseColor(seatIndex: number): string {
  return HORSE_COLORS[seatIndex % HORSE_COLORS.length]!
}

function isSlowed(speed: number, progress: number, hold: boolean): boolean {
  const reference = hold ? maxSpeedForProgress(progress) : maxSpeedForProgress(progress) * 0.95
  return speed < reference * 0.85
}

function tickLoop(timestamp: number): void {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
  }

  const dt = Math.min(timestamp - lastTimestamp, 32)
  lastTimestamp = timestamp

  const previousPhase = game.state.phase
  game.tick(dt)

  if (previousPhase === 'countdown' && game.state.phase === 'racing' && !hasPlayedStart) {
    play('start')
    hasPlayedStart = true
  }

  for (const horse of game.state.horses) {
    const previous = previousSlowdowns.get(horse.seatIndex) ?? 0
    if (horse.slowdownUntil > previous) {
      play('hit')
      previousSlowdowns.set(horse.seatIndex, horse.slowdownUntil)
    }
  }

  for (const player of props.players) {
    if (player.type !== 'ai') continue
    const actions = chooseHorseRacingActions(game.state, player.seatIndex, {
      difficulty: aiDifficulty.value,
    })
    game.setHold(player.seatIndex, actions.hold)
    if (actions.jump) {
      game.jump(player.seatIndex)
    }
  }

  syncState()

  const winnerSeat = game.getWinnerSeatIndex()
  if (winnerSeat !== null) {
    if (!hasEmittedComplete) {
      hasEmittedComplete = true
      play('win')
      emit('complete', [winnerSeat])
    }
    return
  }

  rafId = requestAnimationFrame(tickLoop)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown, { passive: false })
  document.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', handleWindowBlur)
  rafId = requestAnimationFrame(tickLoop)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('blur', handleWindowBlur)
  keysHeld.clear()
  clearAllHolds()
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
    <div class="flex items-center justify-between gap-3 text-sm font-semibold">
      <p class="text-[var(--color-ink)]">Strecke · ca. 2–3 Min</p>
      <p class="tabular-nums text-[var(--text-muted)]">{{ Math.round(cameraProgress) }} / {{ TRACK_LENGTH }} m</p>
    </div>
    <div class="h-3 overflow-hidden rounded-full bg-[#dfbd8c]/60">
      <div
        class="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-100 ease-linear"
        :style="{ width: `${raceProgressPercent}%` }"
      />
    </div>

    <div class="relative overflow-hidden rounded-[1.75rem] border-[6px] border-[#2b2118] shadow-[0_18px_0_#2b2118]">
      <div
        class="horse-track relative h-[min(52vh,420px)] w-full"
        role="img"
        aria-label="Pferderennen Bahn"
      >
        <div
          v-for="hurdle in state.hurdles"
          :key="`hurdle-${hurdle.id}`"
          class="absolute z-10 -translate-x-1/2"
          :style="{
            left: `${progressToLeftPercent(hurdle.progress)}%`,
            bottom: '18%',
          }"
        >
          <div class="flex h-16 w-3 flex-col items-center sm:h-20 sm:w-3.5">
            <div class="h-2 w-7 rounded-sm bg-[#8b5a2b] sm:w-8" />
            <div class="h-full w-full rounded-sm bg-[#c4a574] ring-2 ring-[#6b4423]" />
          </div>
        </div>

        <div
          v-for="horse in state.horses"
          :key="`horse-${horse.seatIndex}`"
          class="absolute z-20 -translate-x-1/2 transition-[bottom] duration-100 ease-out"
          :class="isSlowed(horse.speed, horse.progress, horse.hold) ? 'opacity-70' : 'opacity-100'"
          :style="{
            left: `${progressToLeftPercent(horse.progress)}%`,
            bottom: `${horseBottomPercent(horse.seatIndex, horse.airMs)}%`,
          }"
        >
          <div class="flex flex-col items-center gap-1">
            <span
              class="max-w-[5.5rem] truncate rounded-full bg-[#2b2118]/85 px-2 py-0.5 text-[0.65rem] font-bold text-[#fff6e8]"
            >
              {{ getHorsePlayer(horse.seatIndex)?.displayName ?? `P${horse.seatIndex + 1}` }}
            </span>
            <div
              class="relative h-10 w-16 sm:h-12 sm:w-20"
              :style="{ color: getHorseColor(horse.seatIndex) }"
            >
              <div
                class="absolute bottom-2 left-2 h-6 w-10 rounded-[1.2rem] sm:h-7 sm:w-12"
                :style="{ backgroundColor: getHorseColor(horse.seatIndex) }"
              />
              <div
                class="absolute bottom-4 right-1 h-5 w-5 rounded-full sm:h-6 sm:w-6"
                :style="{ backgroundColor: getHorseColor(horse.seatIndex) }"
              />
              <div class="absolute bottom-0 left-3 h-3 w-1.5 rounded-sm bg-[#2b2118]/80" />
              <div class="absolute bottom-0 left-7 h-3 w-1.5 rounded-sm bg-[#2b2118]/80" />
              <div class="absolute bottom-0 right-5 h-3 w-1.5 rounded-sm bg-[#2b2118]/80" />
              <div class="absolute bottom-0 right-2 h-3 w-1.5 rounded-sm bg-[#2b2118]/80" />
            </div>
          </div>
        </div>

        <div
          v-if="state.phase === 'countdown'"
          class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#2b2118]/55 px-4 text-center backdrop-blur-[2px]"
        >
          <p class="font-[var(--font-display)] text-7xl font-bold text-[#fff6e8] drop-shadow-md sm:text-8xl">
            {{ countdownSeconds }}
          </p>
          <p class="text-lg font-semibold text-[#fff6e8]">Gleich geht's los!</p>
          <div class="space-y-2 text-sm text-[#fff6e8]/90">
            <p v-if="humanPlayers.length >= 1">
              <strong>{{ humanPlayers[0]!.displayName }}:</strong>
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">A</kbd> halten ·
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">W</kbd> springen
            </p>
            <p v-if="humanPlayers.length >= 2">
              <strong>{{ humanPlayers[1]!.displayName }}:</strong>
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">←</kbd> halten ·
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">↑</kbd> springen
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.horse-track {
  background:
    linear-gradient(180deg, #7eb6d9 0 42%, #c8e4a8 42% 58%, #6b9e4a 58% 78%, #8b6b3d 78% 100%),
    repeating-linear-gradient(
      90deg,
      transparent 0 28px,
      rgba(255, 255, 255, 0.08) 28px 30px
    );
}
</style>
