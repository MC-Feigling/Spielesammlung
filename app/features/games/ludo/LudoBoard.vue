<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { getRingIndex, isFullyHome, isInHome, isInYard, LUDO_PLAYER_COLORS, type LudoPlayerColor } from './board'
import { chooseLudoAction } from './ai'
import { canControlPiece, createLudoGame, type LudoAction, type LudoGameState, type LudoMoveFrom } from './engine'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 700
const COLOR_CLASSES: Record<LudoPlayerColor, string> = {
  red: 'border-[#9e3b24] bg-[#e7674c] text-white',
  blue: 'border-[#26628e] bg-[#5ca4d6] text-white',
  green: 'border-[#2f7044] bg-[#66b57a] text-white',
  yellow: 'border-[#a56e16] bg-[#f2bf4f] text-[#4c3424]',
}

const game = createLudoGame({ playerCount: props.players.length })
const { play } = useSound()
const state = ref<LudoGameState>(game.getState())
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const validActions = computed(() => game.getValidActions())
const canRoll = computed(() => validActions.value.some((action) => action.type === 'roll'))
const moveActions = computed(() => validActions.value.filter((action): action is Extract<LudoAction, { type: 'move' }> => action.type === 'move'))
const ringPieces = computed(() => state.value.pieces.flatMap((pieces, playerIndex) => (
  pieces.flatMap((piece, pieceIndex) => {
    const ringIndex = getRingIndex(playerIndex, piece.progress)
    return ringIndex === null ? [] : [{ playerIndex, pieceIndex, ringIndex, color: LUDO_PLAYER_COLORS[playerIndex] }]
  })
)))

function ringPosition(ringIndex: number) {
  const sideLength = 10
  const unit = 100 / sideLength

  if (ringIndex < sideLength) return { left: `${(ringIndex + 0.5) * unit}%`, top: '5%' }
  if (ringIndex < sideLength * 2) return { left: '95%', top: `${(ringIndex - sideLength + 0.5) * unit}%` }
  if (ringIndex < sideLength * 3) return { left: `${(sideLength * 3 - ringIndex - 0.5) * unit}%`, top: '95%' }
  return { left: '5%', top: `${(sideLength * 4 - ringIndex - 0.5) * unit}%` }
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
        <div class="relative aspect-square rounded-2xl bg-[#fffaf0]">
          <div
            v-for="ringIndex in 40"
            :key="ringIndex"
            class="absolute size-[9%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#dfbd8c] bg-white"
            :class="[ringIndex - 1 === 0 ? 'ring-4 ring-[#e7674c]' : '', ringIndex - 1 === 10 ? 'ring-4 ring-[#5ca4d6]' : '', ringIndex - 1 === 20 ? 'ring-4 ring-[#66b57a]' : '', ringIndex - 1 === 30 ? 'ring-4 ring-[#f2bf4f]' : '']"
            :style="ringPosition(ringIndex - 1)"
            aria-hidden="true"
          />

          <div class="absolute inset-[18%] grid grid-cols-2 gap-3 rounded-3xl bg-[#fff3c4] p-4 text-center shadow-inner sm:p-6">
            <div v-for="(player, playerIndex) in players" :key="player.seatIndex" class="flex flex-col items-center justify-center rounded-2xl bg-white/75 p-2">
              <span class="text-xs font-bold">{{ player.displayName }}</span>
              <span class="mt-1 text-xs">{{ state.pieces[playerIndex].filter((piece) => isFullyHome(piece)).length }} im Ziel</span>
            </div>
          </div>

          <button
            v-for="piece in ringPieces"
            :key="`ring-${piece.playerIndex}-${piece.pieceIndex}`"
            type="button"
            class="absolute z-10 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-black shadow-[0_2px_0_#4c3424] transition-[left,top,transform] duration-300 ease-out hover:scale-110 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] motion-reduce:transition-none sm:size-11"
            :class="colorClass(piece.playerIndex)"
            :style="ringPosition(piece.ringIndex)"
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
