<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import {
  JUMP_AIR_MS,
  TRACK_LENGTH,
  VIEW_AHEAD,
  VIEW_BEHIND,
  createHorseRacingGame,
  maxSpeedForProgress,
  type HorseRacingHorse,
  type HorseRacingState,
} from './engine'
import { chooseHorseRacingActions } from './ai'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()

const HORSE_COLORS = ['#c45c26', '#2f6f8f', '#3f7d4e', '#8b3d5a'] as const

const P1_HOLD_KEYS = new Set(['d', 'D'])
const P1_JUMP_KEYS = new Set(['f', 'F'])
const P2_HOLD_KEYS = new Set(['j', 'J'])
const P2_JUMP_KEYS = new Set(['k', 'K'])

const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)

const game = createHorseRacingGame({
  players: props.players.map((player) => ({ seatIndex: player.seatIndex, type: player.type })),
})

const state = ref<HorseRacingState>(cloneState())

const humanPlayers = computed(() => props.players.filter((player) => player.type === 'human'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))
const cameraProgress = computed(() => Math.max(0, ...state.value.horses.map((horse) => horse.progress)))
const raceProgressPercent = computed(() => Math.min(100, (cameraProgress.value / TRACK_LENGTH) * 100))
const isRacing = computed(() => state.value.phase === 'racing')
const rankedHorses = computed(() =>
  [...state.value.horses].sort((a, b) => b.progress - a.progress),
)

const parallaxOffset = computed(() => (cameraProgress.value * 2.4) % 120)

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
let hasEmittedComplete = false
const previousSlowdowns = new Map<number, number>()
const keysHeld = new Set<string>()
const pointerHoldSeats = new Set<number>()

function cloneState(): HorseRacingState {
  return {
    ...game.state,
    horses: game.state.horses.map((horse) => ({ ...horse })),
    hurdles: game.state.hurdles.map((hurdle) => ({ ...hurdle })),
  }
}

function syncState(): void {
  state.value = cloneState()
}

function setHumanHold(seatIndex: number, held: boolean): void {
  if (!isRacing.value && held) return
  game.setHold(seatIndex, held)
  syncState()
}

function triggerJump(seatIndex: number): void {
  if (!isRacing.value) return
  game.jump(seatIndex)
  syncState()
}

function clearAllHolds(): void {
  pointerHoldSeats.clear()
  for (const horse of game.state.horses) {
    game.setHold(horse.seatIndex, false)
  }
  syncState()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.repeat) return

  const key = event.key
  if (P1_HOLD_KEYS.has(key) || P1_JUMP_KEYS.has(key) || P2_HOLD_KEYS.has(key) || P2_JUMP_KEYS.has(key)) {
    event.preventDefault()
  }

  if (keysHeld.has(key)) return
  keysHeld.add(key)

  const humans = humanPlayers.value
  if (!isRacing.value) return

  if (humans.length >= 1 && P1_HOLD_KEYS.has(key)) {
    setHumanHold(humans[0]!.seatIndex, true)
  }
  else if (humans.length >= 1 && P1_JUMP_KEYS.has(key)) {
    triggerJump(humans[0]!.seatIndex)
  }
  else if (humans.length >= 2 && P2_HOLD_KEYS.has(key)) {
    setHumanHold(humans[1]!.seatIndex, true)
  }
  else if (humans.length >= 2 && P2_JUMP_KEYS.has(key)) {
    triggerJump(humans[1]!.seatIndex)
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  const key = event.key
  keysHeld.delete(key)

  const humans = humanPlayers.value
  if (humans.length >= 1 && P1_HOLD_KEYS.has(key) && !pointerHoldSeats.has(humans[0]!.seatIndex)) {
    setHumanHold(humans[0]!.seatIndex, false)
  }
  else if (humans.length >= 2 && P2_HOLD_KEYS.has(key) && !pointerHoldSeats.has(humans[1]!.seatIndex)) {
    setHumanHold(humans[1]!.seatIndex, false)
  }
}

function handleWindowBlur(): void {
  keysHeld.clear()
  clearAllHolds()
}

function onHoldPointerDown(seatIndex: number, event: PointerEvent): void {
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  pointerHoldSeats.add(seatIndex)
  setHumanHold(seatIndex, true)
}

function onHoldPointerUp(seatIndex: number, event: PointerEvent): void {
  event.preventDefault()
  pointerHoldSeats.delete(seatIndex)
  setHumanHold(seatIndex, false)
}

function onJumpPointer(seatIndex: number, event: PointerEvent): void {
  event.preventDefault()
  triggerJump(seatIndex)
}

