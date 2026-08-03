<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import {
  getRingIndex,
  isInHome,
  isInYard,
  LUDO_HOME_LENGTH,
  LUDO_PLAYER_COLORS,
  LUDO_RING_SIZE,
  LUDO_START_INDEXES,
  type LudoPlayerColor,
} from './board'
import {
  BOARD_GRID_SIZE,
  getCenterCell,
  getHomeCell,
  getRingCell,
  getRingEdges,
  getYardCell,
  type BoardCell,
} from './boardLayout'
import { chooseLudoAction } from './ai'
import { canControlPiece, createLudoGame, type LudoAction, type LudoGameState, type LudoMoveFrom } from './engine'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 700
const PATH_STROKE = '#2b2118'
const BOARD_FACE = '#fffaf0'
const SEAT_COUNT = 4
const YARD_SLOT_COUNT = 4
const CIRCLE_RADIUS = 0.36
const HUB_RADIUS = 0.42

const COLOR_CLASSES: Record<LudoPlayerColor, string> = {
  red: 'border-[#9e3b24] bg-[#e7674c] text-white',
  yellow: 'border-[#a56e16] bg-[#f2bf4f] text-[#4c3424]',
  blue: 'border-[#26628e] bg-[#5ca4d6] text-white',
  green: 'border-[#2f7044] bg-[#66b57a] text-white',
}

const COLOR_HEX: Record<LudoPlayerColor, string> = {
  red: '#e7674c',
  yellow: '#f2bf4f',
  blue: '#5ca4d6',
  green: '#66b57a',
}

const CORNER_WASHES: ReadonlyArray<{
  color: LudoPlayerColor
  x: number
  y: number
  width: number
  height: number
}> = [
  { color: 'green', x: 0, y: 0, width: 4, height: 4 },
  { color: 'red', x: 7, y: 0, width: 4, height: 4 },
  { color: 'yellow', x: 7, y: 7, width: 4, height: 4 },
  { color: 'blue', x: 0, y: 7, width: 4, height: 4 },
]

const game = createLudoGame({ playerCount: props.players.length })
const { play } = useSound()
const state = ref<LudoGameState>(game.getState())
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const validActions = computed(() => game.getValidActions())
const canRoll = computed(() => validActions.value.some((action) => action.type === 'roll'))
const moveActions = computed(() => validActions.value.filter((action): action is Extract<LudoAction, { type: 'move' }> => action.type === 'move'))

const ringCells = Array.from({ length: LUDO_RING_SIZE }, (_, index) => getRingCell(index))
const ringEdges = getRingEdges()
const centerCell = getCenterCell()

const startCells = LUDO_START_INDEXES.map((ringIndex, playerIndex) => ({
  cell: getRingCell(ringIndex),
  color: LUDO_PLAYER_COLORS[playerIndex],
}))

const homeCells = Array.from({ length: SEAT_COUNT }, (_, playerIndex) =>
  Array.from({ length: LUDO_HOME_LENGTH }, (_, homeStep) => ({
    cell: getHomeCell(playerIndex, homeStep),
    color: LUDO_PLAYER_COLORS[playerIndex],
  })),
).flat()

const yardCells = Array.from({ length: SEAT_COUNT }, (_, playerIndex) =>
  Array.from({ length: YARD_SLOT_COUNT }, (_, slotIndex) => ({
    cell: getYardCell(playerIndex, slotIndex),
    color: LUDO_PLAYER_COLORS[playerIndex],
  })),
).flat()

const ringPieces = computed(() => state.value.pieces.flatMap((pieces, playerIndex) => (
  pieces.flatMap((piece, pieceIndex) => {
    const ringIndex = getRingIndex(playerIndex, piece.progress)
    if (ringIndex === null) return []
    return [{
      playerIndex,
      pieceIndex,
      ringIndex,
      color: LUDO_PLAYER_COLORS[playerIndex],
      style: cellStyle(getRingCell(ringIndex)),
    }]
  })
)))

function cellCenter(cell: BoardCell): { cx: number, cy: number } {
  return { cx: cell.col + 0.5, cy: cell.row + 0.5 }
}

function cellStyle(cell: BoardCell): { left: string, top: string } {
  return {
    left: `${((cell.col + 0.5) / BOARD_GRID_SIZE) * 100}%`,
    top: `${((cell.row + 0.5) / BOARD_GRID_SIZE) * 100}%`,
  }
}

