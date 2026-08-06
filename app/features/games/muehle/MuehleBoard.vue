<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import { chooseMuehleAction } from './ai'
import {
  MUEHLE_EDGES,
  MUEHLE_POINT_COORDS,
  MUEHLE_POINT_COUNT,
  countStones,
} from './board'
import { createMuehleGame, type MuehleAction, type MuehleGameState } from './engine'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 650
const FALLBACK_COLORS = ['#e7674c', '#f2bf4f'] as const
const POINT_INDEXES = Array.from({ length: MUEHLE_POINT_COUNT }, (_, index) => index)

const game = createMuehleGame()
const { play } = useSound()
const state = ref<MuehleGameState>(game.getState())
const selectedPoint = ref<number | null>(null)
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')

const validActions = computed(() => {
  void state.value
  return game.getValidActions()
})

const placeTargets = computed(() => {
  const targets = new Set<number>()
  for (const action of validActions.value) {
    if (action.type === 'place') targets.add(action.point)
  }
  return targets
})

const moveFromPoints = computed(() => {
  const targets = new Set<number>()
  for (const action of validActions.value) {
    if (action.type === 'move') targets.add(action.from)
  }
  return targets
})

const moveToPoints = computed(() => {
  const targets = new Set<number>()
  if (selectedPoint.value === null) return targets
  for (const action of validActions.value) {
    if (action.type === 'move' && action.from === selectedPoint.value) {
      targets.add(action.to)
    }
  }
  return targets
})

const removeTargets = computed(() => {
  const targets = new Set<number>()
  for (const action of validActions.value) {
    if (action.type === 'remove') targets.add(action.point)
  }
  return targets
})

const turnHint = computed(() => {
  if (isAiTurn.value) {
    if (state.value.phase === 'removing') return 'Die KI entfernt einen Stein…'
    if (state.value.phase === 'placing') return 'Die KI setzt einen Stein…'
    return 'Die KI zieht…'
  }
  if (state.value.phase === 'removing') return 'Wähle einen Gegnerstein zum Entfernen.'
  if (state.value.phase === 'placing') return 'Setze einen Stein auf einen freien Punkt.'
  if (selectedPoint.value === null) return 'Wähle einen eigenen Stein.'
  return 'Wähle das Zielfeld.'
})

const stonesLeft = computed(() => [
  state.value.stonesToPlace[0],
  state.value.stonesToPlace[1],
])

function seatColor(seatIndex: number): string {
  return props.players[seatIndex]?.color ?? FALLBACK_COLORS[seatIndex] ?? FALLBACK_COLORS[0]
}

