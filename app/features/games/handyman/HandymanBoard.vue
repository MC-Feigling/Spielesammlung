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

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
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
const feedbackLabel = computed(() => {
  if (state.value.lastFeedback === 'correct') return 'Super!'
  if (state.value.lastFeedback === 'wrongTool' || state.value.lastFeedback === 'wrongPart') {
    return 'Nicht passend'
  }
  return ''
})

function syncState(): void {
  state.value = game.getState()

  if (state.value.phase === 'finished' && !hasEmittedComplete.value) {
    hasEmittedComplete.value = true
    play('win')
    emit('complete', game.getWinnerSeatIndexes())
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
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm font-bold uppercase tracking-[0.16em] text-[#8a5a2b]">
        Runde {{ Math.min(state.roundIndex + 1, state.totalRounds) }} / {{ state.totalRounds }}
      </p>
    </div>

    <TurnBanner
      v-if="currentPlayer && state.phase !== 'finished'"
      :player-name="currentPlayer.displayName"
      :is-ai="isAiTurn"
      :hint="turnHint"
    />

    <dl class="mt-4 grid gap-2 sm:grid-cols-2">
      <div
        v-for="player in players"
        :key="player.seatIndex"
        class="flex items-center justify-between gap-3 rounded-2xl bg-[#fff6e8] px-4 py-3 ring-2 ring-[#d2a56a]"
        :class="player.seatIndex === state.currentSeatIndex ? 'ring-[#c56a2d]' : ''"
      >
        <div>
          <dt class="font-bold">{{ player.displayName }}</dt>
          <dd class="text-sm text-[#6b4a2e]">{{ player.type === 'ai' ? 'KI' : 'Mensch' }}</dd>
        </div>
        <dd class="text-2xl font-bold text-[#8a4218]">
          {{ state.players.find((entry) => entry.seatIndex === player.seatIndex)?.jobsCompleted ?? 0 }}
        </dd>
      </div>
    </dl>

    <div
      v-if="currentJob && state.phase !== 'finished'"
      class="job-card mt-5 rounded-[1.75rem] bg-[linear-gradient(160deg,#f4e0c2_0%,#e8c896_55%,#d9b078_100%)] p-5 shadow-[0_8px_0_#b8844a] ring-2 ring-[#c99655] sm:p-6"
    >
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#7a4e24]">Auftrag</p>
      <h2 class="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[#3f2412] sm:text-4xl">
        {{ currentJob.title }}
      </h2>
      <div
        class="job-illustration mt-4 grid h-28 place-items-center rounded-2xl bg-[#fff8ee]/80 ring-1 ring-[#c99655]/70 sm:h-32"
        aria-hidden="true"
      >
        <span class="job-glyph" :data-job="currentJob.id" />
      </div>
    </div>

    <div
      v-if="state.phase === 'pickTool' && state.choices"
      class="mt-5 grid gap-3 sm:grid-cols-3"
    >
      <button
        v-for="toolId in state.choices.tools"
        :key="toolId"
        type="button"
        class="choice-tile min-h-24 rounded-2xl bg-[#fffaf2] px-3 py-4 text-center shadow-[0_4px_0_#c99655] ring-2 ring-[#d2a56a] transition enabled:hover:-translate-y-0.5 enabled:focus-visible:outline-4 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-[#c56a2d] disabled:opacity-60"
        :disabled="!isHumanInput"
        @click="pickTool(toolId)"
      >
        <span class="tool-glyph mx-auto mb-2 block h-10 w-10" :data-tool="toolId" aria-hidden="true" />
        <span class="block text-lg font-bold text-[#3f2412]">{{ TOOL_LABELS[toolId] }}</span>
      </button>
    </div>

    <div
      v-if="state.phase === 'pickPart' && state.choices"
      class="mt-5"
    >
      <p
        v-if="state.selectedToolId"
        class="mb-3 text-sm font-bold text-[#6b4a2e]"
      >
        Werkzeug: {{ TOOL_LABELS[state.selectedToolId] }}
      </p>
      <div class="grid gap-3 sm:grid-cols-3">
        <button
          v-for="partId in state.choices.parts"
          :key="partId"
          type="button"
          class="choice-tile min-h-24 rounded-2xl bg-[#fffaf2] px-3 py-4 text-center shadow-[0_4px_0_#c99655] ring-2 ring-[#d2a56a] transition enabled:hover:-translate-y-0.5 enabled:focus-visible:outline-4 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-[#c56a2d] disabled:opacity-60"
          :disabled="!isHumanInput"
          @click="pickPart(partId)"
        >
          <span class="part-glyph mx-auto mb-2 block h-10 w-10" :data-part="partId" aria-hidden="true" />
          <span class="block text-lg font-bold text-[#3f2412]">{{ PART_LABELS[partId] }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="state.phase === 'feedback'"
      class="feedback-banner mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-4 ring-2"
      :class="state.lastFeedback === 'correct'
        ? 'bg-[#e7f6e4] ring-[#6f9f5c]'
        : 'bg-[#fde8e2] ring-[#c56a2d]'"
    >
      <p class="text-xl font-bold text-[#3f2412]">{{ feedbackLabel }}</p>
      <AppButton
        v-if="!isAiTurn"
        variant="ghost"
        @click="acknowledgeFeedback"
      >
        Weiter
      </AppButton>
    </div>
  </section>
</template>

<style scoped>
.job-glyph,
.tool-glyph,
.part-glyph {
  display: block;
  border-radius: 0.75rem;
  background:
    linear-gradient(135deg, #f7d7a4 0%, #e2b06a 100%);
  box-shadow: inset 0 0 0 2px rgba(122, 78, 36, 0.25);
  position: relative;
}

.job-glyph {
  width: 4.5rem;
  height: 4.5rem;
}

.job-glyph::after,
.tool-glyph::after,
.part-glyph::after {
  content: '';
  position: absolute;
  inset: 18%;
  border-radius: 0.4rem;
  background: #8a4218;
  opacity: 0.85;
}

.job-glyph[data-job='lamp']::after {
  clip-path: polygon(35% 10%, 65% 10%, 70% 45%, 55% 45%, 55% 90%, 45% 90%, 45% 45%, 30% 45%);
  background: #c9a227;
}

.job-glyph[data-job='faucet']::after {
  clip-path: polygon(20% 35%, 55% 35%, 55% 20%, 80% 40%, 55% 60%, 55% 50%, 20% 50%);
  background: #4f7f9a;
}

.job-glyph[data-job='picture']::after {
  clip-path: polygon(15% 20%, 85% 20%, 85% 80%, 15% 80%);
  background: #6b8f3a;
}

.job-glyph[data-job='shelf']::after,
.job-glyph[data-job='door']::after {
  clip-path: polygon(20% 15%, 80% 15%, 80% 85%, 20% 85%);
}

.job-glyph[data-job='bike']::after {
  border-radius: 999px;
  clip-path: none;
}

.job-glyph[data-job='cable']::after {
  clip-path: polygon(10% 45%, 90% 30%, 90% 55%, 10% 70%);
  background: #3f2412;
}

.job-glyph[data-job='fence']::after {
  clip-path: polygon(10% 20%, 25% 20%, 25% 80%, 40% 80%, 40% 20%, 55% 20%, 55% 80%, 70% 80%, 70% 20%, 85% 20%, 85% 80%, 10% 80%);
  background: #6b8f3a;
}

.tool-glyph[data-tool='hammer']::after {
  clip-path: polygon(15% 25%, 55% 25%, 55% 40%, 70% 40%, 70% 85%, 50% 85%, 50% 45%, 15% 45%);
}

.tool-glyph[data-tool='screwdriver']::after {
  clip-path: polygon(45% 10%, 55% 10%, 55% 70%, 65% 70%, 50% 90%, 35% 70%, 45% 70%);
}

.tool-glyph[data-tool='wrench']::after {
  clip-path: polygon(20% 20%, 45% 20%, 55% 35%, 75% 25%, 85% 40%, 60% 55%, 70% 80%, 45% 80%, 35% 55%, 20% 45%);
}

.tool-glyph[data-tool='pliers']::after {
  clip-path: polygon(20% 15%, 40% 15%, 50% 45%, 60% 15%, 80% 15%, 60% 55%, 70% 85%, 55% 85%, 50% 60%, 45% 85%, 30% 85%, 40% 55%);
}

.tool-glyph[data-tool='paintbrush']::after {
  clip-path: polygon(40% 10%, 60% 10%, 58% 55%, 70% 55%, 70% 75%, 30% 75%, 30% 55%, 42% 55%);
  background: #4f7f9a;
}

.tool-glyph[data-tool='tape']::after {
  border-radius: 999px;
  clip-path: none;
}

.part-glyph[data-part='nail']::after {
  clip-path: polygon(45% 10%, 55% 10%, 55% 75%, 65% 75%, 50% 95%, 35% 75%, 45% 75%);
}

.part-glyph[data-part='screw']::after {
  clip-path: polygon(40% 10%, 60% 10%, 60% 70%, 70% 85%, 30% 85%, 40% 70%);
}

.part-glyph[data-part='pipe']::after {
  clip-path: polygon(10% 40%, 90% 40%, 90% 60%, 10% 60%);
  background: #4f7f9a;
}

.part-glyph[data-part='wire']::after {
  clip-path: polygon(10% 55%, 35% 35%, 55% 55%, 75% 30%, 90% 45%, 75% 50%, 55% 70%, 35% 50%, 15% 70%);
  background: #3f2412;
}

.part-glyph[data-part='paint']::after {
  clip-path: polygon(30% 20%, 70% 20%, 80% 80%, 20% 80%);
  background: #c56a2d;
}

.part-glyph[data-part='hinge']::after {
  clip-path: polygon(20% 25%, 45% 25%, 45% 75%, 20% 75%, 20% 60%, 35% 60%, 35% 40%, 20% 40%);
}

@keyframes handyman-pop {
  from {
    transform: scale(0.96);
    opacity: 0.7;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.job-card,
.choice-tile,
.feedback-banner {
  animation: handyman-pop 220ms ease-out;
}
</style>
