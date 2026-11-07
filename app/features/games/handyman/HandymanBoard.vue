<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import { chooseHandymanPart, chooseHandymanTool } from './ai'
import {
  PART_LABELS,
  TOOL_LABELS,
  getHandymanJob,
  type PartId,
  type ToolId,
} from './catalog'
import {
  createHandymanGame,
  type HandymanState,
} from './engine'
import { plural, sortStandings, type GameStanding } from '../shared/standings'
import { playerColor } from '~/constants/players'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[], standings?: GameStanding[]]
}>()

const AI_PICK_DELAY_MS = 750
const AI_FEEDBACK_DELAY_MS = 700
const HUMAN_FEEDBACK_AUTO_MS = 1200

const game = createHandymanGame({
  players: props.players.map((player) => ({
    seatIndex: player.seatIndex,
    type: player.type,
  })),
})
const { play } = useSound()
const state = ref<HandymanState>(game.getState())
const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)
const hasEmittedComplete = ref(false)

let aiTimer: ReturnType<typeof setTimeout> | undefined
let humanFeedbackTimer: ReturnType<typeof setTimeout> | undefined

const currentPlayer = computed(() =>
  props.players.find((player) => player.seatIndex === state.value.currentSeatIndex),
)
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const isHumanInput = computed(() =>
  !isAiTurn.value
  && (state.value.phase === 'pickTool' || state.value.phase === 'pickPart'),
)
const currentJob = computed(() =>
  state.value.currentJobId ? getHandymanJob(state.value.currentJobId) : null,
)
const turnHint = computed(() => {
  if (state.value.phase === 'feedback') {
    if (state.value.lastFeedback === 'correct') return 'Super!'
    return 'Nicht passend'
  }
  if (isAiTurn.value) return 'Die KI arbeitet…'
  if (state.value.phase === 'pickTool') return 'Wähle das passende Werkzeug.'
  if (state.value.phase === 'pickPart') return 'Wähle das passende Teil.'
  return ''
})
const sceneDone = computed(() => state.value.phase === 'feedback' && state.value.lastFeedback === 'correct')
const isWrong = computed(() => state.value.phase === 'feedback'
  && (state.value.lastFeedback === 'wrongTool' || state.value.lastFeedback === 'wrongPart'))
const toolStepDone = computed(() => state.value.phase === 'pickPart'
  || (state.value.phase === 'feedback' && state.value.lastFeedback !== 'wrongTool'))

function jobsOf(seatIndex: number): number {
  return state.value.players.find((entry) => entry.seatIndex === seatIndex)?.jobsCompleted ?? 0
}

function playerIndexOf(seatIndex: number): number {
  return Math.max(0, props.players.findIndex((player) => player.seatIndex === seatIndex))
}

const feedbackLabel = computed(() => {
  if (state.value.lastFeedback === 'correct') return 'Super, Auftrag erledigt!'
  if (state.value.lastFeedback === 'wrongTool') return 'Das Werkzeug passt hier nicht.'
  if (state.value.lastFeedback === 'wrongPart') return 'Das Teil passt hier nicht.'
  return ''
})

function syncState(): void {
  state.value = game.getState()

  if (state.value.phase === 'finished' && !hasEmittedComplete.value) {
    hasEmittedComplete.value = true
    play('win')
    emit('complete', game.getWinnerSeatIndexes(), sortStandings(state.value.players.map((player) => ({
      seatIndex: player.seatIndex,
      score: player.jobsCompleted,
      label: plural(player.jobsCompleted, 'Auftrag', 'Aufträge'),
    }))))
  }
}

function clearTimers(): void {
  if (aiTimer) {
    clearTimeout(aiTimer)
    aiTimer = undefined
  }
  if (humanFeedbackTimer) {
    clearTimeout(humanFeedbackTimer)
    humanFeedbackTimer = undefined
  }
}

function pickTool(toolId: ToolId): void {
  if (!isHumanInput.value || state.value.phase !== 'pickTool') return
  game.pickTool(state.value.currentSeatIndex, toolId)
  if (game.getState().lastFeedback === 'wrongTool') play('hit')
  else play('match')
  syncState()
}

function pickPart(partId: PartId): void {
  if (!isHumanInput.value || state.value.phase !== 'pickPart') return
  game.pickPart(state.value.currentSeatIndex, partId)
  if (game.getState().lastFeedback === 'correct') play('match')
  else play('hit')
  syncState()
}

function acknowledgeFeedback(): void {
  if (state.value.phase !== 'feedback') return
  clearTimers()
  game.acknowledgeFeedback()
  syncState()
}