function progressToLeftPercent(progress: number): number {
  const span = VIEW_AHEAD + VIEW_BEHIND
  const left = ((progress - (cameraProgress.value - VIEW_BEHIND)) / span) * 100
  return Math.min(112, Math.max(-12, left))
}

function horseLaneBottom(seatIndex: number): number {
  return 10 + (seatIndex % 4) * 7
}

function jumpOffsetPx(airMs: number): number {
  if (airMs <= 0) return 0
  const t = 1 - Math.min(1, airMs / JUMP_AIR_MS)
  return Math.sin(Math.PI * t) * 52
}

function getHorsePlayer(seatIndex: number): SessionPlayer | undefined {
  return props.players.find((player) => player.seatIndex === seatIndex)
}

function getHorseColor(seatIndex: number): string {
  return HORSE_COLORS[seatIndex % HORSE_COLORS.length]!
}

function horseBySeat(seatIndex: number): HorseRacingHorse | undefined {
  return state.value.horses.find((horse) => horse.seatIndex === seatIndex)
}

function isGalloping(horse: HorseRacingHorse): boolean {
  return horse.hold && horse.airMs === 0 && horse.speed > maxSpeedForProgress(horse.progress) * 0.35
}

function isSlowed(horse: HorseRacingHorse): boolean {
  return horse.slowdownUntil > 0 && horse.speed < maxSpeedForProgress(horse.progress) * 0.85
}

function controlScheme(humanIndex: number): { hold: string; jump: string } {
  return humanIndex === 0
    ? { hold: 'D', jump: 'F' }
    : { hold: 'J', jump: 'K' }
}

