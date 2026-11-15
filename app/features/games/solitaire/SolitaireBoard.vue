<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import {
  SOLITAIRE_SIZE,
  applyMove,
  createSolitaireState,
  findMove,
  isFinished,
  isPerfect,
  type SolitairePos,
  type SolitaireState,
} from './engine'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  finish: [pegsLeft: number, perfect: boolean]
}>()

const END_SHOW_MS = 1200
/** Inner square of the round board that holds the 7×7 grid (in % of the board). */
const GRID_OFFSET = 15
const GRID_SPAN = 70
const CELL = GRID_SPAN / SOLITAIRE_SIZE
/** Removed pegs rest in the groove along the rim. */
const GROOVE_RADIUS = 44.2

const { play } = useSound()
const state = ref<SolitaireState>(createSolitaireState())
const selected = ref<SolitairePos | null>(null)
const shake = ref<string | null>(null)
const isOver = ref(false)
let endTimer: ReturnType<typeof setTimeout> | undefined
let shakeTimer: ReturnType<typeof setTimeout> | undefined

const player = computed(() => props.players[0])
const removed = computed(() => 32 - state.value.pegCount)

const holes = computed(() => {
  const list: Array<{ key: string; row: number; col: number; peg: boolean; left: number; top: number }> = []
  state.value.cells.forEach((cells, row) => {
    cells.forEach((cell, col) => {
      if (cell === null) return
      list.push({
        key: `${row}-${col}`,
        row,
        col,
        peg: cell === 'peg',
        left: GRID_OFFSET + CELL * (col + 0.5),
        top: GRID_OFFSET + CELL * (row + 0.5),
      })
    })
  })
  return list
})

const groovePegs = computed(() => Array.from({ length: removed.value }, (_, index) => {
  // Start bottom-left and run clockwise around the rim, like taking pegs off the board.
  const angle = (135 + index * (360 / 32)) * (Math.PI / 180)
  return {
    key: index,
    left: 50 + GROOVE_RADIUS * Math.cos(angle),
    top: 50 + GROOVE_RADIUS * Math.sin(angle),
  }
}))

const hint = computed(() => {
  if (isOver.value) return state.value.pegCount === 1 ? 'Geschafft!' : 'Kein Sprung mehr möglich.'
  return selected.value ? 'Wohin soll die Kugel springen?' : `Noch ${state.value.pegCount} Kugeln – wähle eine Kugel.`
})

function isSelected(row: number, col: number): boolean {
  return selected.value?.row === row && selected.value?.col === col
}

function isLastLanding(row: number, col: number): boolean {
  const to = state.value.lastMove?.to
  return to?.row === row && to?.col === col
}

function wiggle(key: string) {
  shake.value = key
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => {
    shake.value = null
  }, 350)
}

function onHole(row: number, col: number) {
  if (isOver.value) return
  const cell = state.value.cells[row]![col]

  if (cell === 'peg') {
    selected.value = isSelected(row, col) ? null : { row, col }
    return
  }

  if (!selected.value) return

  const move = findMove(state.value, selected.value, { row, col })
  if (!move) {
    wiggle(`${selected.value.row}-${selected.value.col}`)
    return
  }

  state.value = applyMove(state.value, move)
  selected.value = null
  play('hit')

  if (isFinished(state.value)) {
    isOver.value = true
    const pegsLeft = state.value.pegCount
    const perfect = isPerfect(state.value)
    if (pegsLeft === 1) play('win')
    endTimer = setTimeout(() => emit('finish', pegsLeft, perfect), END_SHOW_MS)
  }
}

function holeLabel(row: number, col: number, peg: boolean): string {
  return `Reihe ${row + 1}, Spalte ${col + 1}: ${peg ? 'Kugel' : 'leer'}${isSelected(row, col) ? ', ausgewählt' : ''}`
}