function scheduleAiAction(): void {
  if (state.value.phase === 'finished' || aiTimer) return

  if (state.value.phase === 'feedback' && isAiTurn.value) {
    aiTimer = setTimeout(() => {
      aiTimer = undefined
      acknowledgeFeedback()
    }, AI_FEEDBACK_DELAY_MS)
    return
  }

  if (!isAiTurn.value || !currentJob.value || !state.value.choices) return

  if (state.value.phase === 'pickTool') {
    aiTimer = setTimeout(() => {
      aiTimer = undefined
      const toolId = chooseHandymanTool(currentJob.value!, state.value.choices!.tools, {
        difficulty: aiDifficulty.value,
      })
      game.pickTool(state.value.currentSeatIndex, toolId)
      const next = game.getState()
      play(next.lastFeedback === 'wrongTool' ? 'hit' : 'match')
      syncState()
    }, AI_PICK_DELAY_MS)
    return
  }

  if (state.value.phase === 'pickPart') {
    aiTimer = setTimeout(() => {
      aiTimer = undefined
      const partId = chooseHandymanPart(currentJob.value!, state.value.choices!.parts, {
        difficulty: aiDifficulty.value,
      })
      game.pickPart(state.value.currentSeatIndex, partId)
      const next = game.getState()
      play(next.lastFeedback === 'correct' ? 'match' : 'hit')
      syncState()
    }, AI_PICK_DELAY_MS)
  }
}

function scheduleHumanFeedback(): void {
  if (state.value.phase !== 'feedback' || isAiTurn.value || humanFeedbackTimer) return

  humanFeedbackTimer = setTimeout(() => {
    humanFeedbackTimer = undefined
    acknowledgeFeedback()
  }, HUMAN_FEEDBACK_AUTO_MS)
}

