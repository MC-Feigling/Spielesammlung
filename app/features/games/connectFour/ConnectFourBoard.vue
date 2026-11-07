<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import { chooseConnectFourAction } from './ai'
import { createConnectFourGame, findWinningLine, type ConnectFourAction, type ConnectFourGameState } from './engine'
import { playerColor } from '~/constants/players'
import type { GameStanding } from '../shared/standings'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[], standings?: GameStanding[]]
}>()

const AI_ACTION_DELAY_MS = 650
const COLUMN_COUNT = 7
const ROW_COUNT = 6
const WIN_SHOW_MS = 1400

const game = createConnectFourGame()
const { play } = useSound()
const state = ref<ConnectFourGameState>(game.getState())
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)
let aiTimer: ReturnType<typeof setTimeout> | undefined
let winTimer: ReturnType<typeof setTimeout> | undefined
const hoverColumn = ref<number | null>(null)
const winningCells = ref<Set<string>>(new Set())

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
  return playerColor(seatIndex)
}

const canHumanDrop = computed(() => !isAiTurn.value && !game.isTerminal() && winningCells.value.size === 0)

function isLastMove(column: number, row: number): boolean {
  return state.value.lastMove?.column === column && state.value.lastMove?.row === row
}

/** How far (in cells) a new disc falls from the top: used for the drop animation. */
function dropDistance(row: number): number {
  return ROW_COUNT - row
}

function applyAction(action: ConnectFourAction) {
  const result = game.applyAction(action)
  state.value = result.state

  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    const line = findWinningLine(result.state.cells, result.state.lastMove)
    winningCells.value = new Set(line.map((cell) => `${cell.column}-${cell.row}`))
    const winners = result.winnerSeatIndexes
    winTimer = setTimeout(() => emit('complete', winners), line.length > 0 ? WIN_SHOW_MS : 0)
  }
}

function dropInColumn(column: number) {
  if (!canHumanDrop.value || !validColumns.value.has(column)) return
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
  if (winTimer) clearTimeout(winTimer)
})
</script>

<template>
  <section
    class="mx-auto w-full"
    :style="{ maxWidth: 'max(20rem, min(34rem, calc((100vh - 15rem) * 0.98)))' }"
  >
    <TurnBanner
      v-if="currentPlayer"
      :player-name="currentPlayer.displayName"
      :seat-index="currentPlayer.seatIndex"
      :is-ai="isAiTurn"
      :hint="isAiTurn ? 'Die KI legt einen Stein…' : 'Wähle eine Spalte.'"
    />

    <div
      class="rounded-2xl bg-[#3b6ea5] p-2 shadow-[0_6px_0_#2a4f78] ring-2 ring-[#2a4f78] sm:rounded-3xl sm:p-3"
      role="grid"
      aria-label="Vier gewinnt Brett"
      @mouseleave="hoverColumn = null"
    >
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
        <button
          v-for="column in columns"
          :key="`drop-${column}`"
          type="button"
          class="drop-btn grid aspect-[1/0.8] place-items-center rounded-xl bg-[#2a4f78]/35 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50"
          :disabled="!canHumanDrop || !validColumns.has(column)"
          :aria-label="`Spalte ${column + 1}`"
          @mouseenter="hoverColumn = column"
          @focus="hoverColumn = column"
          @click="dropInColumn(column)"
        >
          <span
            v-if="hoverColumn === column && canHumanDrop && validColumns.has(column)"
            class="preview block h-[78%] w-[78%] rounded-full border-2 border-black/15"
            :style="{ backgroundColor: seatColor(state.currentPlayerIndex) }"
            aria-hidden="true"
          />
          <span v-else class="text-sm font-bold text-white/80" aria-hidden="true">↓</span>
        </button>
      </div>

      <div class="mt-1.5 grid grid-cols-7 gap-1 overflow-hidden sm:mt-2 sm:gap-1.5" role="presentation">
        <template v-for="row in displayRows" :key="`row-${row}`">
          <div
            v-for="column in columns"
            :key="`${column}-${row}`"
            class="cell aspect-square rounded-full border-2 border-[#2a4f78] bg-[#dce9f7] shadow-inner sm:border-[3px]"
            :class="{
              'is-hover-col': hoverColumn === column && canHumanDrop,
              'is-win': winningCells.has(`${column}-${row}`),
            }"
            role="gridcell"
            :aria-label="state.cells[column]![row] === null
              ? `Spalte ${column + 1}, Reihe ${row + 1}: leer`
              : `Spalte ${column + 1}, Reihe ${row + 1}: ${players[state.cells[column]![row]!]?.displayName ?? 'Stein'}`"
            @mouseenter="hoverColumn = column"
            @click="dropInColumn(column)"
          >
            <span
              v-if="state.cells[column]![row] !== null"
              :key="`disc-${column}-${row}-${state.cells[column]![row]}`"
              class="disc block h-full w-full rounded-full border-2 border-black/15 shadow-[inset_0_-4px_0_rgba(0,0,0,0.18),0_2px_0_rgba(0,0,0,0.2)] sm:border-[3px]"
              :class="{ 'is-dropping': isLastMove(column, row) }"
              :style="{ backgroundColor: seatColor(state.cells[column]![row]!), '--drop': dropDistance(row) }"
              aria-hidden="true"
            />
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cell {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cell.is-hover-col {
  background-color: #f3f8fe;
}

.disc.is-dropping {
  animation: c4-drop calc(0.12s + var(--drop) * 0.05s) cubic-bezier(0.5, 0, 0.75, 0) both,
    c4-bounce 0.18s ease-out calc(0.12s + var(--drop) * 0.05s);
}

.cell.is-win .disc {
  animation: c4-win 0.5s ease-in-out infinite alternate;
  box-shadow: 0 0 0 4px #fff, 0 0 18px 6px #ffd23f;
}

.preview {
  animation: c4-bob 0.6s ease-in-out infinite alternate;
}

@keyframes c4-drop {
  from { transform: translateY(calc(var(--drop) * -112%)); }
  to { transform: translateY(0); }
}

@keyframes c4-bounce {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8%); }
  100% { transform: translateY(0); }
}

@keyframes c4-win {
  from { transform: scale(1); }
  to { transform: scale(0.86); }
}

@keyframes c4-bob {
  from { transform: translateY(-6%); }
  to { transform: translateY(6%); }
}

@media (prefers-reduced-motion: reduce) {
  .disc.is-dropping,
  .cell.is-win .disc,
  .preview {
    animation: none;
  }
}
</style>