function tickLoop(timestamp: number): void {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
  }

  const dt = Math.min(timestamp - lastTimestamp, 32)
  lastTimestamp = timestamp

  const previousPhase = game.state.phase
  game.tick(dt)

  if (previousPhase === 'countdown' && game.state.phase === 'racing' && !hasPlayedStart) {
    play('start')
    hasPlayedStart = true
  }

  for (const horse of game.state.horses) {
    const previous = previousSlowdowns.get(horse.seatIndex) ?? 0
    if (horse.slowdownUntil > previous) {
      play('hit')
      previousSlowdowns.set(horse.seatIndex, horse.slowdownUntil)
    }
  }

  for (const player of props.players) {
    if (player.type !== 'ai') continue
    const actions = chooseHorseRacingActions(game.state, player.seatIndex, {
      difficulty: aiDifficulty.value,
    })
    game.setHold(player.seatIndex, actions.hold)
    if (actions.jump) {
      game.jump(player.seatIndex)
    }
  }

  syncState()

  const winnerSeat = game.getWinnerSeatIndex()
  if (winnerSeat !== null) {
    if (!hasEmittedComplete) {
      hasEmittedComplete = true
      play('win')
      emit('complete', [winnerSeat])
    }
    return
  }

  rafId = requestAnimationFrame(tickLoop)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown, { passive: false })
  document.addEventListener('keyup', handleKeyUp)
  window.addEventListener('blur', handleWindowBlur)
  rafId = requestAnimationFrame(tickLoop)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('blur', handleWindowBlur)
  keysHeld.clear()
  clearAllHolds()
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-3">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#2f6f8f]">Rennbahn</p>
        <p class="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
          Halten zum Galopp · Tippen zum Springen
        </p>
      </div>
      <div class="min-w-[10rem] flex-1 sm:max-w-xs">
        <div class="mb-1 flex justify-between text-xs font-bold text-[var(--text-muted)]">
          <span>Ziel</span>
          <span class="tabular-nums">{{ Math.round(raceProgressPercent) }}%</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-[#d7c4a3]">
          <div
            class="h-full rounded-full bg-[#2f6f8f] transition-[width] duration-100 ease-linear"
            :style="{ width: `${raceProgressPercent}%` }"
          />
        </div>
      </div>
    </div>

    <ol class="flex flex-wrap gap-2">
      <li
        v-for="(horse, rank) in rankedHorses"
        :key="`rank-${horse.seatIndex}`"
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-[#fff8ef] shadow-[0_2px_0_rgba(43,33,24,0.35)]"
        :style="{ backgroundColor: getHorseColor(horse.seatIndex) }"
      >
        <span class="tabular-nums opacity-80">{{ rank + 1 }}.</span>
        <span class="max-w-[7rem] truncate">{{ getHorsePlayer(horse.seatIndex)?.displayName ?? `P${horse.seatIndex + 1}` }}</span>
      </li>
    </ol>

    <div class="relative overflow-hidden rounded-[1.6rem] shadow-[0_16px_0_#1e3a2f]">
      <div
        class="horse-arena relative h-[min(58vh,480px)] w-full select-none"
        role="img"
        aria-label="Pferderennen Bahn"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-[48%] overflow-hidden"
          aria-hidden="true"
        >
          <div class="absolute inset-0 sky-wash" />
          <div
            class="cloud cloud-a"
            :style="{ transform: `translateX(${-parallaxOffset * 0.35}%)` }"
          />
          <div
            class="cloud cloud-b"
            :style="{ transform: `translateX(${-parallaxOffset * 0.55}%)` }"
          />
          <div
            class="hills"
            :style="{ transform: `translateX(${-parallaxOffset * 0.2}%)` }"
          />
        </div>

        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] track-body" aria-hidden="true">
          <div
            class="track-dashes absolute inset-x-0 top-[18%] h-1.5 opacity-70"
            :style="{ backgroundPositionX: `${-cameraProgress * 8}px` }"
          />
          <div class="rail rail-top" />
          <div class="rail rail-bottom" />
        </div>

        <div
          v-for="hurdle in state.hurdles"
          :key="`hurdle-${hurdle.id}`"
          class="absolute z-10 -translate-x-1/2"
          :style="{
            left: `${progressToLeftPercent(hurdle.progress)}%`,
            bottom: '16%',
          }"
        >
          <div class="hurdle" aria-hidden="true">
            <span class="hurdle-post left" />
            <span class="hurdle-bar" />
            <span class="hurdle-post right" />
          </div>
        </div>

        <div
          v-for="horse in state.horses"
          :key="`horse-${horse.seatIndex}`"
          class="absolute z-20 -translate-x-1/2"
          :class="[
            isSlowed(horse) ? 'opacity-75' : 'opacity-100',
            isGalloping(horse) ? 'is-galloping' : '',
            horse.airMs > 0 ? 'is-jumping' : '',
          ]"
          :style="{
            left: `${progressToLeftPercent(horse.progress)}%`,
            bottom: `calc(${horseLaneBottom(horse.seatIndex)}% + ${jumpOffsetPx(horse.airMs)}px)`,
            zIndex: 20 + horse.seatIndex,
          }"
        >
          <div class="flex flex-col items-center gap-1">
            <span
              class="max-w-[6.5rem] truncate rounded-full px-2.5 py-0.5 text-[0.7rem] font-extrabold text-[#fff8ef] shadow-md"
              :style="{ backgroundColor: getHorseColor(horse.seatIndex) }"
            >
              {{ getHorsePlayer(horse.seatIndex)?.displayName ?? `P${horse.seatIndex + 1}` }}
            </span>
            <svg
              class="horse-svg h-14 w-[5.5rem] drop-shadow-[0_6px_0_rgba(30,40,20,0.25)] sm:h-16 sm:w-28"
              viewBox="0 0 120 70"
              aria-hidden="true"
            >
              <ellipse class="dust" cx="28" cy="62" rx="16" ry="4" fill="rgba(90,70,40,0.28)" />
              <g class="horse-body" :style="{ color: getHorseColor(horse.seatIndex) }">
                <path
                  fill="currentColor"
                  d="M28 42c8-10 22-16 38-14 10 1 18 5 24 11 3 3 8 4 12 2l6-3c2-1 4 1 3 3l-4 7c-4 6-11 9-18 9H42c-10 0-18-5-22-12-2-3-1-7 2-8z"
                />
                <path
                  fill="currentColor"
                  d="M86 28c6-2 12-1 16 3 2 2 1 5-1 6l-8 3c-5 1-10-1-13-5-2-3-1-6 6-7z"
                />
                <circle cx="102" cy="30" r="2.2" fill="#1d1812" />
                <path fill="#1d1812" d="M96 22c4-6 9-8 12-7 1 2-1 5-4 8l-8-1z" opacity="0.55" />
                <g class="legs" fill="#1d1812">
                  <rect class="leg leg-1" x="40" y="52" width="5" height="14" rx="2" />
                  <rect class="leg leg-2" x="52" y="52" width="5" height="14" rx="2" />
                  <rect class="leg leg-3" x="68" y="52" width="5" height="14" rx="2" />
                  <rect class="leg leg-4" x="78" y="52" width="5" height="14" rx="2" />
                </g>
                <path fill="currentColor" d="M34 34c-6 1-11 5-12 9 4 1 9 0 13-3 2-2 2-5-1-6z" opacity="0.85" />
              </g>
            </svg>
          </div>
        </div>

        <div
          v-if="state.phase === 'countdown'"
          class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#143028]/55 px-4 text-center backdrop-blur-[3px]"
        >
          <p class="font-[var(--font-display)] text-7xl font-bold text-[#fff8ef] drop-shadow-md sm:text-8xl">
            {{ countdownSeconds }}
          </p>
          <p class="font-[var(--font-display)] text-2xl font-semibold text-[#fff8ef]">Gleich geht's los!</p>
          <div class="mt-1 space-y-2 text-sm font-semibold text-[#e7f3ea]">
            <p v-for="(human, index) in humanPlayers" :key="human.seatIndex">
              <strong>{{ human.displayName }}:</strong>
              <kbd class="mx-1 rounded-md bg-white/15 px-2 py-1 font-mono">{{ controlScheme(index).hold }}</kbd>
              halten ·
              <kbd class="mx-1 rounded-md bg-white/15 px-2 py-1 font-mono">{{ controlScheme(index).jump }}</kbd>
              springen
            </p>
            <p class="text-[#cfe0d4]">Oder die großen Buttons unten nutzen.</p>
          </div>
        </div>
      </div>
    </div>

    <div
      class="grid gap-3"
      :class="humanPlayers.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'"
    >
      <div
        v-for="(human, index) in humanPlayers"
        :key="`pad-${human.seatIndex}`"
        class="control-pad rounded-[1.4rem] p-3 sm:p-4"
        :style="{ '--pad-accent': getHorseColor(human.seatIndex) }"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <p class="truncate font-[var(--font-display)] text-lg font-semibold text-[#1f2a22]">
            {{ human.displayName }}
          </p>
          <p class="shrink-0 text-xs font-bold uppercase tracking-wide text-[#5d6b62]">
            {{ controlScheme(index).hold }} / {{ controlScheme(index).jump }}
          </p>
        </div>
        <div class="grid grid-cols-[1.4fr_1fr] gap-2.5">
          <button
            type="button"
            class="hold-btn"
            :class="horseBySeat(human.seatIndex)?.hold ? 'is-active' : ''"
            :disabled="!isRacing"
            :aria-pressed="horseBySeat(human.seatIndex)?.hold === true"
            @pointerdown="onHoldPointerDown(human.seatIndex, $event)"
            @pointerup="onHoldPointerUp(human.seatIndex, $event)"
            @pointercancel="onHoldPointerUp(human.seatIndex, $event)"
            @lostpointercapture="onHoldPointerUp(human.seatIndex, $event)"
          >
            <span class="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Galopp</span>
            <span class="font-[var(--font-display)] text-2xl font-bold">Halten</span>
          </button>
          <button
            type="button"
            class="jump-btn"
            :disabled="!isRacing"
            @pointerdown="onJumpPointer(human.seatIndex, $event)"
          >
            <span class="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Hürde</span>
            <span class="font-[var(--font-display)] text-2xl font-bold">Sprung</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.horse-arena {
  background: #8ec6df;
}