watch(
  () => [
    state.value.phase,
    state.value.currentSeatIndex,
    state.value.currentJobId,
    state.value.selectedToolId,
    state.value.lastFeedback,
  ],
  () => {
    clearTimers()
    scheduleAiAction()
    scheduleHumanFeedback()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <section class="handyman-board mx-auto w-full max-w-3xl">
    <TurnBanner
      v-if="currentPlayer && state.phase !== 'finished'"
      :player-name="currentPlayer.displayName"
      :seat-index="currentPlayer.seatIndex"
      :is-ai="isAiTurn"
      :hint="turnHint"
    />

    <div
      v-if="currentJob && state.phase !== 'finished'"
      class="job-card rounded-[1.6rem] bg-[var(--color-panel)] p-4 shadow-[0_6px_0_#d9b98c] ring-2 ring-[#ecd4ae] sm:p-5"
      :class="{ 'is-wrong': isWrong, 'is-done': sceneDone }"
    >
      <div class="flex flex-wrap gap-4">
        <div class="min-w-[14rem] flex-1">
          <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a0612f]">
            Auftrag · Runde {{ Math.min(state.roundIndex + 1, state.totalRounds) }}/{{ state.totalRounds }}
          </p>
          <h2 class="mt-1 font-[var(--font-display)] text-3xl font-semibold text-[#3f2412]">{{ currentJob.title }}</h2>
          <ol class="mt-3 flex flex-wrap items-center gap-2 text-sm font-extrabold" aria-label="Schritte">
            <li
              class="rounded-full px-3 py-1"
              :class="toolStepDone ? 'bg-[#4faf6a] text-white' : 'bg-[#e45b3a] text-white'"
            >
              1 Werkzeug <span v-if="toolStepDone" aria-hidden="true">✓</span>
            </li>
            <li aria-hidden="true" class="text-[#a0612f]">→</li>
            <li
              class="rounded-full px-3 py-1"
              :class="sceneDone
                ? 'bg-[#4faf6a] text-white'
                : state.phase === 'pickPart' ? 'bg-[#e45b3a] text-white' : 'bg-[#efe2cc] text-[#8a6a4a]'"
            >
              2 Teil <span v-if="sceneDone" aria-hidden="true">✓</span>
            </li>
          </ol>
          <div
            v-if="state.phase === 'feedback'"
            class="feedback-banner mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-2"
            :class="state.lastFeedback === 'correct'
              ? 'bg-[#e7f6e4] ring-[#6f9f5c]'
              : 'bg-[#fff1dc] ring-[#e0a24a]'"
            role="status"
          >
            <p class="text-lg font-bold text-[#3f2412]">
              <span aria-hidden="true">{{ state.lastFeedback === 'correct' ? '🎉' : '🤔' }}</span>
              {{ feedbackLabel }}
            </p>
            <AppButton
              v-if="!isAiTurn"
              variant="ghost"
              @click="acknowledgeFeedback"
            >
              Weiter
            </AppButton>
          </div>
          <ul class="mt-3 flex flex-wrap gap-2" aria-label="Erledigte Aufträge">
            <li
              v-for="player in players"
              :key="player.seatIndex"
              class="flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-sm font-bold ring-2"
              :style="{ '--tw-ring-color': playerColor(playerIndexOf(player.seatIndex)) }"
            >
              <PlayerAvatar
                :avatar-id="player.avatarId"
                :is-ai="player.type === 'ai'"
                :color="playerColor(playerIndexOf(player.seatIndex))"
                :size="24"
              />
              {{ player.displayName }}
              <span class="tabular-nums text-[#8a4218]">⭐ {{ jobsOf(player.seatIndex) }}</span>
            </li>
          </ul>
        </div>
        <div class="scene h-40 w-full overflow-hidden rounded-2xl ring-2 ring-[#ecd4ae] sm:w-64">
          <HandymanJobScene :job-id="currentJob.id" :done="sceneDone" />
        </div>
      </div>
    </div>

    <template v-if="state.choices && state.phase !== 'finished'">
      <h3 class="mt-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#a0612f]">Werkzeug</h3>
      <div class="mt-2 grid grid-cols-3 gap-3">
        <button
          v-for="toolId in state.choices.tools"
          :key="toolId"
          type="button"
          class="choice-tile"
          :class="{
            'is-picked': state.selectedToolId === toolId && state.phase !== 'pickTool',
            'is-dim': state.phase !== 'pickTool' && state.selectedToolId !== toolId,
          }"
          :disabled="!isHumanInput || state.phase !== 'pickTool'"
          @click="pickTool(toolId)"
        >
          <HandymanItemArt :item="toolId" :size="62" />
          <span class="text-base font-extrabold text-[#3f2412] sm:text-lg">{{ TOOL_LABELS[toolId] }}</span>
          <span v-if="state.selectedToolId === toolId && toolStepDone" class="check" aria-hidden="true">✓</span>
        </button>
      </div>

      <h3 class="mt-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#a0612f]">Teil</h3>
      <div class="mt-2 grid grid-cols-3 gap-3">
        <button
          v-for="partId in state.choices.parts"
          :key="partId"
          type="button"
          class="choice-tile"
          :class="{ 'is-dim': state.phase !== 'pickPart', 'is-ready': state.phase === 'pickPart' && isHumanInput }"
          :disabled="!isHumanInput || state.phase !== 'pickPart'"
          @click="pickPart(partId)"
        >
          <HandymanItemArt :item="partId" :size="62" />
          <span class="text-base font-extrabold text-[#3f2412] sm:text-lg">{{ PART_LABELS[partId] }}</span>
        </button>
      </div>
    </template>

  </section>
</template>

<style scoped>
.choice-tile {
  position: relative;
  display: flex;
  min-height: 6rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 1.2rem;
  border: 3px solid #dfbd8c;
  background: #fffaf2;
  padding: 0.5rem;
  box-shadow: 0 4px 0 #dfbd8c;
  transition: transform 0.12s ease, opacity 0.2s ease;
}

.choice-tile:enabled:hover {
  transform: translateY(-2px);
}

.choice-tile:enabled:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 2px;
}

.choice-tile:disabled {
  cursor: default;
}

.choice-tile.is-dim {
  opacity: 0.5;
}

.choice-tile.is-ready {
  border-color: var(--color-accent);
}

.choice-tile.is-picked {
  border-color: #4faf6a;
  background: #e3f4e3;
  opacity: 1;
}

.check {
  position: absolute;
  top: -0.6rem;
  right: -0.6rem;
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  place-items: center;
  border-radius: 999px;
  border: 3px solid #fff;
  background: #4faf6a;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 900;
}

.job-card.is-wrong {
  animation: hm-wobble 0.45s ease-in-out;
}

.job-card.is-done .scene {
  animation: hm-hop 0.45s ease-out;
}

.feedback-banner {
  animation: hm-pop 0.22s ease-out;
}

@keyframes hm-wobble {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px) rotate(-0.6deg); }
  50% { transform: translateX(5px) rotate(0.5deg); }
  75% { transform: translateX(-3px); }
}

@keyframes hm-hop {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
}

@keyframes hm-pop {
  from { transform: scale(0.96); opacity: 0.7; }
  to { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .job-card.is-wrong,
  .job-card.is-done .scene,
  .feedback-banner {
    animation: none;
  }
}
</style>