function colorClass(playerIndex: number) {
  return COLOR_CLASSES[LUDO_PLAYER_COLORS[playerIndex]]
}

function isValidMove(pieceIndex: number, from: LudoMoveFrom) {
  return moveActions.value.some((action) => action.pieceIndex === pieceIndex && action.from === from)
}

function applyAction(action: LudoAction) {
  const result = game.applyAction(action)
  state.value = result.state

  if (action.type === 'roll') play('dice')
  if (state.value.lastEvent === 'capture') play('hit')
  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function rollDice() {
  if (isAiTurn.value || !canRoll.value) return
  applyAction({ type: 'roll' })
}

function movePiece(playerIndex: number, pieceIndex: number, from: LudoMoveFrom) {
  if (isAiTurn.value || !canControlPiece(state.value, playerIndex) || !isValidMove(pieceIndex, from)) return
  applyAction({ type: 'move', pieceIndex, from })
}

function scheduleAiAction() {
  if (!isAiTurn.value || game.isTerminal() || aiTimer) return

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = chooseLudoAction(state.value, game.getValidActions())
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [state.value.currentPlayerIndex, state.value.pendingRoll, state.value.pieces.map((pieces) => pieces.map((piece) => piece.progress).join(',')).join('|')],
  scheduleAiAction,
  { immediate: true },
)

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
})
</script>