.sky-wash {
  background:
    radial-gradient(ellipse 80% 60% at 20% 20%, rgba(255, 255, 255, 0.55), transparent 55%),
    linear-gradient(180deg, #6eb7d8 0%, #a8d7ea 55%, #d7ebc8 100%);
}

.cloud {
  position: absolute;
  top: 12%;
  width: 220%;
  height: 4.5rem;
  background:
    radial-gradient(circle at 10% 50%, rgba(255, 255, 255, 0.9) 0 2.2rem, transparent 2.3rem),
    radial-gradient(circle at 18% 45%, rgba(255, 255, 255, 0.85) 0 2.8rem, transparent 2.9rem),
    radial-gradient(circle at 28% 55%, rgba(255, 255, 255, 0.8) 0 2rem, transparent 2.1rem),
    radial-gradient(circle at 48% 48%, rgba(255, 255, 255, 0.88) 0 2.6rem, transparent 2.7rem),
    radial-gradient(circle at 62% 52%, rgba(255, 255, 255, 0.8) 0 2.1rem, transparent 2.2rem),
    radial-gradient(circle at 78% 46%, rgba(255, 255, 255, 0.85) 0 2.7rem, transparent 2.8rem);
  opacity: 0.7;
  will-change: transform;
}

.cloud-b {
  top: 22%;
  opacity: 0.45;
  filter: blur(0.5px);
}

.hills {
  position: absolute;
  inset: auto 0 0;
  height: 55%;
  width: 200%;
  background:
    radial-gradient(ellipse 40% 90% at 15% 100%, #5f9a58 0 42%, transparent 43%),
    radial-gradient(ellipse 45% 100% at 40% 110%, #4f8a4d 0 48%, transparent 49%),
    radial-gradient(ellipse 50% 95% at 70% 105%, #5a9454 0 46%, transparent 47%),
    radial-gradient(ellipse 40% 90% at 95% 100%, #4a8248 0 44%, transparent 45%);
  will-change: transform;
}

.track-body {
  background:
    linear-gradient(180deg, rgba(90, 140, 70, 0.35) 0 8%, transparent 8%),
    linear-gradient(180deg, #c9a36a 0%, #b5894f 45%, #9a7040 100%);
  box-shadow: inset 0 12px 18px rgba(70, 50, 25, 0.18);
}

.track-dashes {
  background-image: repeating-linear-gradient(
    90deg,
    rgba(255, 244, 220, 0.55) 0 18px,
    transparent 18px 36px
  );
}

.rail {
  position: absolute;
  inset-inline: 0;
  height: 0.55rem;
  background: linear-gradient(90deg, #5d3a1f, #9a6a3a, #5d3a1f);
  box-shadow: 0 2px 0 rgba(30, 20, 10, 0.35);
}

.rail-top {
  top: 6%;
}

.rail-bottom {
  bottom: 8%;
}

.hurdle {
  position: relative;
  width: 2.6rem;
  height: 3.6rem;
}

.hurdle-post {
  position: absolute;
  bottom: 0;
  width: 0.45rem;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, #d8b07a, #7a4e28);
}

.hurdle-post.left {
  left: 0;
}

.hurdle-post.right {
  right: 0;
}

.hurdle-bar {
  position: absolute;
  top: 18%;
  left: 0;
  right: 0;
  height: 0.7rem;
  border-radius: 999px;
  background: linear-gradient(180deg, #f0d7a8, #b8884a);
  box-shadow: 0 2px 0 rgba(70, 40, 15, 0.35);
}

.horse-svg .dust {
  opacity: 0;
  transform-origin: center;
}

.is-galloping .dust {
  opacity: 1;
  animation: dust-puff 0.35s ease-out infinite;
}

.is-galloping .leg-1,
.is-galloping .leg-3 {
  transform-origin: top center;
  animation: stride-a 0.28s ease-in-out infinite;
}

.is-galloping .leg-2,
.is-galloping .leg-4 {
  transform-origin: top center;
  animation: stride-b 0.28s ease-in-out infinite;
}

.is-jumping .legs {
  transform: rotate(-8deg);
}

.is-jumping .dust {
  opacity: 0;
}

.control-pad {
  background: linear-gradient(160deg, #f2efe6, #e4eedc);
  box-shadow: 0 5px 0 #c5b89a;
  border: 2px solid color-mix(in srgb, var(--pad-accent) 35%, #c5b89a);
}

.hold-btn,
.jump-btn {
  display: flex;
  min-height: 5.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  border-radius: 1.1rem;
  border: 3px solid #2a332c;
  color: #fff8ef;
  touch-action: none;
  user-select: none;
  transition: transform 80ms ease, filter 80ms ease, box-shadow 80ms ease;
}

.hold-btn {
  background: linear-gradient(180deg, color-mix(in srgb, var(--pad-accent) 88%, white), var(--pad-accent));
  box-shadow: 0 5px 0 color-mix(in srgb, var(--pad-accent) 55%, #1d1812);
}

.jump-btn {
  background: linear-gradient(180deg, #3f8f6a, #2b6b4d);
  box-shadow: 0 5px 0 #1d4a35;
}

.hold-btn.is-active,
.hold-btn:active:not(:disabled),
.jump-btn:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #1d1812;
  filter: brightness(1.05);
}

.hold-btn:disabled,
.jump-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  filter: grayscale(0.2);
}

@keyframes stride-a {
  0%,
  100% {
    transform: rotate(18deg) translateY(0);
  }
  50% {
    transform: rotate(-22deg) translateY(-2px);
  }
}

@keyframes stride-b {
  0%,
  100% {
    transform: rotate(-18deg) translateY(0);
  }
  50% {
    transform: rotate(22deg) translateY(-2px);
  }
}

@keyframes dust-puff {
  0% {
    opacity: 0.15;
    transform: scaleX(0.7);
  }
  50% {
    opacity: 0.4;
    transform: scaleX(1.15);
  }
  100% {
    opacity: 0.1;
    transform: scaleX(0.85) translateX(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud,
  .hills,
  .is-galloping .leg-1,
  .is-galloping .leg-2,
  .is-galloping .leg-3,
  .is-galloping .leg-4,
  .is-galloping .dust {
    animation: none !important;
  }
}
</style>
