<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import {
  getRingIndex,
  isFullyHome,
  isInHome,
  isInYard,
  LUDO_HOME_LENGTH,
  LUDO_HOME_START_PROGRESS,
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
const YARD_SLOT_COUNT = 4
const CIRCLE_RADIUS = 0.36
const HUB_RADIUS = 0.42
const STACK_OFFSET_PX = 7
const PIECE_BASE_Z_INDEX = 10
const CONNECTOR_STROKE = 0.1

const LOCATION_LABEL: Record<LudoMoveFrom, string> = {
  yard: 'Haus',
  ring: 'Bahn',
  home: 'Ziel',
}

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

const FRAME_STROKE = 0.2

const CORNER_WASHES: ReadonlyArray<{
  playerIndex: number
  color: LudoPlayerColor
  x: number
  y: number
  width: number
  height: number
}> = [
  { playerIndex: 3, color: 'green', x: 0, y: 0, width: 4, height: 4 },
  { playerIndex: 0, color: 'red', x: 7, y: 0, width: 4, height: 4 },
  { playerIndex: 1, color: 'yellow', x: 7, y: 7, width: 4, height: 4 },
  { playerIndex: 2, color: 'blue', x: 0, y: 7, width: 4, height: 4 },
]

/** Outer frame: green TL / red TR / yellow BR / blue BL */
const FRAME_SEGMENTS: ReadonlyArray<{
  color: LudoPlayerColor
  x: number
  y: number
  width: number
  height: number
}> = [
  { color: 'green', x: 0, y: 0, width: 5.5, height: FRAME_STROKE },
  { color: 'green', x: 0, y: 0, width: FRAME_STROKE, height: 5.5 },
  { color: 'red', x: 5.5, y: 0, width: 5.5, height: FRAME_STROKE },
  { color: 'red', x: 11 - FRAME_STROKE, y: 0, width: FRAME_STROKE, height: 5.5 },
  { color: 'yellow', x: 5.5, y: 11 - FRAME_STROKE, width: 5.5, height: FRAME_STROKE },
  { color: 'yellow', x: 11 - FRAME_STROKE, y: 5.5, width: FRAME_STROKE, height: 5.5 },
  { color: 'blue', x: 0, y: 11 - FRAME_STROKE, width: 5.5, height: FRAME_STROKE },
  { color: 'blue', x: 0, y: 5.5, width: FRAME_STROKE, height: 5.5 },
]

const game = createLudoGame({ playerCount: props.players.length })
const { play } = useSound()
const state = ref<LudoGameState>(game.getState())
let aiTimer: ReturnType<typeof setTimeout> | undefined

const activeSeatCount = computed(() => props.players.length)
const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const validActions = computed(() => game.getValidActions())
const canRoll = computed(() => validActions.value.some((action) => action.type === 'roll'))
const moveActions = computed(() => validActions.value.filter((action): action is Extract<LudoAction, { type: 'move' }> => action.type === 'move'))

const ringCells = Array.from({ length: LUDO_RING_SIZE }, (_, index) => getRingCell(index))
const ringEdges = getRingEdges()
const centerCell = getCenterCell()

const activeCornerWashes = computed(() =>
  CORNER_WASHES.filter((wash) => wash.playerIndex < activeSeatCount.value),
)

const startCells = computed(() =>
  LUDO_START_INDEXES
    .map((ringIndex, playerIndex) => ({
      cell: getRingCell(ringIndex),
      color: LUDO_PLAYER_COLORS[playerIndex],
      playerIndex,
    }))
    .filter((start) => start.playerIndex < activeSeatCount.value),
)

const homeCells = computed(() =>
  Array.from({ length: activeSeatCount.value }, (_, playerIndex) =>
    Array.from({ length: LUDO_HOME_LENGTH }, (_, homeStep) => ({
      cell: getHomeCell(playerIndex, homeStep),
      color: LUDO_PLAYER_COLORS[playerIndex],
    })),
  ).flat(),
)

const yardCells = computed(() =>
  Array.from({ length: activeSeatCount.value }, (_, playerIndex) =>
    Array.from({ length: YARD_SLOT_COUNT }, (_, slotIndex) => ({
      cell: getYardCell(playerIndex, slotIndex),
      color: LUDO_PLAYER_COLORS[playerIndex],
    })),
  ).flat(),
)

interface BoardPieceView {
  playerIndex: number
  pieceIndex: number
  from: LudoMoveFrom
  style: { left: string, top: string, zIndex: number }
}

interface PlacedPiece {
  playerIndex: number
  pieceIndex: number
  from: LudoMoveFrom
  cell: BoardCell
}

function pieceBoardCell(playerIndex: number, pieceIndex: number, progress: number): { from: LudoMoveFrom, cell: BoardCell } | null {
  if (isInYard({ progress })) {
    return { from: 'yard', cell: getYardCell(playerIndex, pieceIndex) }
  }

  if (isInHome({ progress })) {
    return { from: 'home', cell: getHomeCell(playerIndex, progress - LUDO_HOME_START_PROGRESS) }
  }

  const ringIndex = getRingIndex(playerIndex, progress)
  if (ringIndex === null) return null

  return { from: 'ring', cell: getRingCell(ringIndex) }
}

const boardPieces = computed((): BoardPieceView[] => {
  const placed: PlacedPiece[] = []

  state.value.pieces.forEach((pieces, playerIndex) => {
    if (playerIndex >= props.players.length) return

    pieces.forEach((piece, pieceIndex) => {
      const mapped = pieceBoardCell(playerIndex, pieceIndex, piece.progress)
      if (!mapped) return

      placed.push({
        playerIndex,
        pieceIndex,
        from: mapped.from,
        cell: mapped.cell,
      })
    })
  })

  const groups = new Map<string, PlacedPiece[]>()
  for (const item of placed) {
    const key = `${item.cell.row},${item.cell.col}`
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }

  const result: BoardPieceView[] = []
  for (const group of groups.values()) {
    const stacked = group.length > 1
    group.forEach((item, stackIndex) => {
      const offset = stacked ? stackIndex * STACK_OFFSET_PX : 0
      const base = cellStyle(item.cell)
      result.push({
        playerIndex: item.playerIndex,
        pieceIndex: item.pieceIndex,
        from: item.from,
        style: {
          left: `calc(${base.left} + ${offset}px)`,
          top: `calc(${base.top} + ${offset}px)`,
          zIndex: PIECE_BASE_Z_INDEX + (stacked ? stackIndex : 0),
        },
      })
    })
  }

  return result
})

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

function canMovePiece(playerIndex: number, pieceIndex: number, from: LudoMoveFrom) {
  return !isAiTurn.value && canControlPiece(state.value, playerIndex) && isValidMove(pieceIndex, from)
}

function pieceAriaLabel(playerIndex: number, pieceIndex: number, from: LudoMoveFrom) {
  const name = props.players[playerIndex]?.displayName ?? `Spieler ${playerIndex + 1}`
  const moveHint = canMovePiece(playerIndex, pieceIndex, from) ? ' ziehen' : ''
  return `${name}, Figur ${pieceIndex + 1}, ${LOCATION_LABEL[from]}${moveHint}`
}

function fullyHomeCount(playerIndex: number) {
  return state.value.pieces[playerIndex].filter((piece) => isFullyHome(piece)).length
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
              v-for="(segment, segmentIndex) in FRAME_SEGMENTS"
              :key="`frame-${segmentIndex}`"
              :x="segment.x"
              :y="segment.y"
              :width="segment.width"
              :height="segment.height"
              :fill="COLOR_HEX[segment.color]"
            />

            <rect
              v-for="wash in activeCornerWashes"
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
              :stroke-width="CONNECTOR_STROKE"
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
            v-for="piece in boardPieces"
            :key="`piece-${piece.playerIndex}-${piece.pieceIndex}`"
            type="button"
            class="absolute z-10 flex size-12 min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-black shadow-[0_2px_0_#4c3424] transition-[left,top,transform,box-shadow] duration-300 ease-out hover:scale-110 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] motion-reduce:transition-none"
            :class="[
              colorClass(piece.playerIndex),
              canMovePiece(piece.playerIndex, piece.pieceIndex, piece.from)
                ? 'z-20 scale-110 ring-4 ring-[var(--color-accent)] ring-offset-2 ring-offset-[#fffaf0] motion-safe:animate-pulse'
                : '',
            ]"
            :style="piece.style"
            :disabled="!canMovePiece(piece.playerIndex, piece.pieceIndex, piece.from)"
            :aria-label="pieceAriaLabel(piece.playerIndex, piece.pieceIndex, piece.from)"
            @click="movePiece(piece.playerIndex, piece.pieceIndex, piece.from)"
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
          <p class="mt-2 text-sm">{{ fullyHomeCount(playerIndex) }} im Ziel</p>
        </div>
      </aside>
    </div>
  </section>
</template>
