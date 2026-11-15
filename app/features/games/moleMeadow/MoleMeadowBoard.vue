<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import { playerColor } from '~/constants/players'
import { sortStandings, type GameStanding } from '../shared/standings'
import { chooseMoleMeadowAction } from './ai'
import {
  MOLE_GOAL,
  MOLE_START,
  createMoleMeadowGame,
  type MoleDieFace,
  type MoleMeadowAction,
  type MoleMeadowState,
} from './engine'

const props = defineProps<{
  players: SessionPlayer[]
  figureCount: number
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[], standings?: GameStanding[]]
}>()

/** Board coordinates in a 160×100 box: index 0 unused (start), 1..16 path, 17 = apple tree. */
const FIELDS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [37, 88], [50, 86], [63, 84], [76, 86], [89, 88], [102, 86], [115, 82], [127, 74],
  [130, 61], [119, 52], [105, 51], [91, 53], [77, 51], [64, 45], [56, 33], [62, 21],
  [79, 15],
]
const VIEW_W = 160
const VIEW_H = 100
const AI_DELAY_MS = 750
const ANIM_MS = 650
const END_SHOW_MS = 1400

const game = createMoleMeadowGame({ playerCount: props.players.length, figureCount: props.figureCount })
const { play } = useSound()
const { isRolling, rollWithAnimation } = useDiceRollAnimation()
const session = useSessionStore()
const state = ref<MoleMeadowState>(game.getState())
const busy = ref(false)
const splash = ref<{ field: number; key: number; color: string; text: string } | null>(null)
const dug = ref<{ field: number; key: number } | null>(null)
const rollingFace = ref<MoleDieFace>(1)
let aiTimer: ReturnType<typeof setTimeout> | undefined
let busyTimer: ReturnType<typeof setTimeout> | undefined
let endTimer: ReturnType<typeof setTimeout> | undefined
let rollTicker: ReturnType<typeof setInterval> | undefined
let effectKey = 0

const currentPlayer = computed(() => props.players[state.value.currentPlayerIndex])
const isAiTurn = computed(() => currentPlayer.value?.type === 'ai')
const isOver = computed(() => game.isTerminal())
const validActions = computed(() => {
  void state.value
  return game.getValidActions()
})
const canAct = computed(() => !isAiTurn.value && !busy.value && !isRolling.value && !isOver.value)
const canRoll = computed(() => canAct.value && validActions.value.some((action) => action.type === 'roll'))
const canDig = computed(() => canAct.value && validActions.value.some((action) => action.type === 'dig'))
const movable = computed(() => new Set(validActions.value
  .filter((action): action is Extract<MoleMeadowAction, { type: 'move' }> => action.type === 'move')
  .map((action) => action.pieceIndex)))

const shownFace = computed<MoleDieFace | null>(() => (isRolling.value ? rollingFace.value : state.value.pendingRoll))

const hint = computed(() => {
  if (isOver.value) return 'Am Apfelbaum!'
  if (isAiTurn.value) return 'Der Roboter ist dran …'
  const roll = state.value.pendingRoll
  if (roll === null) return 'Tippe auf den Würfel!'
  if (roll === 'mole') return 'Der Maulwurf! Lass ihn buddeln.'
  return `Welcher Hase hoppelt ${roll} ${roll === 1 ? 'Feld' : 'Felder'}?`
})

function pct(x: number, y: number) {
  return { left: `${(x / VIEW_W) * 100}%`, top: `${(y / VIEW_H) * 100}%` }
}

/** Start meadow: one row of burrow spots per player at the bottom left. */
function startSpot(playerIndex: number, pieceIndex: number): readonly [number, number] {
  return [7 + pieceIndex * 6.5, 50 + playerIndex * 11.5]
}

