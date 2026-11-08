<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
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
import { plural, sortStandings, type GameStanding } from '../shared/standings'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[], standings?: GameStanding[]]
}>()

const AI_ACTION_DELAY_MS = 650
const game = createKniffelGame({ playerCount: props.players.length })
const { play } = useSound()
const { isRolling, rollWithAnimation, isDieRolling } = useDiceRollAnimation()
const state = ref<KniffelGameState>(game.getState())
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)
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

  if (result.winnerSeatIndexes.length > 0) {
    play('win')
    emit('complete', result.winnerSeatIndexes, sortStandings(state.value.scoreSheets.map((sheet, index) => {
      const total = totalScore(sheet)
      return { seatIndex: index, score: total, label: plural(total, 'Punkt', 'Punkte') }
    })))
  }
}

function getRollIndices(): number[] {
  if (state.value.dice.length === 0) return [0, 1, 2, 3, 4]
  return state.value.dice
    .map((_, dieIndex) => dieIndex)
    .filter((dieIndex) => !state.value.heldDice[dieIndex])
}

async function performAction(action: KniffelAction) {
  if (action.type === 'roll') {
    await rollWithAnimation({
      indices: getRollIndices(),
      onRoll: () => applyAction(action),
    })
    return
  }

  applyAction(action)
}

async function rollDice() {
  if (isAiTurn.value || !canRoll.value || isRolling.value) return
  await performAction({ type: 'roll' })
}

function toggleHold(dieIndex: number) {
  if (isAiTurn.value || !canToggleHold.value || isRolling.value) return
  applyAction({ type: 'toggleHold', dieIndex })
}

function score(category: KniffelCategory) {
  if (isAiTurn.value || !validCategories.value.has(category) || isRolling.value) return
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

const bestCategory = computed<KniffelCategory | null>(() => {
  if (isAiTurn.value || state.value.rollsUsed === 0) return null
  let best: KniffelCategory | null = null
  let bestScore = 0
  for (const category of validCategories.value) {
    const preview = categoryPreview(category)
    if (preview !== null && preview > bestScore) {
      best = category
      bestScore = preview
    }
  }
  return best
})

function isOpenForCurrent(playerIndex: number, category: KniffelCategory): boolean {
  return playerIndex === state.value.currentPlayerIndex
    && state.value.scoreSheets[playerIndex]![category] === undefined
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
    const action = chooseKniffelAction(state.value, { difficulty: aiDifficulty.value })
    if (action) void performAction(action)
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
      :seat-index="currentPlayer.seatIndex"
      :is-ai="isAiTurn"
      :hint="isAiTurn ? 'Die KI würfelt…' : state.rollsUsed === 0 ? 'Würfle!' : 'Würfel halten oder Punkte eintragen.'"
    />

    <div class="flex flex-wrap items-center gap-4 rounded-3xl bg-[var(--color-panel)] px-4 py-2 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
      <div class="min-w-[6rem]">
        <p class="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--color-accent)]">Wurf {{ state.rollsUsed }}/3</p>
        <p class="text-xs font-bold text-[#6b4f3a]">Würfel antippen = halten</p>
      </div>
      <div class="grid flex-1 grid-cols-5 gap-2 sm:max-w-[26rem]">
        <DiceDie
          v-for="(die, dieIndex) in state.dice"
          :key="dieIndex"
          :value="die"
          :is-rolling="isDieRolling(dieIndex, state.heldDice[dieIndex])"
          :held="state.heldDice[dieIndex]"
          size="lg"
          interactive
          :label="`${die} Augen${state.heldDice[dieIndex] ? ', gehalten' : ', halten'}`"
          @click="toggleHold(dieIndex)"
        />
        <DiceDie
          v-for="dieIndex in Math.max(0, 5 - state.dice.length)"
          :key="`empty-${dieIndex}`"
          :value="null"
          :is-rolling="isDieRolling(dieIndex)"
          placeholder
          size="lg"
        />
      </div>
      <AppButton class="min-w-[11rem] text-lg" :disabled="isAiTurn || !canRoll || isRolling" @click="rollDice">
        🎲 {{ state.rollsUsed === 0 ? 'Würfeln' : 'Nochmal' }}
      </AppButton>
    </div>

    <div class="mt-3 grid gap-4 md:grid-cols-2">
      <div
        v-for="(group, groupIndex) in [
          { title: 'Oben', categories: UPPER_CATEGORIES },
          { title: 'Unten', categories: lowerCategories },
        ]"
        :key="group.title"
        class="overflow-x-auto rounded-3xl bg-[var(--color-panel)] shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]"
      >
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-[#fff3c4]">
            <tr>
              <th scope="col" class="px-3 py-2 font-extrabold">{{ group.title }}</th>
              <th
                v-for="(player, playerIndex) in players"
                :key="player.seatIndex"
                scope="col"
                class="px-2 py-2 text-center font-extrabold"
                :class="playerIndex === state.currentPlayerIndex ? 'text-[var(--color-accent)]' : ''"
              >
                <span class="block max-w-[5.5rem] truncate">{{ player.displayName }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="category in group.categories"
              :key="category"
              class="border-t border-[#ecd4ae]"
              :class="bestCategory === category ? 'bg-[#fff1ce]' : ''"
            >
              <th scope="row" class="px-3 py-0.5 font-bold">
                {{ KNIFFEL_CATEGORY_LABELS[category] }}
                <span v-if="bestCategory === category" class="ml-1 rounded-full bg-[#f0b429] px-1.5 text-[0.65rem] font-extrabold text-[#2b2118]">Tipp</span>
              </th>
              <td v-for="(player, playerIndex) in players" :key="player.seatIndex" class="px-2 py-0.5 text-center">
                <AppButton
                  v-if="isOpenForCurrent(playerIndex, category) && state.rollsUsed > 0"
                  :variant="categoryButtonVariant(category)"
                  class="!min-h-7 !rounded-lg !border !px-2 !py-0 text-xs"
                  :disabled="isAiTurn || !validCategories.has(category)"
                  @click="score(category)"
                >
                  {{ categoryButtonLabel(category) }}
                </AppButton>
                <span v-else class="tabular-nums">{{ state.scoreSheets[playerIndex]![category] ?? (isOpenForCurrent(playerIndex, category) ? '·' : '–') }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="groupIndex === 0" class="border-t-2 border-[#c48a4a] bg-[#fffaf0] font-bold">
            <tr>
              <th scope="row" class="px-3 py-1">Summe oben</th>
              <td v-for="(player, playerIndex) in players" :key="`upper-${player.seatIndex}`" class="px-2 py-1 text-center tabular-nums">
                {{ playerUpperSums[playerIndex] }}
              </td>
            </tr>
            <tr class="border-t border-[#ecd4ae]">
              <th scope="row" class="px-3 py-1">Bonus (+35 ab 63)</th>
              <td v-for="(player, playerIndex) in players" :key="`bonus-${player.seatIndex}`" class="px-2 py-1 text-center tabular-nums">
                {{ playerUpperBonuses[playerIndex] }}
              </td>
            </tr>
          </tfoot>
          <tfoot v-else class="border-t-2 border-[#c48a4a] bg-[#fff3c4] font-extrabold">
            <tr>
              <th scope="row" class="px-3 py-2">Gesamt</th>
              <td v-for="(player, playerIndex) in players" :key="`total-${player.seatIndex}`" class="px-2 py-2 text-center text-base tabular-nums">
                {{ playerTotals[playerIndex] }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </section>
</template>
