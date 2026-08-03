<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import {
  BASE_SPEED,
  TRACK_LENGTH,
  VIEW_AHEAD,
  VIEW_BEHIND,
  createRacingGame,
  speedMultForProgress,
  type RacingState,
} from './engine'
import { chooseRacingLaneDelta } from './ai'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()

const CAR_COLORS = ['#e45b3a', '#f0b429', '#3d8fd1', '#4faf6a'] as const

const game = createRacingGame({
  players: props.players.map((player) => ({ seatIndex: player.seatIndex, type: player.type })),
})

const state = ref<RacingState>(cloneState())

const humanPlayers = computed(() => props.players.filter((player) => player.type === 'human'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))
const cameraProgress = computed(() => Math.max(0, ...state.value.cars.map((car) => car.progress)))
const raceProgressPercent = computed(() => Math.min(100, (cameraProgress.value / TRACK_LENGTH) * 100))

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
const previousSlowdowns = new Map<number, number>()
const keysHeld = new Set<string>()

function cloneState(): RacingState {
  return {
    ...game.state,
    cars: game.state.cars.map((car) => ({ ...car })),
    obstacles: game.state.obstacles.map((obstacle) => ({ ...obstacle })),
  }
}

function syncState(): void {
  state.value = cloneState()
}

function applyLaneIntent(seatIndex: number, laneDelta: -1 | 1): void {
  game.setLaneIntent(seatIndex, laneDelta)
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
    applyLaneIntent(humans[0]!.seatIndex, -1)
  }
  else if (humans.length >= 1 && (key === 'd' || key === 'D')) {
    applyLaneIntent(humans[0]!.seatIndex, 1)
  }
  else if (humans.length >= 2 && key === 'ArrowLeft') {
    applyLaneIntent(humans[1]!.seatIndex, -1)
  }
  else if (humans.length >= 2 && key === 'ArrowRight') {
    applyLaneIntent(humans[1]!.seatIndex, 1)
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  keysHeld.delete(event.key)
}

function progressToTopPercent(progress: number): number {
  const span = VIEW_AHEAD + VIEW_BEHIND
  const top = ((cameraProgress.value + VIEW_AHEAD - progress) / span) * 100
  return Math.min(110, Math.max(-10, top))
}

function laneLeftPercent(lane: number): number {
  return (lane + 0.5) * (100 / 3)
}

function getCarPlayer(seatIndex: number): SessionPlayer | undefined {
  return props.players.find((player) => player.seatIndex === seatIndex)
}

function getCarColor(seatIndex: number): string {
  return CAR_COLORS[seatIndex % CAR_COLORS.length]!
}

function isSlowed(speed: number, progress: number): boolean {
  return speed < BASE_SPEED * speedMultForProgress(progress) * 0.95
}

function tickLoop(timestamp: number): void {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
  }

  const dt = Math.min(timestamp - lastTimestamp, 32)
  lastTimestamp = timestamp

  const previousPhase = game.state.phase
  game.tick(dt)
  syncState()

  if (previousPhase === 'countdown' && state.value.phase === 'racing' && !hasPlayedStart) {
    play('start')
    hasPlayedStart = true
  }

  for (const car of state.value.cars) {
    const previous = previousSlowdowns.get(car.seatIndex) ?? 0
    if (car.slowdownUntil > previous) {
      play('hit')
      previousSlowdowns.set(car.seatIndex, car.slowdownUntil)
    }
  }

  for (const player of props.players) {
    if (player.type !== 'ai') continue
    const delta = chooseRacingLaneDelta(game.state, player.seatIndex)
    if (delta) {
      game.setLaneIntent(player.seatIndex, delta)
    }
  }
  syncState()

  const winnerSeat = game.getWinnerSeatIndex()
  if (winnerSeat !== null) {
    play('win')
    emit('complete', [winnerSeat])
    return
  }

  rafId = requestAnimationFrame(tickLoop)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown, { passive: false })
  document.addEventListener('keyup', handleKeyUp)
  rafId = requestAnimationFrame(tickLoop)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-4">
    <div class="flex items-center justify-between gap-3 text-sm font-semibold">
      <p class="text-[var(--color-ink)]">Strecke · ca. 3 Min</p>
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
        class="racing-road relative h-[min(68vh,560px)] w-full"
        role="img"
        aria-label="Spurrennen Bahn"
      >
        <div class="pointer-events-none absolute inset-y-0 left-0 w-[8%] bg-[#2f6b3c]" />
        <div class="pointer-events-none absolute inset-y-0 right-0 w-[8%] bg-[#2f6b3c]" />

        <div
          v-for="lane in 3"
          :key="`lane-${lane}`"
          class="absolute top-0 h-full border-white/25"
          :class="lane < 3 ? 'border-r-2 border-dashed' : ''"
          :style="{ left: `${((lane - 1) / 3) * 100}%`, width: `${100 / 3}%` }"
        />

        <div
          v-for="obstacle in state.obstacles"
          :key="`obstacle-${obstacle.id}`"
          class="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          :style="{
            left: `${laneLeftPercent(obstacle.lane)}%`,
            top: `${progressToTopPercent(obstacle.progress)}%`,
          }"
        >
          <div class="flex h-10 w-8 flex-col items-center drop-shadow-md sm:h-12 sm:w-10">
            <div class="h-0 w-0 border-x-[14px] border-b-[28px] border-x-transparent border-b-[#e4572e] sm:border-x-[16px] sm:border-b-[32px]" />
            <div class="mt-[-2px] h-2 w-7 rounded-sm bg-[#fff6e8] sm:w-8" />
          </div>
        </div>

        <div
          v-for="car in state.cars"
          :key="`car-${car.seatIndex}`"
          class="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-100 ease-out"
          :class="isSlowed(car.speed, car.progress) ? 'opacity-70' : 'opacity-100'"
          :style="{
            left: `${laneLeftPercent(car.lane)}%`,
            top: `${progressToTopPercent(car.progress)}%`,
          }"
        >
          <div class="flex flex-col items-center gap-1">
            <span
              class="max-w-[5.5rem] truncate rounded-full bg-[#2b2118]/85 px-2 py-0.5 text-[0.65rem] font-bold text-[#fff6e8]"
            >
              {{ getCarPlayer(car.seatIndex)?.displayName ?? `P${car.seatIndex + 1}` }}
            </span>
            <div
              class="relative h-14 w-10 rounded-t-[1.1rem] rounded-b-md shadow-lg sm:h-16 sm:w-11"
              :style="{ backgroundColor: getCarColor(car.seatIndex) }"
            >
              <div class="absolute inset-x-1.5 top-2 h-4 rounded-md bg-[#fff6e8]/85" />
              <div class="absolute bottom-1 left-0.5 h-2.5 w-2 rounded-sm bg-[#2b2118]" />
              <div class="absolute bottom-1 right-0.5 h-2.5 w-2 rounded-sm bg-[#2b2118]" />
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
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">A</kbd>/<kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">D</kbd>
            </p>
            <p v-if="humanPlayers.length >= 2">
              <strong>{{ humanPlayers[1]!.displayName }}:</strong>
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">←</kbd>/<kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">→</kbd>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.racing-road {
  background:
    linear-gradient(90deg, #1f1a16 0 8%, transparent 8% 92%, #1f1a16 92% 100%),
    repeating-linear-gradient(
      180deg,
      #4a4540 0 18px,
      #524c46 18px 36px
    );
}
</style>