const rabbits = computed(() => state.value.pieces.flatMap((own, playerIndex) => own.map((position, pieceIndex) => {
  const [x, y] = position === MOLE_START ? startSpot(playerIndex, pieceIndex) : FIELDS[position]!
  const isCurrent = playerIndex === state.value.currentPlayerIndex
  return {
    key: `${playerIndex}-${pieceIndex}`,
    playerIndex,
    pieceIndex,
    position,
    style: { ...pct(x, y), zIndex: Math.round(y) + (position === MOLE_GOAL ? 200 : 10) },
    color: playerColor(playerIndex),
    canMove: isCurrent && canAct.value && typeof state.value.pendingRoll === 'number' && movable.value.has(pieceIndex),
  }
})))

const pathD = computed(() => FIELDS.slice(1)
  .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
  .join(' '))

function fieldLabel(position: number): string {
  if (position === MOLE_START) return 'am Start'
  if (position === MOLE_GOAL) return 'am Apfelbaum'
  return `auf Feld ${position}`
}

function rabbitLabel(playerIndex: number, pieceIndex: number, position: number): string {
  const name = props.players[playerIndex]?.displayName ?? 'Spieler'
  return `Hase ${pieceIndex + 1} von ${name}, ${fieldLabel(position)}`
}

function lockFor(ms: number) {
  busy.value = true
  if (busyTimer) clearTimeout(busyTimer)
  busyTimer = setTimeout(() => {
    busy.value = false
    busyTimer = undefined
  }, ms)
}

function finish() {
  play('win')
  const winners = game.getWinnerSeatIndexes()
  const standings = sortStandings(state.value.pieces.map((own, seatIndex) => {
    const best = Math.max(...own)
    return {
      seatIndex,
      score: best,
      label: best === MOLE_GOAL ? 'Am Apfelbaum!' : best === MOLE_START ? 'Noch am Start' : `Weitester Hase: Feld ${best}`,
    }
  }))
  endTimer = setTimeout(() => emit('complete', winners, standings), END_SHOW_MS)
}

function apply(action: MoleMeadowAction) {
  const result = game.applyAction(action)
  state.value = result.state
  const event = result.state.lastEvent

  if (event?.type === 'moved') {
    if (event.fell) {
      play('hit')
      splash.value = { field: event.to, key: ++effectKey, color: playerColor(event.piece.playerIndex), text: 'Plumps!' }
      lockFor(ANIM_MS * 2)
    } else {
      lockFor(ANIM_MS)
    }
  } else if (event?.type === 'dug') {
    dug.value = { field: event.opened, key: ++effectKey }
    if (event.fallen.length > 0) {
      play('hit')
      splash.value = { field: event.opened, key: ++effectKey, color: playerColor(event.fallen[0]!.playerIndex), text: 'Plumps!' }
    } else {
      play('match')
    }
    lockFor(ANIM_MS * 2)
  }

  if (result.winnerSeatIndexes.length > 0) finish()
}

async function roll() {
  if (isRolling.value) return
  rollTicker = setInterval(() => {
    rollingFace.value = ([1, 2, 3, 'mole'] as const)[Math.floor(Math.random() * 4)]!
  }, 110)
  await rollWithAnimation({ onRoll: () => apply({ type: 'roll' }) })
  clearInterval(rollTicker)
  rollTicker = undefined
  autoMoveIfObvious()
}

/** All own rabbits on the same spot (e.g. all at the start): no choice to make, so just hop. */
function autoMoveIfObvious() {
  if (isAiTurn.value || typeof state.value.pendingRoll !== 'number') return
  const own = state.value.pieces[state.value.currentPlayerIndex]!
  const choices = [...movable.value]
  if (choices.length > 0 && choices.every((pieceIndex) => own[pieceIndex] === own[choices[0]!])) {
    busy.value = true
    if (busyTimer) clearTimeout(busyTimer)
    busyTimer = setTimeout(() => {
      busy.value = false
      busyTimer = undefined
      apply({ type: 'move', pieceIndex: choices[0]! })
    }, 450)
  }
}

function onRabbit(playerIndex: number, pieceIndex: number) {
  if (!canAct.value || playerIndex !== state.value.currentPlayerIndex || !movable.value.has(pieceIndex)) return
  apply({ type: 'move', pieceIndex })
}

function onDig() {
  if (canDig.value) apply({ type: 'dig' })
}