onBeforeUnmount(() => {
  if (endTimer) clearTimeout(endTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
})
</script>

<template>
  <section
    class="mx-auto w-full"
    :style="{ maxWidth: 'max(19rem, min(38rem, calc(100vh - 12rem)))' }"
  >
    <TurnBanner
      v-if="player"
      :player-name="player.displayName"
      :seat-index="player.seatIndex"
      :is-ai="false"
      :hint="hint"
    />

    <div class="board" role="grid" aria-label="Solitär-Brett">
      <div class="groove" aria-hidden="true" />
      <div class="field" aria-hidden="true" />

      <span
        v-for="peg in groovePegs"
        :key="`out-${peg.key}`"
        class="peg is-out"
        :style="{ left: `${peg.left}%`, top: `${peg.top}%` }"
        aria-hidden="true"
      />

      <button
        v-for="hole in holes"
        :key="hole.key"
        type="button"
        role="gridcell"
        class="hole"
        :class="{ 'has-peg': hole.peg }"
        :style="{ left: `${hole.left}%`, top: `${hole.top}%`, width: `${CELL}%`, height: `${CELL}%` }"
        :aria-label="holeLabel(hole.row, hole.col, hole.peg)"
        :aria-pressed="isSelected(hole.row, hole.col)"
        :disabled="isOver"
        @click="onHole(hole.row, hole.col)"
      >
        <span class="pit" aria-hidden="true" />
        <span
          v-if="hole.peg"
          class="peg"
          :class="{
            'is-selected': isSelected(hole.row, hole.col),
            'is-landing': isLastLanding(hole.row, hole.col),
            'is-shaking': shake === hole.key,
          }"
          aria-hidden="true"
        />
      </button>
    </div>

    <p class="mt-3 text-center font-extrabold text-[#6b4f3a]" aria-live="polite">
      {{ state.pegCount }} {{ state.pegCount === 1 ? 'Kugel' : 'Kugeln' }} auf dem Brett
    </p>
  </section>
</template>

<style scoped>
.board {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  border-radius: 50%;
  background:
    repeating-linear-gradient(92deg, rgba(160, 110, 50, 0.07) 0 3px, transparent 3px 11px),
    radial-gradient(circle at 40% 35%, #f6d9a2, #e5b56c 70%, #d29c55);
  box-shadow: 0 10px 0 #b07a3c, 0 18px 28px rgba(80, 50, 20, 0.25);
}


.groove,
.field {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.groove {
  inset: 2.2%;
  background: radial-gradient(circle, transparent 84%, rgba(150, 95, 35, 0.32) 88%, rgba(150, 95, 35, 0.12) 93%, transparent 96%);
}

.field {
  inset: 11%;
  background:
    repeating-linear-gradient(90deg, rgba(160, 110, 50, 0.06) 0 2px, transparent 2px 9px),
    radial-gradient(circle at 45% 40%, #f8e0b0, #ecc584);
  box-shadow: inset 0 3px 6px rgba(120, 75, 25, 0.25);
}

.hole {
  position: absolute;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  cursor: pointer;
}

.hole:disabled {
  cursor: default;
}

.hole:focus-visible {
  outline: 4px solid var(--color-accent);
  outline-offset: 0;
}

.pit {
  position: absolute;
  width: 42%;
  height: 42%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #8a5a26, #b88346 70%);
  box-shadow: inset 0 3px 4px rgba(60, 30, 5, 0.55), 0 1px 0 rgba(255, 240, 210, 0.7);
}

.peg {
  position: relative;
  z-index: 1;
  display: block;
  width: 78%;
  height: 78%;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #a6735a 0%, #5a2f1e 32%, #321509 75%, #220c04 100%);
  box-shadow: 0 4px 0 #1a0802, 0 6px 8px rgba(40, 20, 5, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.peg.is-out {
  position: absolute;
  width: 4.6%;
  height: 4.6%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 0 #1a0802, 0 3px 4px rgba(40, 20, 5, 0.35);
  animation: peg-drop 0.35s ease-out both;
}

.hole.has-peg:not(:disabled):hover .peg {
  transform: translateY(-2px);
}

.peg.is-selected,
.hole.has-peg:hover .peg.is-selected {
  transform: translateY(-14%) scale(1.08);
  box-shadow: 0 0 0 4px #fff, 0 0 0 7px var(--color-accent), 0 12px 14px rgba(40, 20, 5, 0.45);
}

.peg.is-landing {
  animation: peg-land 0.3s ease-out;
}

.peg.is-shaking {
  animation: peg-shake 0.35s ease-in-out;
}

@keyframes peg-land {
  0% { transform: translateY(-30%) scale(1.1); }
  70% { transform: translateY(4%) scale(0.97); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes peg-shake {
  0%, 100% { translate: 0 0; }
  25% { translate: -8% 0; }
  75% { translate: 8% 0; }
}

@keyframes peg-drop {
  from { opacity: 0; scale: 1.6; }
  to { opacity: 1; scale: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .peg,
  .peg.is-out,
  .peg.is-landing,
  .peg.is-shaking {
    animation: none;
    transition: none;
  }
}
</style>
