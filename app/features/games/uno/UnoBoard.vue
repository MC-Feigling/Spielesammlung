<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { chooseUnoAction } from './ai'
import {
  createUnoGame,
  type UnoAction,
  type UnoCard,
  type UnoColor,
  type UnoGameState,
  type UnoRank,
} from './engine'
import UnoCardBack from './UnoCardBack.vue'
import UnoCardFace from './UnoCardFace.vue'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 700

const COLOR_HEX: Record<UnoColor, string> = {
  red: '#d7263d',
  yellow: '#f5c518',
  green: '#2a9d4a',
  blue: '#1f6feb',
}

const COLOR_LABELS: Record<UnoColor, string> = {
  red: 'Rot',
  yellow: 'Gelb',
  green: 'Grün',
  blue: 'Blau',
}

const COLOR_BUTTON_CLASSES: Record<UnoColor, string> = {
  red: 'border-[#8b1a28] bg-[#d7263d] text-white',
  yellow: 'border-[#a56e16] bg-[#f5c518] text-[#1a1a1a]',
  green: 'border-[#1f6b34] bg-[#2a9d4a] text-white',
  blue: 'border-[#154a9e] bg-[#1f6feb] text-white',
}

const RANK_LABELS: Record<UnoRank, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  skip: 'Stop',
  reverse: '⇄',
  drawTwo: '+2',
  wild: 'Wild',
  wildDrawFour: '+4',
}

const WILD_COLORS: readonly UnoColor[] = ['red', 'yellow', 'green', 'blue']

const game = createUnoGame({ playerCount: props.players.length })
const { play } = useSound()
const state = ref<UnoGameState>(game.getState())
const pendingWildCardId = ref<string | null>(null)
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')

const validActions = computed(() => {
  void state.value
  return game.getValidActions()
})

const canDraw = computed(() =>
  !isAiTurn.value && validActions.value.some((action) => action.type === 'draw'),
)

const discardTop = computed((): UnoCard | null => {
  const pile = state.value.discardPile
  return pile[pile.length - 1] ?? null
})

const viewedHumanSeat = computed(() => {
  const currentIndex = state.value.currentPlayerIndex
  if (props.players[currentIndex]?.type === 'human') return currentIndex

  const firstHuman = props.players.findIndex((player) => player.type === 'human')
  return firstHuman >= 0 ? firstHuman : 0
})

const humanHand = computed(() => state.value.hands[viewedHumanSeat.value] ?? [])

const opponentSeats = computed(() =>
  props.players
    .map((player, seatIndex) => ({ player, seatIndex }))
    .filter(({ seatIndex }) => seatIndex !== viewedHumanSeat.value),
)

const stackHint = computed(() => {
  if (state.value.pendingDrawCount <= 0) return null
  return `Ziehe ${state.value.pendingDrawCount} oder lege +2/+4`
})

const turnHint = computed(() => {
  if (isAiTurn.value) return 'Die KI zieht…'
  if (stackHint.value) return stackHint.value
  return 'Lege eine passende Karte oder ziehe.'
})

const showWildPicker = computed(() => pendingWildCardId.value !== null && !isAiTurn.value)

function isWildCard(card: UnoCard): boolean {
  return card.rank === 'wild' || card.rank === 'wildDrawFour'
}

function cardAriaLabel(card: UnoCard): string {
  if (isWildCard(card)) return `${RANK_LABELS[card.rank]}-Karte`
  return `${COLOR_LABELS[card.color as UnoColor]} ${RANK_LABELS[card.rank]}`
}

function canPlayCard(cardId: string): boolean {
  if (isAiTurn.value) return false
  if (viewedHumanSeat.value !== state.value.currentPlayerIndex) return false
  return validActions.value.some((action) => action.type === 'play' && action.cardId === cardId)
}