function scheduleAi() {
  if (!isAiTurn.value || isOver.value || busy.value || isRolling.value || aiTimer) return
  aiTimer = setTimeout(() => {
    aiTimer = undefined
    if (!isAiTurn.value || isOver.value) return
    const action = chooseMoleMeadowAction(state.value, game.getValidActions(), { difficulty: session.aiDifficulty })
    if (!action) return
    if (action.type === 'roll') void roll()
    else apply(action)
  }, AI_DELAY_MS)
}

watch(
  () => [state.value, busy.value, isRolling.value],
  scheduleAi,
  { immediate: true },
)

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
  if (busyTimer) clearTimeout(busyTimer)
  if (endTimer) clearTimeout(endTimer)
  if (rollTicker) clearInterval(rollTicker)
})
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <TurnBanner
      v-if="currentPlayer"
      :player-name="currentPlayer.displayName"
      :seat-index="currentPlayer.seatIndex"
      :is-ai="isAiTurn"
      :hint="hint"
    />

    <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div class="meadow relative w-full overflow-hidden rounded-[1.6rem] ring-4 ring-[#6f9a4a] shadow-[0_6px_0_#4f7434]">
        <svg :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" class="block h-auto w-full" aria-hidden="true">
          <defs>
            <radialGradient id="mm-grass" cx="50%" cy="40%" r="75%">
              <stop offset="0%" stop-color="#b9e07a" />
              <stop offset="100%" stop-color="#7fbf4f" />
            </radialGradient>
            <radialGradient id="mm-crown" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stop-color="#7cc35a" />
              <stop offset="100%" stop-color="#3f8a36" />
            </radialGradient>
          </defs>
          <rect width="160" height="100" fill="url(#mm-grass)" />

          <!-- flowers and tufts -->
          <g opacity="0.85">
            <g v-for="(f, i) in [[20,20],[34,10],[44,30],[140,20],[150,40],[146,90],[96,70],[30,68],[118,94],[86,34],[70,70],[150,64]]" :key="i" :transform="`translate(${f[0]} ${f[1]})`">
              <circle r="1.2" :fill="['#fff', '#ffd23f', '#f6a6c1'][i % 3]" />
              <circle r="0.5" fill="#f0b429" />
            </g>
            <path v-for="(t, i) in [[12,40],[40,60],[100,40],[136,34],[110,66],[24,94],[60,64],[146,76]]" :key="`t${i}`" :d="`M${t[0]} ${t[1]} l1 -3 l1 3 l1 -2.5 l1 2.5`" stroke="#5f9a3a" stroke-width="0.7" fill="none" />
          </g>

          <!-- start burrow area -->
          <rect x="1.5" y="42" width="30" height="56" rx="8" fill="#a5cf6a" stroke="#6f9a4a" stroke-width="0.8" stroke-dasharray="2 1.5" />
          <text x="16.5" y="47.5" text-anchor="middle" font-size="4" font-weight="800" fill="#3f6b2a">Start</text>

          <!-- path -->
          <path :d="pathD" fill="none" stroke="#d9b98a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
          <path :d="pathD" fill="none" stroke="#e9d0a6" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- apple tree -->
          <g>
            <rect x="94" y="16" width="7" height="22" rx="2" fill="#8a5a32" />
            <circle cx="98" cy="13" r="15" fill="url(#mm-crown)" />
            <circle cx="86" cy="18" r="9" fill="url(#mm-crown)" />
            <circle cx="110" cy="18" r="9" fill="url(#mm-crown)" />
            <circle v-for="(a, i) in [[92,8],[103,6],[108,15],[88,18],[98,18],[113,22],[84,13]]" :key="`a${i}`" :cx="a[0]" :cy="a[1]" r="2.1" fill="#e2453a" stroke="#a52a20" stroke-width="0.4" />
          </g>

          <!-- fields -->
          <g v-for="(field, index) in FIELDS" :key="`f${index}`">
            <template v-if="index > 0 && index < FIELDS.length - 1">
              <ellipse :cx="field[0]" :cy="field[1] + 0.6" rx="5.2" ry="3.4" fill="#c79f6a" />
              <ellipse :cx="field[0]" :cy="field[1]" rx="5" ry="3.2" fill="#f3e2c2" stroke="#b88d58" stroke-width="0.5" />
              <text :x="field[0]" :y="field[1] + 1.2" text-anchor="middle" font-size="3.2" font-weight="800" fill="#a07848">{{ index }}</text>
            </template>
            <template v-else-if="index === FIELDS.length - 1">
              <ellipse :cx="field[0]" :cy="field[1] + 1" rx="8" ry="4.4" fill="#f3d36b" stroke="#c49a2a" stroke-width="0.6" />
              <text :x="field[0]" :y="field[1] + 2" text-anchor="middle" font-size="3.4" font-weight="800" fill="#7a5a10">Ziel</text>
            </template>
          </g>
        </svg>

        <!-- open hole with the mole -->
        <div
          v-if="state.openHole !== null"
          :key="`hole-${state.openHole}-${dug?.key ?? 0}`"
          class="hole"
          :class="{ 'is-new': dug?.field === state.openHole }"
          :style="{ ...pct(FIELDS[state.openHole]![0], FIELDS[state.openHole]![1] + 1), zIndex: 5 }"
          :aria-label="`Offenes Loch auf Feld ${state.openHole}`"
          role="img"
        >
          <MoleMeadowMole />
        </div>

        <!-- rabbits -->
        <button
          v-for="rabbit in rabbits"
          :key="rabbit.key"
          type="button"
          class="rabbit"
          :class="{ 'can-move': rabbit.canMove }"
          :style="{ ...rabbit.style, '--seat': rabbit.color }"
          :disabled="!rabbit.canMove"
          :aria-label="rabbitLabel(rabbit.playerIndex, rabbit.pieceIndex, rabbit.position)"
          @click="onRabbit(rabbit.playerIndex, rabbit.pieceIndex)"
        >
          <span class="seat-ring" aria-hidden="true" />
          <MoleMeadowRabbit :color="rabbit.color" />
        </button>

        <!-- falling effect -->
        <div
          v-if="splash"
          :key="`splash-${splash.key}`"
          class="splash"
          :style="{ ...pct(FIELDS[splash.field]![0], FIELDS[splash.field]![1]), zIndex: 300 }"
          aria-hidden="true"
        >
          <span class="sinking"><MoleMeadowRabbit :color="splash.color" /></span>
          <span class="splash-text">{{ splash.text }}</span>
        </div>
      </div>

      <aside class="flex shrink-0 flex-row items-center justify-center gap-4 rounded-[1.6rem] bg-[var(--color-panel)] p-4 shadow-[0_4px_0_#dfbd8c] ring-2 ring-[#ecd4ae] lg:w-48 lg:flex-col">
        <button
          type="button"
          class="die"
          :class="{ 'is-rolling': isRolling, 'is-ready': canRoll }"
          :disabled="!canRoll"
          :aria-label="shownFace === null ? 'Würfeln' : shownFace === 'mole' ? 'Würfel zeigt Maulwurf' : `Würfel zeigt ${shownFace}`"
          @click="roll"
        >
          <span v-if="shownFace === null" class="text-4xl font-black text-[#c8b49a]">?</span>
          <span v-else-if="shownFace === 'mole'" class="block h-[78%] w-[78%]"><MoleMeadowMole /></span>
          <span v-else class="pips" :class="`pips-${shownFace}`">
            <i v-for="n in shownFace" :key="n" />
          </span>
        </button>

        <div class="flex min-w-0 flex-col items-center gap-2 text-center">
          <p class="text-sm font-extrabold text-[#6b4f3a]">
            {{ canRoll ? 'Tippe auf den Würfel' : isRolling ? 'Rollt …' : hint }}
          </p>
          <AppButton v-if="canDig" class="text-sm" @click="onDig">
            Maulwurf buddeln lassen!
          </AppButton>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.rabbit {
  position: absolute;
  width: 7.2%;
  aspect-ratio: 1;
  transform: translate(-50%, -82%);
  transition: left 0.45s ease, top 0.45s ease;
  border-radius: 50%;
  background: transparent;
}

