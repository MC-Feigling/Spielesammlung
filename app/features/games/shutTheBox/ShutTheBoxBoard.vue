<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import { chooseShutTheBoxAction } from './ai'
import {
  createShutTheBoxGame,
  type ShutTheBoxAction,
  type ShutTheBoxGameState,
} from './engine'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 650
const TILE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

const game = createShutTheBoxGame({ playerCount: props.players.length })
const { play } = useSound()
const state = ref<ShutTheBoxGameState>(game.getState())
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)
const selectedNumbers = ref<number[]>([])
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const currentBox = computed(() => state.value.boxes[state.value.currentPlayerIndex]!)
const canRoll = computed(() => {
  void state.value
  return game.getValidActions().some((action) => action.type === 'roll')
})
const diceSum = computed(() => {
  if (state.value.dice.length < 2) return 0
  return state.value.dice[0]! + state.value.dice[1]!
})
const selectionSum = computed(() =>
  selectedNumbers.value.reduce((sum, number) => sum + number, 0),
)
const canConfirmClose = computed(() => {
  if (isAiTurn.value || state.value.phase !== 'awaitingClose') return false
  if (selectedNumbers.value.length === 0) return false
  return selectionSum.value === diceSum.value
})
const turnHint = computed(() => {
  if (isAiTurn.value) return 'Die KI ist dran…'
  if (state.value.phase === 'awaitingRoll') return 'Würfle die Würfel.'
  return 'Wähle Zahlen und klappe sie zu.'
})

function clearSelection() {
  selectedNumbers.value = []
}

function applyAction(action: ShutTheBoxAction) {
  const result = game.applyAction(action)
  state.value = result.state
  clearSelection()

  if (action.type === 'roll') play('dice')
  if (action.type === 'close') play('match')
  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function rollDice() {
  if (isAiTurn.value || !canRoll.value || game.isTerminal()) return
  applyAction({ type: 'roll' })
}

function toggleTile(number: number) {
  if (isAiTurn.value || state.value.phase !== 'awaitingClose' || game.isTerminal()) return
  if (!currentBox.value.open[number - 1]) return

  if (selectedNumbers.value.includes(number)) {
    selectedNumbers.value = selectedNumbers.value.filter((value) => value !== number)
    return
  }

  selectedNumbers.value = [...selectedNumbers.value, number]
}

function confirmClose() {
  if (!canConfirmClose.value || game.isTerminal()) return
  applyAction({ type: 'close', numbers: [...selectedNumbers.value] })
}

function scoreLabel(score: number | null): string {
  return score === null ? '—' : String(score)
}

function scheduleAiAction() {
  if (!isAiTurn.value || game.isTerminal() || aiTimer) return

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = chooseShutTheBoxAction(state.value, game.getValidActions(), { difficulty: aiDifficulty.value })
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [
    state.value.currentPlayerIndex,
    state.value.phase,
    state.value.dice.join(','),
    state.value.boxes.map((box) => `${box.open.join('')}:${box.score ?? 'x'}`).join('|'),
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

    <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
      <div class="rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Zahlen
        </p>

        <div class="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-9 sm:gap-3">
          <button
            v-for="number in TILE_NUMBERS"
            :key="number"
            type="button"
            class="aspect-square min-h-12 rounded-2xl border-4 text-2xl font-black transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:text-3xl"
            :class="!currentBox.open[number - 1]
              ? 'cursor-default border-[#c8b49a] bg-[#efe4d4] text-[#b39b82] line-through opacity-70'
              : selectedNumbers.includes(number)
                ? 'border-[var(--color-accent)] bg-[#fff3c4] text-[#4c3424] shadow-[0_4px_0_#d45d3a] scale-[1.03]'
                : 'border-[#9e3b24] bg-white text-[#4c3424] shadow-[0_4px_0_#c48a4a] hover:-translate-y-0.5'"
            :disabled="isAiTurn || state.phase !== 'awaitingClose' || !currentBox.open[number - 1]"
            :aria-pressed="selectedNumbers.includes(number)"
            :aria-label="`Zahl ${number}${currentBox.open[number - 1] ? '' : ', zugeklappt'}`"
            @click="toggleTile(number)"
          >
            {{ number }}
          </button>
        </div>

        <div class="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Würfel
            </p>
            <div class="mt-3 flex gap-3">
              <span
                v-for="(die, dieIndex) in state.dice"
                :key="dieIndex"
                class="grid h-16 w-16 place-items-center rounded-2xl border-4 border-[#9e3b24] bg-white text-3xl font-black text-[#4c3424] shadow-[0_4px_0_#c48a4a]"
              >
                {{ die }}
              </span>
              <template v-if="state.dice.length === 0">
                <span
                  v-for="emptyIndex in 2"
                  :key="`empty-${emptyIndex}`"
                  class="grid h-16 w-16 place-items-center rounded-2xl border-4 border-dashed border-[#dfbd8c] bg-[#fffaf0] text-3xl font-black text-[#c8b49a]"
                  aria-hidden="true"
                >
                  ?
                </span>
              </template>
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-3 sm:items-end">
            <p
              v-if="state.phase === 'awaitingClose'"
              class="text-[var(--text-base)] font-bold"
            >
              Summe: {{ selectionSum }}
              <span class="font-normal text-[#7a5c45]"> / {{ diceSum }}</span>
            </p>
            <AppButton
              v-if="state.phase === 'awaitingRoll'"
              block
              class="sm:w-auto sm:min-w-48"
              :disabled="isAiTurn || !canRoll"
              @click="rollDice"
            >
              Würfeln
            </AppButton>
            <AppButton
              v-else
              block
              class="sm:w-auto sm:min-w-48"
              :disabled="!canConfirmClose"
              @click="confirmClose"
            >
              Zuklappen
            </AppButton>
          </div>
        </div>
      </div>

      <aside class="rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Punkte
        </p>
        <p class="mt-2 text-sm text-[var(--text-base)]">
          Niedrigste Summe gewinnt.
        </p>
        <ul class="mt-5 space-y-3">
          <li
            v-for="(player, playerIndex) in players"
            :key="player.seatIndex"
            class="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-2"
            :class="playerIndex === state.currentPlayerIndex
              ? 'bg-[#fff3c4] ring-[var(--color-accent)]'
              : 'bg-[#fffaf0] ring-[#dfbd8c]'"
          >
            <div>
              <p class="font-bold">{{ player.displayName }}</p>
              <p class="text-sm">{{ player.type === 'ai' ? 'KI' : 'Mensch' }}</p>
            </div>
            <p class="text-2xl font-black text-[#4c3424]">
              {{ scoreLabel(state.boxes[playerIndex]?.score ?? null) }}
            </p>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>