function applyAction(action: UnoAction) {
  pendingWildCardId.value = null
  const result = game.applyAction(action)
  state.value = result.state

  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function drawCard() {
  if (!canDraw.value) return
  applyAction({ type: 'draw' })
}

function onCardClick(card: UnoCard) {
  if (!canPlayCard(card.id)) return

  if (isWildCard(card)) {
    pendingWildCardId.value = card.id
    return
  }

  applyAction({ type: 'play', cardId: card.id })
}

function chooseWildColor(color: UnoColor) {
  const cardId = pendingWildCardId.value
  if (!cardId || isAiTurn.value) return
  applyAction({ type: 'play', cardId, chosenColor: color })
}

function cancelWildPicker() {
  pendingWildCardId.value = null
}

function scheduleAiAction() {
  if (!isAiTurn.value || game.isTerminal() || aiTimer) return

  pendingWildCardId.value = null

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = chooseUnoAction(state.value, game.getValidActions())
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [
    state.value.currentPlayerIndex,
    state.value.pendingDrawCount,
    state.value.currentColor,
    state.value.hands.map((hand) => hand.map((card) => card.id).join(',')).join('|'),
    state.value.discardPile[state.value.discardPile.length - 1]?.id,
  ],
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
      :hint="turnHint"
    />

    <p
      v-if="stackHint"
      class="mt-3 rounded-2xl bg-[#fff3c4] px-4 py-3 text-center text-base font-bold text-[#4c3424] ring-2 ring-[var(--color-accent)]"
      role="status"
    >
      {{ stackHint }}
    </p>

    <div class="mt-6 space-y-6">
      <div class="flex flex-wrap justify-center gap-3">
        <div
          v-for="{ player, seatIndex } in opponentSeats"
          :key="player.seatIndex"
          class="min-w-[9rem] rounded-3xl p-4 ring-2 transition"
          :class="seatIndex === state.currentPlayerIndex
            ? 'bg-[#fff3c4] ring-[var(--color-accent)]'
            : 'bg-[var(--color-panel)] ring-[#dfbd8c]'"
        >
          <p class="font-bold">{{ player.displayName }}</p>
          <p class="mt-1 text-sm text-[#7a5a3a]">
            {{ player.type === 'ai' ? 'KI' : 'Mitspieler' }}
          </p>
          <div class="mt-3 flex items-end gap-1" aria-hidden="true">
            <div
              v-for="backIndex in Math.min(state.hands[seatIndex]?.length ?? 0, 5)"
              :key="`back-${seatIndex}-${backIndex}`"
              :style="{ marginLeft: backIndex === 1 ? '0' : '-1.35rem' }"
            >
              <UnoCardBack size="sm" />
            </div>
          </div>
          <p class="mt-2 text-sm font-bold" :aria-label="`${state.hands[seatIndex]?.length ?? 0} Karten`">
            {{ state.hands[seatIndex]?.length ?? 0 }} Karten
          </p>
        </div>
      </div>

      <div class="rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <div class="flex flex-col items-center gap-2">
            <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Ablage
            </p>
            <div
              v-if="discardTop"
              class="flex flex-col items-center gap-2"
              :aria-label="`Oben: ${cardAriaLabel(discardTop)}, Farbe ${COLOR_LABELS[state.currentColor]}`"
            >
              <UnoCardFace :card="discardTop" size="lg" />
              <span
                class="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-[0_2px_0_#4c3424]"
                :style="{ backgroundColor: COLOR_HEX[state.currentColor], color: state.currentColor === 'yellow' ? '#1a1a1a' : '#ffffff' }"
              >
                {{ COLOR_LABELS[state.currentColor] }}
              </span>
            </div>
          </div>

          <div class="flex flex-col items-center gap-2">
            <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Nachziehstapel
            </p>
            <button
              type="button"
              class="relative min-h-12 min-w-12 transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              :disabled="!canDraw"
              :aria-label="state.pendingDrawCount > 0
                ? `${state.pendingDrawCount} Karten ziehen`
                : 'Eine Karte ziehen'"
              @click="drawCard"
            >
              <UnoCardBack size="lg" />
              <span
                class="absolute inset-x-1 bottom-2 rounded-md bg-black/55 px-1 py-0.5 text-center text-[0.65rem] font-bold text-white sm:text-xs"
              >
                {{ state.drawPile.length }} · Ziehen
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showWildPicker"
        class="rounded-3xl bg-[#fff3c4] p-5 shadow-[0_4px_0_#c48a4a] ring-2 ring-[var(--color-accent)]"
        role="dialog"
        aria-label="Farbe wählen"
      >
        <p class="text-center font-[var(--font-display)] text-2xl font-semibold text-[#4c3424]">
          Farbe wählen
        </p>
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="color in WILD_COLORS"
            :key="color"
            type="button"
            class="flex min-h-12 items-center justify-center rounded-2xl border-4 px-4 py-4 text-lg font-black shadow-[0_3px_0_#4c3424] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            :class="COLOR_BUTTON_CLASSES[color]"
            :aria-label="'Farbe ' + COLOR_LABELS[color]"
            @click="chooseWildColor(color)"
          >
            {{ COLOR_LABELS[color] }}
          </button>
        </div>
        <div class="mt-4 flex justify-center">
          <AppButton variant="ghost" @click="cancelWildPicker">
            Abbrechen
          </AppButton>
        </div>
      </div>

      <div class="rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Deine Hand
          <span class="ml-2 normal-case tracking-normal text-[#7a5a3a]">
            ({{ players[viewedHumanSeat]?.displayName ?? 'Du' }})
          </span>
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
          <button
            v-for="card in humanHand"
            :key="card.id"
            type="button"
            class="min-h-12 min-w-12 rounded-[0.9rem] transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            :class="canPlayCard(card.id)
              ? 'z-10 scale-105 ring-4 ring-[var(--color-accent)] ring-offset-2 ring-offset-[#fff6e8] hover:-translate-y-1 motion-safe:animate-pulse'
              : 'opacity-70'"
            :disabled="!canPlayCard(card.id)"
            :aria-label="cardAriaLabel(card)"
            @click="onCardClick(card)"
          >
            <UnoCardFace :card="card" size="sm" />
          </button>
        </div>
        <p
          v-if="humanHand.length === 0"
          class="mt-4 text-center text-sm text-[#7a5a3a]"
        >
          Keine Karten mehr.
        </p>
      </div>
    </div>
  </section>
</template>