.rabbit:disabled {
  cursor: default;
}

.rabbit:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 2px;
}

.seat-ring {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 2%;
  height: 22%;
  border-radius: 50%;
  border: 3px solid var(--seat);
  background: color-mix(in srgb, var(--seat) 30%, transparent);
}

.rabbit.can-move {
  cursor: pointer;
  animation: rabbit-hop 0.8s ease-in-out infinite;
}

.rabbit.can-move .seat-ring {
  box-shadow: 0 0 0 3px #fff, 0 0 12px 4px var(--seat);
}

.hole {
  position: absolute;
  width: 9%;
  aspect-ratio: 4 / 3;
  transform: translate(-50%, -70%);
  pointer-events: none;
}

.hole.is-new {
  animation: hole-pop 0.55s ease-out;
}

.splash {
  position: absolute;
  width: 7.2%;
  aspect-ratio: 1;
  transform: translate(-50%, -82%);
  pointer-events: none;
}

.sinking {
  display: block;
  height: 100%;
  width: 100%;
  animation: sink 1s ease-in forwards;
}

.splash-text {
  position: absolute;
  left: 50%;
  top: -40%;
  transform: translateX(-50%);
  white-space: nowrap;
  border-radius: 999px;
  background: #fff;
  padding: 0.1rem 0.6rem;
  font-weight: 900;
  color: var(--color-accent);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.15);
  animation: splash-text 1.3s ease-out forwards;
}

