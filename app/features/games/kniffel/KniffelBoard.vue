<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { chooseKniffelAction } from './ai'
import { createKniffelGame, type KniffelAction, type KniffelGameState } from './engine'
import {
  KNIFFEL_CATEGORIES,
  KNIFFEL_CATEGORY_LABELS,
  UPPER_CATEGORIES,
  type KniffelCategory,
  previewCategoryScore,
  totalScore,
  upperBonus,
  upperSum,
} from './scoring'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const AI_ACTION_DELAY_MS = 650
const game = createKniffelGame({ playerCount: props.players.length })
const { play } = useSound()
const state = ref<KniffelGameState>(game.getState())
let aiTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const validActions = computed(() => {
  void state.value
  return game.getValidActions()
})
const canRoll = computed(() => validActions.value.some((action) => action.type === 'roll'))
const canToggleHold = computed(() => validActions.value.some((action) => action.type === 'toggleHold'))
const validCategories = computed(() => new Set(
  validActions.value
    .filter((action): action is Extract<KniffelAction, { type: 'score' }> => action.type === 'score')
    .map((action) => action.category),
))
const playerTotals = computed(() => state.value.scoreSheets.map((scoreSheet) => totalScore(scoreSheet)))
const playerUpperSums = computed(() => state.value.scoreSheets.map((scoreSheet) => upperSum(scoreSheet)))
const playerUpperBonuses = computed(() => state.value.scoreSheets.map((scoreSheet) => upperBonus(scoreSheet)))
const lowerCategories = computed(() =>
  KNIFFEL_CATEGORIES.filter((category) => !UPPER_CATEGORIES.includes(category)),
)

function applyAction(action: KniffelAction) {
  const result = game.applyAction(action)
  state.value = result.state

  if (action.type === 'roll') play('dice')
  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes)
  }
}

function rollDice() {
  if (isAiTurn.value || !canRoll.value) return
  applyAction({ type: 'roll' })
}

function toggleHold(dieIndex: number) {
  if (isAiTurn.value || !canToggleHold.value) return
  applyAction({ type: 'toggleHold', dieIndex })
}

function score(category: KniffelCategory) {
  if (isAiTurn.value || !validCategories.value.has(category)) return
  applyAction({ type: 'score', category })
}

function canPreviewScores(): boolean {
  return state.value.dice.length === 5 && state.value.rollsUsed > 0
}

function categoryPreview(category: KniffelCategory): number | null {
  if (!canPreviewScores() || !validCategories.value.has(category)) return null
  return previewCategoryScore(category, state.value.dice)
}

function categoryButtonLabel(category: KniffelCategory): string {
  const preview = categoryPreview(category)
  if (preview === null) return 'Eintragen'
  if (preview === 0) return 'Streichen'
  return String(preview)
}

function categoryButtonVariant(category: KniffelCategory): 'primary' | 'ghost' | 'danger' {
  const preview = categoryPreview(category)
  if (preview === null) return 'ghost'
  if (preview === 0) return 'danger'
  return 'primary'
}

function scheduleAiAction() {
  if (!isAiTurn.value || game.isTerminal() || aiTimer) return

  aiTimer = setTimeout(() => {
    aiTimer = undefined
    const action = chooseKniffelAction(state.value)
    if (action) applyAction(action)
  }, AI_ACTION_DELAY_MS)
}

