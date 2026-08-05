<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { createMemoryAi } from './ai'
import { createMemoryGame, type MemoryAction, type MemoryGameState } from './engine'
import { useSessionStore } from '~/stores/session'

const props = defineProps<{
  players: SessionPlayer[]
  rows: number
  cols: number
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const CARD_SYMBOLS = ['🍎', '🦊', '🌈', '⭐', '🐸', '🎈', '🦁', '🚀'] as const
const AI_ACTION_DELAY_MS = 650

const game = createMemoryGame({
  playerCount: props.players.length,
  rows: props.rows,
  cols: props.cols,
})
const session = useSessionStore()
const ai = createMemoryAi({ difficulty: session.aiDifficulty })
const { play } = useSound()
const state = ref<MemoryGameState>(game.getState())
let aiTimer: ReturnType<typeof setTimeout> | undefined
let mismatchTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const validFlipIndexes = computed(() => new Set(
  game.getValidActions()
    .filter((action): action is Extract<MemoryAction, { type: 'flip' }> => action.type === 'flip')
    .map((action) => action.cardIndex),
))
const GRID_GAP_PX = 4

const gridStyle = computed(() => {
  const gapTotalX = (props.cols - 1) * GRID_GAP_PX
  const gapTotalY = (props.rows - 1) * GRID_GAP_PX
  const maxCardSize = `calc((min(48vh, 72vw) - ${gapTotalY}px) / ${props.rows})`

  return {
    gridTemplateColumns: `repeat(${props.cols}, minmax(0, 1fr))`,
    width: `min(100%, calc(${maxCardSize} * ${props.cols} + ${gapTotalX}px))`,
  }
})

function isCardRevealed(cardIndex: number) {
  const pairId = state.value.cards[cardIndex]
  return state.value.faceUpCardIndexes.includes(cardIndex) || state.value.matchedPairIds.includes(pairId)
}

function applyAction(action: MemoryAction) {
  const previousMatchCount = state.value.matchedPairIds.length
  const result = game.applyAction(action)
  state.value = result.state
  ai.observe(state.value)

  if (state.value.matchedPairIds.length > previousMatchCount) {
    play('match')
  }

  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function flipCard(cardIndex: number) {
  if (isAiTurn.value || !validFlipIndexes.value.has(cardIndex)) return
  applyAction({ type: 'flip', cardIndex })
}

function scheduleAiAction() {
  if (!isAiTurn.value || state.value.faceUpCardIndexes.length === 2 || game.isTerminal() || aiTimer) return

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = ai.chooseAction(state.value)
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [state.value.currentPlayerIndex, state.value.faceUpCardIndexes.length, state.value.matchedPairIds.length],
  scheduleAiAction,
  { immediate: true },
)

watch(
  () => state.value.faceUpCardIndexes.length,
  (faceUpCardCount) => {
    if (faceUpCardCount !== 2 || mismatchTimer) return

    mismatchTimer = setTimeout(() => {
      mismatchTimer = undefined
      applyAction({ type: 'resolveMismatch' })
    }, AI_ACTION_DELAY_MS)
  },
)

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
  if (mismatchTimer) clearTimeout(mismatchTimer)
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-md flex-col items-center">
    <TurnBanner
      v-if="currentPlayer"
      class="w-full"
      :player-name="currentPlayer.displayName"
      :is-ai="isAiTurn"
      :hint="isAiTurn ? 'Die Karten werden gleich aufgedeckt.' : 'Finde zwei gleiche Karten.'"
    />

    <div class="mt-3 grid gap-1" :style="gridStyle">
      <button
        v-for="(pairId, cardIndex) in state.cards"
        :key="cardIndex"
        type="button"
        class="aspect-square rounded-lg border-2 text-base leading-none shadow-[0_2px_0_#9e3b24] transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:text-lg md:text-xl"
        :class="isCardRevealed(cardIndex)
          ? 'border-[#dfbd8c] bg-[var(--color-panel)] shadow-[0_2px_0_#c48a4a]'
          : 'border-[#9e3b24] bg-[var(--color-accent)] text-white hover:-translate-y-0.5 hover:shadow-[0_3px_0_#9e3b24]'"
        :disabled="!validFlipIndexes.has(cardIndex) || isAiTurn"
        :aria-label="isCardRevealed(cardIndex) ? `Karte ${cardIndex + 1}: ${CARD_SYMBOLS[pairId]}` : `Karte ${cardIndex + 1} aufdecken`"
        @click="flipCard(cardIndex)"
      >
        <span aria-hidden="true">{{ isCardRevealed(cardIndex) ? CARD_SYMBOLS[pairId] : '?' }}</span>
      </button>
    </div>

    <dl class="mt-3 grid w-full gap-1.5 sm:grid-cols-2 sm:gap-2">
      <div
        v-for="(player, playerIndex) in players"
        :key="player.seatIndex"
        class="rounded-lg bg-[var(--color-panel)] px-3 py-1.5 text-sm ring-2 ring-[#dfbd8c]"
        :class="playerIndex === state.currentPlayerIndex ? 'ring-[var(--color-accent)]' : ''"
      >
        <dt class="font-bold">{{ player.displayName }}</dt>
        <dd>{{ state.matchedPairCounts[playerIndex] }} Paare</dd>
      </div>
    </dl>
  </section>
</template>