.die {
  display: grid;
  width: 5.5rem;
  height: 5.5rem;
  place-items: center;
  border-radius: 1.2rem;
  border: 4px solid #9e3b24;
  background: #fff;
  box-shadow: 0 5px 0 #c48a4a;
  transition: transform 0.15s ease;
}

.die.is-ready {
  cursor: pointer;
  animation: die-wiggle 1.4s ease-in-out infinite;
}

.die.is-ready:hover {
  transform: translateY(-3px);
}

.die:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 3px;
}

.die.is-rolling {
  animation: die-tumble 0.35s linear infinite;
}

.pips {
  display: grid;
  width: 62%;
  height: 62%;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
}

.pips i {
  width: 0.95rem;
  height: 0.95rem;
  place-self: center;
  border-radius: 50%;
  background: #4c3424;
}

.pips-1 i { grid-area: 2 / 2; }
.pips-2 i:nth-child(1) { grid-area: 1 / 1; }
.pips-2 i:nth-child(2) { grid-area: 3 / 3; }
.pips-3 i:nth-child(1) { grid-area: 1 / 1; }
.pips-3 i:nth-child(2) { grid-area: 2 / 2; }
.pips-3 i:nth-child(3) { grid-area: 3 / 3; }

@keyframes rabbit-hop {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -10%; }
}

@keyframes hole-pop {
  0% { transform: translate(-50%, -70%) scale(0.2); }
  70% { transform: translate(-50%, -70%) scale(1.15); }
  100% { transform: translate(-50%, -70%) scale(1); }
}

@keyframes sink {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  30% { transform: translateY(-18%) scale(1.05); opacity: 1; }
  100% { transform: translateY(45%) scale(0.2); opacity: 0; }
}

@keyframes splash-text {
  0% { opacity: 0; translate: 0 30%; }
  20% { opacity: 1; translate: 0 0; }
  80% { opacity: 1; }
  100% { opacity: 0; translate: 0 -40%; }
}

@keyframes die-wiggle {
  0%, 80%, 100% { rotate: 0deg; }
  85% { rotate: -6deg; }
  90% { rotate: 6deg; }
  95% { rotate: -3deg; }
}

@keyframes die-tumble {
  0% { rotate: 0deg; scale: 1; }
  50% { rotate: 180deg; scale: 0.9; }
  100% { rotate: 360deg; scale: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .rabbit,
  .rabbit.can-move,
  .hole.is-new,
  .sinking,
  .splash-text,
  .die.is-ready,
  .die.is-rolling {
    animation: none;
    transition: none;
  }
}
</style>