watch(
  () => [state.value.currentPlayerIndex, state.value.rollsUsed, state.value.dice.join(','), state.value.scoreSheets[state.value.currentPlayerIndex]],
  scheduleAiAction,
  { deep: true, immediate: true },
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
      :hint="isAiTurn ? 'Die KI würfelt…' : 'Würfle und trage Punkte ein.'"
    />

    <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.4fr)]">
      <div class="rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <p class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Wurf {{ state.rollsUsed }} von 3
        </p>
        <div class="mt-5 grid grid-cols-5 gap-2 sm:gap-3">
          <button
            v-for="(die, dieIndex) in state.dice"
            :key="dieIndex"
            type="button"
            class="aspect-square min-h-12 rounded-2xl border-4 text-2xl font-black text-[#4c3424] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:text-4xl"
            :class="state.heldDice[dieIndex]
              ? 'border-[var(--color-accent)] bg-[#fff3c4] shadow-[0_4px_0_#d45d3a] scale-[1.03]'
              : 'border-[#9e3b24] bg-white shadow-[0_4px_0_#c48a4a]'"
            :disabled="isAiTurn || !canToggleHold"
            :aria-pressed="state.heldDice[dieIndex]"
            :aria-label="`${die} Augen${state.heldDice[dieIndex] ? ', gehalten' : ', halten'}`"
            @click="toggleHold(dieIndex)"
          >
            {{ die }}
          </button>
          <div
            v-for="dieIndex in Math.max(0, 5 - state.dice.length)"
            :key="`empty-${dieIndex}`"
            class="aspect-square min-h-12 rounded-2xl border-4 border-dashed border-[#dfbd8c] bg-[#fffaf0]"
            aria-hidden="true"
          />
        </div>
        <p class="mt-4 text-sm text-[var(--text-base)]">
          Würfel antippen, um sie für den nächsten Wurf zu halten.
        </p>
        <AppButton class="mt-5" block :disabled="isAiTurn || !canRoll" @click="rollDice">
          {{ state.rollsUsed === 0 ? 'Würfeln' : 'Noch einmal würfeln' }}
        </AppButton>
      </div>

      <div class="overflow-hidden rounded-3xl bg-[var(--color-panel)] shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[540px] border-collapse text-left">
            <thead class="bg-[#fff3c4] text-sm">
              <tr>
                <th scope="col" class="px-4 py-3 font-bold">Kategorie</th>
                <th v-for="player in players" :key="player.seatIndex" scope="col" class="px-3 py-3 text-center font-bold">
                  {{ player.displayName }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in UPPER_CATEGORIES" :key="category" class="border-t border-[#dfbd8c]">
                <th scope="row" class="px-4 py-2 text-sm font-bold">{{ KNIFFEL_CATEGORY_LABELS[category] }}</th>
                <td v-for="(player, playerIndex) in players" :key="player.seatIndex" class="px-3 py-2 text-center">
                  <AppButton
                    v-if="playerIndex === state.currentPlayerIndex && state.scoreSheets[playerIndex][category] === undefined"
                    :variant="categoryButtonVariant(category)"
                    class="min-h-9 px-2 py-1 text-xs"
                    :disabled="isAiTurn || !validCategories.has(category)"
                    @click="score(category)"
                  >
                    {{ categoryButtonLabel(category) }}
                  </AppButton>
                  <span v-else>{{ state.scoreSheets[playerIndex][category] ?? '–' }}</span>
                </td>
              </tr>
              <tr class="border-t-2 border-[#c48a4a] bg-[#fffaf0] font-bold">
                <th scope="row" class="px-4 py-2 text-sm">Summe oben</th>
                <td v-for="(player, playerIndex) in players" :key="`upper-${player.seatIndex}`" class="px-3 py-2 text-center">
                  {{ playerUpperSums[playerIndex] }}
                </td>
              </tr>
              <tr class="border-t border-[#dfbd8c] bg-[#fffaf0] font-bold">
                <th scope="row" class="px-4 py-2 text-sm">Bonus (+35 ab 63)</th>
                <td v-for="(player, playerIndex) in players" :key="`bonus-${player.seatIndex}`" class="px-3 py-2 text-center">
                  {{ playerUpperBonuses[playerIndex] }}
                </td>
              </tr>
              <tr v-for="category in lowerCategories" :key="category" class="border-t border-[#dfbd8c]">
                <th scope="row" class="px-4 py-2 text-sm font-bold">{{ KNIFFEL_CATEGORY_LABELS[category] }}</th>
                <td v-for="(player, playerIndex) in players" :key="player.seatIndex" class="px-3 py-2 text-center">
                  <AppButton
                    v-if="playerIndex === state.currentPlayerIndex && state.scoreSheets[playerIndex][category] === undefined"
                    :variant="categoryButtonVariant(category)"
                    class="min-h-9 px-2 py-1 text-xs"
                    :disabled="isAiTurn || !validCategories.has(category)"
                    @click="score(category)"
                  >
                    {{ categoryButtonLabel(category) }}
                  </AppButton>
                  <span v-else>{{ state.scoreSheets[playerIndex][category] ?? '–' }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-[#c48a4a] bg-[#fff3c4] font-bold">
              <tr>
                <th scope="row" class="px-4 py-3">Gesamt</th>
                <td v-for="(player, playerIndex) in players" :key="player.seatIndex" class="px-3 py-3 text-center">
                  {{ playerTotals[playerIndex] }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