function applyAction(action: MuehleAction) {
  const result = game.applyAction(action)
  state.value = result.state
  selectedPoint.value = null

  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function onPointClick(point: number) {
  if (isAiTurn.value || game.isTerminal()) return

  if (state.value.phase === 'placing') {
    if (!placeTargets.value.has(point)) return
    applyAction({ type: 'place', point })
    return
  }

  if (state.value.phase === 'removing') {
    if (!removeTargets.value.has(point)) return
    applyAction({ type: 'remove', point })
    return
  }

  // moving
  if (selectedPoint.value === point) {
    selectedPoint.value = null
    return
  }

  if (selectedPoint.value !== null && moveToPoints.value.has(point)) {
    applyAction({ type: 'move', from: selectedPoint.value, to: point })
    return
  }

  if (moveFromPoints.value.has(point)) {
    selectedPoint.value = point
  }
}

function pointAriaLabel(point: number): string {
  const owner = state.value.points[point]
  const ownerName = owner === null
    ? 'leer'
    : (props.players[owner]?.displayName ?? `Spieler ${owner + 1}`)
  return `Punkt ${point + 1}: ${ownerName}`
}

function scheduleAiAction() {
  if (!isAiTurn.value || game.isTerminal() || aiTimer) return

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = chooseMuehleAction(state.value, game.getValidActions(), {
      difficulty: aiDifficulty.value,
    })
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [
    state.value.currentPlayerIndex,
    state.value.phase,
    state.value.lastAction?.type,
    state.value.points.join(','),
  ],
  () => {
    selectedPoint.value = null
    scheduleAiAction()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
})
</script>

<template>
  <section class="mx-auto w-full max-w-lg sm:max-w-xl">
    <TurnBanner
      v-if="currentPlayer"
      :player-name="currentPlayer.displayName"
      :is-ai="isAiTurn"
      :hint="turnHint"
    />

    <div
      class="mt-4 rounded-2xl bg-[#5c4030] p-3 shadow-[0_4px_0_#3d2a1f] ring-2 ring-[#3d2a1f] sm:mt-6 sm:rounded-3xl sm:p-4 sm:shadow-[0_6px_0_#3d2a1f]"
    >
      <svg
        viewBox="0 0 100 100"
        class="mx-auto block h-auto w-full max-w-[28rem]"
        role="img"
        aria-label="Mühle Brett"
      >
        <rect x="0" y="0" width="100" height="100" rx="4" fill="#c4a574" />

        <line
          v-for="([from, to], edgeIndex) in MUEHLE_EDGES"
          :key="`edge-${edgeIndex}`"
          :x1="MUEHLE_POINT_COORDS[from]!.x"
          :y1="MUEHLE_POINT_COORDS[from]!.y"
          :x2="MUEHLE_POINT_COORDS[to]!.x"
          :y2="MUEHLE_POINT_COORDS[to]!.y"
          stroke="#3d2a1f"
          stroke-width="1.6"
          stroke-linecap="round"
        />

        <g v-for="point in POINT_INDEXES" :key="`point-${point}`">
          <circle
            :cx="MUEHLE_POINT_COORDS[point]!.x"
            :cy="MUEHLE_POINT_COORDS[point]!.y"
            r="5.2"
            class="cursor-pointer"
            :fill="state.points[point] === null ? '#efe2c8' : seatColor(state.points[point]!)"
            :stroke="selectedPoint === point
              ? '#1d4ed8'
              : placeTargets.has(point) || moveToPoints.has(point) || removeTargets.has(point)
                ? '#166534'
                : moveFromPoints.has(point)
                  ? '#9a3412'
                  : '#3d2a1f'"
            :stroke-width="selectedPoint === point || placeTargets.has(point) || moveToPoints.has(point) || removeTargets.has(point) || moveFromPoints.has(point) ? 1.8 : 1.1"
            role="button"
            tabindex="0"
            :aria-label="pointAriaLabel(point)"
            @click="onPointClick(point)"
            @keydown.enter.prevent="onPointClick(point)"
            @keydown.space.prevent="onPointClick(point)"
          />
        </g>
      </svg>
    </div>

    <dl class="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
      <div
        v-for="(player, playerIndex) in players"
        :key="player.seatIndex"
        class="flex items-center gap-2 rounded-xl bg-[var(--color-panel)] px-3 py-2 ring-2 ring-[#dfbd8c] sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3"
        :class="playerIndex === state.currentPlayerIndex ? 'ring-[var(--color-accent)]' : ''"
      >
        <span
          class="h-6 w-6 shrink-0 rounded-full border-2 border-black/10 sm:h-8 sm:w-8"
          :style="{ backgroundColor: seatColor(playerIndex) }"
          aria-hidden="true"
        />
        <div>
          <dt class="font-bold">{{ player.displayName }}</dt>
          <dd class="text-sm">
            {{ player.type === 'ai' ? 'KI' : 'Mensch' }}
            ·
            {{ countStones(state.points, playerIndex) }} auf dem Brett
            <template v-if="stonesLeft[playerIndex]! > 0">
              · {{ stonesLeft[playerIndex] }} zum Setzen
            </template>
          </dd>
        </div>
      </div>
    </dl>
  </section>
</template>