<template>
  <section class="mx-auto max-w-5xl">
    <TurnBanner
      v-if="currentPlayer"
      :player-name="currentPlayer.displayName"
      :is-ai="isAiTurn"
      :hint="isAiTurn ? 'Die KI zieht…' : 'Würfle und ziehe deine Figur.'"
    />

    <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div class="rounded-3xl bg-[var(--color-panel)] p-3 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c] sm:p-5">
        <div
          class="relative aspect-square overflow-hidden rounded-2xl"
          :style="{ backgroundColor: BOARD_FACE }"
          role="region"
          aria-label="Mensch ärgere dich nicht Brett"
        >
          <svg
            class="absolute inset-0 size-full"
            :viewBox="`0 0 ${BOARD_GRID_SIZE} ${BOARD_GRID_SIZE}`"
            aria-hidden="true"
          >
            <rect
              v-for="wash in CORNER_WASHES"
              :key="`wash-${wash.color}`"
              :x="wash.x"
              :y="wash.y"
              :width="wash.width"
              :height="wash.height"
              :fill="COLOR_HEX[wash.color]"
              fill-opacity="0.22"
              rx="0.35"
            />

            <line
              v-for="(edge, edgeIndex) in ringEdges"
              :key="`edge-${edgeIndex}`"
              :x1="cellCenter(edge[0]).cx"
              :y1="cellCenter(edge[0]).cy"
              :x2="cellCenter(edge[1]).cx"
              :y2="cellCenter(edge[1]).cy"
              :stroke="PATH_STROKE"
              stroke-width="0.08"
              stroke-linecap="round"
            />

            <circle
              v-for="(cell, ringIndex) in ringCells"
              :key="`ring-${ringIndex}`"
              :cx="cellCenter(cell).cx"
              :cy="cellCenter(cell).cy"
              :r="CIRCLE_RADIUS"
              fill="#ffffff"
              :stroke="PATH_STROKE"
              stroke-width="0.07"
            />

            <circle
              v-for="start in startCells"
              :key="`start-${start.color}`"
              :cx="cellCenter(start.cell).cx"
              :cy="cellCenter(start.cell).cy"
              :r="CIRCLE_RADIUS"
              :fill="COLOR_HEX[start.color]"
              :stroke="PATH_STROKE"
              stroke-width="0.07"
            />

            <circle
              v-for="(home, homeIndex) in homeCells"
              :key="`home-${homeIndex}`"
              :cx="cellCenter(home.cell).cx"
              :cy="cellCenter(home.cell).cy"
              :r="CIRCLE_RADIUS"
              :fill="COLOR_HEX[home.color]"
              :stroke="PATH_STROKE"
              stroke-width="0.07"
            />

            <circle
              v-for="(yard, yardIndex) in yardCells"
              :key="`yard-${yardIndex}`"
              :cx="cellCenter(yard.cell).cx"
              :cy="cellCenter(yard.cell).cy"
              :r="CIRCLE_RADIUS"
              :fill="COLOR_HEX[yard.color]"
              :stroke="PATH_STROKE"
              stroke-width="0.07"
            />

            <circle
              :cx="cellCenter(centerCell).cx"
              :cy="cellCenter(centerCell).cy"
              :r="HUB_RADIUS"
              :fill="BOARD_FACE"
              :stroke="PATH_STROKE"
              stroke-width="0.07"
            />
          </svg>

          <button
            v-for="piece in ringPieces"
            :key="`ring-${piece.playerIndex}-${piece.pieceIndex}`"
            type="button"
            class="absolute z-10 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-black shadow-[0_2px_0_#4c3424] transition-[left,top,transform] duration-300 ease-out hover:scale-110 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] motion-reduce:transition-none sm:size-11"
            :class="colorClass(piece.playerIndex)"
            :style="piece.style"
            :disabled="isAiTurn || !canControlPiece(state, piece.playerIndex) || !isValidMove(piece.pieceIndex, 'ring')"
            :aria-label="`${players[piece.playerIndex].displayName}, Figur ${piece.pieceIndex + 1}${canControlPiece(state, piece.playerIndex) && isValidMove(piece.pieceIndex, 'ring') ? ' ziehen' : ''}`"
            @click="movePiece(piece.playerIndex, piece.pieceIndex, 'ring')"
          >
            {{ piece.pieceIndex + 1 }}
          </button>
        </div>
      </div>

      <aside class="space-y-4">
        <div class="rounded-3xl bg-[var(--color-panel)] p-4 shadow-[0_4px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
          <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Würfel</p>
          <p class="mt-2 font-[var(--font-display)] text-4xl font-semibold" aria-live="polite">
            {{ state.pendingRoll ?? '–' }}
          </p>
          <AppButton class="mt-4" block :disabled="isAiTurn || !canRoll" @click="rollDice">
            Würfeln
          </AppButton>
          <p class="mt-3 text-sm">Mit einer 6 darfst du noch einmal würfeln.</p>
        </div>

        <div
          v-for="(player, playerIndex) in players"
          :key="player.seatIndex"
          class="rounded-3xl p-4 ring-2 transition"
          :class="playerIndex === state.currentPlayerIndex ? 'bg-[#fff3c4] ring-[var(--color-accent)]' : 'bg-[var(--color-panel)] ring-[#dfbd8c]'"
        >
          <p class="font-bold">{{ player.displayName }}</p>
          <div class="mt-3 grid grid-cols-4 gap-2">
            <button
              v-for="(piece, pieceIndex) in state.pieces[playerIndex].filter((piece) => isInYard(piece))"
              :key="`yard-${playerIndex}-${pieceIndex}`"
              type="button"
              class="aspect-square rounded-xl border-2 text-sm font-black shadow-[0_2px_0_#4c3424] transition hover:scale-105 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              :class="colorClass(playerIndex)"
              :disabled="isAiTurn || !canControlPiece(state, playerIndex) || !isValidMove(state.pieces[playerIndex].indexOf(piece), 'yard')"
              :aria-label="`${player.displayName}, Figur aus dem Haus ziehen`"
              @click="movePiece(playerIndex, state.pieces[playerIndex].indexOf(piece), 'yard')"
            >
              ●
            </button>
            <span v-if="state.pieces[playerIndex].every((piece) => !isInYard(piece))" class="col-span-4 text-sm">Keine Figuren im Haus</span>
          </div>
          <div v-if="state.pieces[playerIndex].some((piece) => isInHome(piece))" class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="piece in state.pieces[playerIndex].filter((piece) => isInHome(piece))"
              :key="`home-${playerIndex}-${state.pieces[playerIndex].indexOf(piece)}`"
              type="button"
              class="rounded-full border-2 px-3 py-1 text-xs font-bold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              :class="colorClass(playerIndex)"
              :disabled="isAiTurn || !canControlPiece(state, playerIndex) || !isValidMove(state.pieces[playerIndex].indexOf(piece), 'home')"
              :aria-label="`${player.displayName}, Figur im Ziel weiterziehen`"
              @click="movePiece(playerIndex, state.pieces[playerIndex].indexOf(piece), 'home')"
            >
              Ziel {{ piece.progress - 39 }}
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
