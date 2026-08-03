<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { createRacingGame, type RacingGame, type RacingState } from './engine'
import { chooseRacingLaneDelta } from './ai'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()

const game = createRacingGame({
  players: props.players.map((p) => ({ seatIndex: p.seatIndex, type: p.type })),
})

const state = ref<RacingState>({
  ...game.state,
  cars: game.state.cars.map((c) => ({ ...c })),
  obstacles: game.state.obstacles.map((o) => ({ ...o })),
})

const cameraProgress = computed(() => Math.max(...state.value.cars.map((c) => c.progress)))

const humanPlayers = computed(() => props.players.filter((p) => p.type === 'human'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
const previousSlowdowns = new Map<number, number>()
const keyDownStates = new Map<string, boolean>()

function handleKeyDown(event: KeyboardEvent) {
  if (state.value.phase !== 'racing') return

  if (keyDownStates.get(event.key)) return
  keyDownStates.set(event.key, true)

  const humans = humanPlayers.value
  if (humans.length >= 1 && (event.key === 'a' || event.key === 'A')) {
    game.setLaneIntent(humans[0].seatIndex, -1)
  }
  else if (humans.length >= 1 && (event.key === 'd' || event.key === 'D')) {
    game.setLaneIntent(humans[0].seatIndex, 1)
  }
  else if (humans.length >= 2 && event.key === 'ArrowLeft') {
    game.setLaneIntent(humans[1].seatIndex, -1)
  }
  else if (humans.length >= 2 && event.key === 'ArrowRight') {
    game.setLaneIntent(humans[1].seatIndex, 1)
  }
}

function handleKeyUp(event: KeyboardEvent) {
  keyDownStates.set(event.key, false)
}

function tickLoop(timestamp: number) {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
  }

  const dt = timestamp - lastTimestamp
  lastTimestamp = timestamp

  const previousPhase = state.value.phase
  game.tick(dt)

  state.value = {
    ...game.state,
    cars: game.state.cars.map((c) => ({ ...c })),
    obstacles: game.state.obstacles.map((o) => ({ ...o })),
  }

  if (previousPhase === 'countdown' && state.value.phase === 'racing' && !hasPlayedStart) {
    play('start')
    hasPlayedStart = true
  }

  for (const car of state.value.cars) {
    const prevSlowdown = previousSlowdowns.get(car.seatIndex) ?? 0
    if (car.slowdownUntil > prevSlowdown) {
      play('hit')
      previousSlowdowns.set(car.seatIndex, car.slowdownUntil)
    }
  }

  const aiPlayers = props.players.filter((p) => p.type === 'ai')
  for (const aiPlayer of aiPlayers) {
    const delta = chooseRacingLaneDelta(state.value, aiPlayer.seatIndex)
    if (delta) {
      game.setLaneIntent(aiPlayer.seatIndex, delta)
    }
  }

  const winnerSeat = game.getWinnerSeatIndex()
  if (winnerSeat !== null) {
    play('win')
    emit('complete', [winnerSeat])
    return
  }

  rafId = requestAnimationFrame(tickLoop)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
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

function getCarPlayerName(seatIndex: number): string {
  return props.players.find((p) => p.seatIndex === seatIndex)?.displayName ?? `Spieler ${seatIndex + 1}`
}

function getCarColor(seatIndex: number): string {
  const colors = ['#e7674c', '#f2bf4f', '#5ca4d6', '#66b57a']
  return colors[seatIndex % colors.length]
}

function getLaneY(lane: number): number {
  return 20 + lane * 30
}

function getCarX(progress: number): number {
  const relativeProgress = progress - cameraProgress.value
  return 50 + relativeProgress * 5
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <section v-if="state.phase === 'countdown'" class="rounded-2xl bg-[var(--color-panel)] p-8 text-center shadow-md ring-2 ring-[#dfbd8c]">
      <div class="mb-6">
        <p class="font-[var(--font-display)] text-6xl font-bold text-[var(--color-accent)]">
          {{ countdownSeconds }}
        </p>
        <p class="mt-2 text-lg text-[var(--text-base)]">Gleich geht's los!</p>
      </div>
      <div class="space-y-2 text-sm text-[var(--text-muted)]">
        <p v-if="humanPlayers.length >= 1">
          <strong>{{ humanPlayers[0].displayName }}:</strong> Tasten <kbd class="rounded bg-[#2b2118]/10 px-2 py-1 font-mono">A</kbd> / <kbd class="rounded bg-[#2b2118]/10 px-2 py-1 font-mono">D</kbd>
        </p>
        <p v-if="humanPlayers.length >= 2">
          <strong>{{ humanPlayers[1].displayName }}:</strong> Pfeiltasten <kbd class="rounded bg-[#2b2118]/10 px-2 py-1 font-mono">←</kbd> / <kbd class="rounded bg-[#2b2118]/10 px-2 py-1 font-mono">→</kbd>
        </p>
      </div>
    </section>

    <section v-if="state.phase === 'racing'" class="rounded-2xl bg-[var(--color-panel)] p-6 shadow-md ring-2 ring-[#dfbd8c]">
      <div class="relative h-[400px] overflow-hidden rounded-xl bg-[#8b7355]">
        <svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line
            v-for="lane in 4"
            :key="`lane-${lane}`"
            x1="0"
            :y1="getLaneY(lane - 1)"
            x2="100"
            :y2="getLaneY(lane - 1)"
            stroke="#fffaf0"
            stroke-width="0.3"
            stroke-dasharray="2,1"
            opacity="0.4"
          />

          <rect
            v-for="obstacle in state.obstacles"
            :key="`obstacle-${obstacle.id}`"
            :x="getCarX(obstacle.progress) - 3"
            :y="getLaneY(obstacle.lane) - 4"
            width="6"
            height="8"
            fill="#4c3424"
            rx="1"
          />

          <circle
            v-for="car in state.cars"
            :key="`car-${car.seatIndex}`"
            :cx="getCarX(car.progress)"
            :cy="getLaneY(car.lane)"
            r="4"
            :fill="getCarColor(car.seatIndex)"
            stroke="#2b2118"
            stroke-width="0.5"
          />
        </svg>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="car in state.cars"
          :key="`progress-${car.seatIndex}`"
          class="rounded-lg border-2 p-2 text-center"
          :style="{
            borderColor: getCarColor(car.seatIndex),
            backgroundColor: `${getCarColor(car.seatIndex)}20`,
          }"
        >
          <p class="truncate text-sm font-semibold">{{ getCarPlayerName(car.seatIndex) }}</p>
          <p class="text-xs text-[var(--text-muted)]">{{ Math.round(car.progress) }}m</p>
        </div>
      </div>
    </section>
  </div>
</template>
