<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import { chooseConnectFourAction } from './ai'
import { createConnectFourGame, type ConnectFourAction, type ConnectFourGameState } from './engine'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 650
const COLUMN_COUNT = 7
const ROW_COUNT = 6
const FALLBACK_COLORS = ['#e7674c', '#f2bf4f'] as const

const game = createConnectFourGame()
const { play } = useSound()
const state = ref<ConnectFourGameState>(game.getState())
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const validColumns = computed(() => {
  void state.value
  return new Set(
    game.getValidActions()
      .filter((action): action is Extract<ConnectFourAction, { type: 'drop' }> => action.type === 'drop')
      .map((action) => action.column),
  )
})
const displayRows = computed(() =>
  Array.from({ length: ROW_COUNT }, (_, visualRow) => ROW_COUNT - 1 - visualRow),
)
const columns = Array.from({ length: COLUMN_COUNT }, (_, column) => column)

function seatColor(seatIndex: number): string {
  return props.players[seatIndex]?.color ?? FALLBACK_COLORS[seatIndex] ?? FALLBACK_COLORS[0]
}

function applyAction(action: ConnectFourAction) {
  const result = game.applyAction(action)
  state.value = result.state

  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function dropInColumn(column: number) {
  if (isAiTurn.value || !validColumns.value.has(column) || game.isTerminal()) return
  applyAction({ type: 'drop', column })
}

function scheduleAiAction() {
  if (!isAiTurn.value || game.isTerminal() || aiTimer) return

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = chooseConnectFourAction(state.value, game.getValidActions(), { difficulty: aiDifficulty.value })
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [state.value.currentPlayerIndex, state.value.lastMove?.column, state.value.lastMove?.row],
  scheduleAiAction,
  { immediate: true },
)

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
})
</script>

<template>
  <section class="mx-auto w-full max-w-md sm:max-w-lg">
    <TurnBanner
      v-if="currentPlayer"
      :player-name="currentPlayer.displayName"
      :is-ai="isAiTurn"
      :hint="isAiTurn ? 'Die KI legt einen Stein…' : 'Wähle eine Spalte.'"
    />

    <div
      class="mt-4 rounded-2xl bg-[#3b6ea5] p-2 shadow-[0_4px_0_#2a4f78] ring-2 ring-[#2a4f78] sm:mt-6 sm:rounded-3xl sm:p-3 sm:shadow-[0_6px_0_#2a4f78]"
      role="grid"
      aria-label="Vier gewinnt Brett"
    >
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
        <button
          v-for="column in columns"
          :key="`drop-${column}`"
          type="button"
          class="min-h-8 rounded-xl bg-[#2a4f78]/35 text-xs font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:translate-y-0 disabled:opacity-50 sm:min-h-9 sm:rounded-2xl sm:text-sm"
          :disabled="isAiTurn || !validColumns.has(column)"
          :aria-label="`Spalte ${column + 1}`"
          @click="dropInColumn(column)"
        >
          ↓
        </button>
      </div>

      <div class="mt-1.5 grid grid-cols-7 gap-1 sm:mt-2 sm:gap-1.5" role="presentation">
        <template v-for="row in displayRows" :key="`row-${row}`">
          <div
            v-for="column in columns"
            :key="`${column}-${row}`"
            class="aspect-square rounded-full border-2 border-[#2a4f78] bg-[#dce9f7] shadow-inner sm:border-[3px]"
            role="gridcell"
            :aria-label="state.cells[column]![row] === null
              ? `Spalte ${column + 1}, Reihe ${row + 1}: leer`
              : `Spalte ${column + 1}, Reihe ${row + 1}: ${players[state.cells[column]![row]!]?.displayName ?? 'Stein'}`"
          >
            <span
              v-if="state.cells[column]![row] !== null"
              class="block h-full w-full rounded-full border-2 border-black/15 shadow-[0_2px_0_rgba(0,0,0,0.2)] sm:border-[3px] sm:shadow-[0_3px_0_rgba(0,0,0,0.2)]"
              :style="{ backgroundColor: seatColor(state.cells[column]![row]!) }"
              aria-hidden="true"
            />
          </div>
        </template>
      </div>
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
          <dd class="text-sm">{{ player.type === 'ai' ? 'KI' : 'Mensch' }}</dd>
        </div>
      </div>
    </dl>
  </section>
</template>
