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
import { coatForLane, gallopPose } from './sprite'
import type { TouchControlButton } from '~/components/game/TouchControls.vue'
import { plural, sortStandings, type GameStanding } from '../shared/standings'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[], standings?: GameStanding[]]
}>()

const { play } = useSound()

/** Jockey silks per seat: [main, accent/text]. */
const SILKS = [
  ['#e45b3a', '#fff6e8'],
  ['#f0b429', '#2b2118'],
  ['#3d8fd1', '#fff6e8'],
  ['#4faf6a', '#fff6e8'],
] as const
const CAMERA_PAD_BEHIND = 8
const CAMERA_PAD_AHEAD = 22
const MIN_VIEW_SPAN = VIEW_AHEAD + VIEW_BEHIND

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
const leaderProgress = computed(() => Math.max(0, ...state.value.horses.map((horse) => horse.progress)))
const trailerProgress = computed(() => Math.min(...state.value.horses.map((horse) => horse.progress)))
const isRacing = computed(() => state.value.phase === 'racing')
const rankedHorses = computed(() =>
  [...state.value.horses].sort((a, b) => b.progress - a.progress),
)

const cameraWindow = computed(() => {
  const trailing = Number.isFinite(trailerProgress.value) ? trailerProgress.value : 0
  const leading = Number.isFinite(leaderProgress.value) ? leaderProgress.value : 0
  const span = Math.max(
    MIN_VIEW_SPAN,
    leading - trailing + CAMERA_PAD_BEHIND + CAMERA_PAD_AHEAD,
  )
  const origin = trailing - CAMERA_PAD_BEHIND
  return { origin, span }
})

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
let hasEmittedComplete = false
const previousSlowdowns = new Map<number, number>()
const keysHeld = new Set<string>()

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
  if (humans.length >= 1 && P1_HOLD_KEYS.has(key)) {
    setHumanHold(humans[0]!.seatIndex, false)
  }
  else if (humans.length >= 2 && P2_HOLD_KEYS.has(key)) {
    setHumanHold(humans[1]!.seatIndex, false)
  }
}

function handleWindowBlur(): void {
  keysHeld.clear()
  clearAllHolds()
}

const SCENE_W = 1500
const SCENE_H = 580
const TRACK_TOP = 252
const TRACK_BOTTOM = 548
const PX_PER_UNIT = SCENE_W / MIN_VIEW_SPAN
const MAX_JUMP_LIFT = 72
const BACK_POSTS = Array.from({ length: 27 }, (_, index) => index)
const FRONT_POSTS = Array.from({ length: 18 }, (_, index) => index)
const CROWD_COLORS = ['#e45b3a', '#f0b429', '#3d8fd1', '#4faf6a', '#9b5de5', '#ffffff', '#2b2118'] as const
const CROWD = Array.from({ length: 4 * 46 }, (_, index) => {
  const row = Math.floor(index / 46)
  const col = index % 46
  return {
    x: 12 + col * 12 + (row % 2) * 6,
    y: 58 + row * 15,
    color: CROWD_COLORS[(col * 7 + row * 3) % CROWD_COLORS.length]!,
  }
})
const TREES = Array.from({ length: 30 }, (_, index) => ({
  x: 20 + index * 50 + (index % 3) * 7,
  r: 16 + (index % 4) * 3,
  color: index % 2 ? '#3f7d3a' : '#4a8a43',
}))

const reducedMotion = ref(false)

onMounted(() => {
  reducedMotion.value = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const laneCount = computed(() => Math.max(1, state.value.horses.length))
const laneHeight = computed(() => (TRACK_BOTTOM - TRACK_TOP) / laneCount.value)
const cameraPx = computed(() => cameraWindow.value.origin * PX_PER_UNIT)

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size
}

function laneTop(lane: number): number {
  return TRACK_TOP + lane * laneHeight.value
}

function laneGround(lane: number): number {
  return laneTop(lane + 1) - 6
}

function laneScale(lane: number): number {
  const base = laneCount.value <= 2 ? 1.1 : laneCount.value === 3 ? 0.95 : 0.82
  return base + lane * 0.05
}

function progressToX(progress: number, clamp = true): number {
  const { origin, span } = cameraWindow.value
  const percent = ((progress - origin) / span) * 100
  const value = clamp ? Math.min(96, Math.max(4, percent)) : percent
  return (value / 100) * SCENE_W
}

function jumpLift(airMs: number): number {
  if (airMs <= 0) return 0
  const t = 1 - Math.min(1, airMs / JUMP_AIR_MS)
  return Math.sin(Math.PI * t) * MAX_JUMP_LIFT
}

function getHorsePlayer(seatIndex: number): SessionPlayer | undefined {
  return props.players.find((player) => player.seatIndex === seatIndex)
}

function getHorseColor(seatIndex: number): string {
  return SILKS[seatIndex % SILKS.length]![0]
}

function getHorseAccent(seatIndex: number): string {
  return SILKS[seatIndex % SILKS.length]![1]
}

function isGalloping(horse: HorseRacingHorse): boolean {
  return horse.hold && horse.airMs === 0 && horse.speed > maxSpeedForProgress(horse.progress) * 0.35
}

function isSlowed(horse: HorseRacingHorse): boolean {
  return horse.slowdownUntil > 0 && horse.speed < maxSpeedForProgress(horse.progress) * 0.85
}

const visibleHurdles = computed(() => state.value.hurdles
  .map((hurdle) => ({ id: hurdle.id, x: progressToX(hurdle.progress, false) }))
  .filter((hurdle) => hurdle.x > -80 && hurdle.x < SCENE_W + 80))

const finishX = computed(() => progressToX(TRACK_LENGTH, false))
const showFinish = computed(() => finishX.value < SCENE_W + 60)

const horseViews = computed(() => state.value.horses.map((horse, lane) => {
  const name = getHorsePlayer(horse.seatIndex)?.displayName ?? `P${horse.seatIndex + 1}`
  const shortName = name.length > 12 ? `${name.slice(0, 11)}…` : name
  const airborne = horse.airMs > 0
  return {
    seatIndex: horse.seatIndex,
    lane,
    x: progressToX(horse.progress),
    ground: laneGround(lane),
    scale: laneScale(lane),
    lift: jumpLift(horse.airMs),
    pose: reducedMotion.value
      ? (airborne ? 'jump' as const : 'stand' as const)
      : gallopPose(horse.progress, horse.speed, airborne),
    rank: rankedHorses.value.findIndex((ranked) => ranked.seatIndex === horse.seatIndex) + 1,
    name: shortName,
    tagWidth: Math.min(170, shortName.length * 8.6 + 40),
    silk: getHorseColor(horse.seatIndex),
    silkAccent: getHorseAccent(horse.seatIndex),
    coat: coatForLane(lane),
    galloping: isGalloping(horse),
    slowed: isSlowed(horse),
  }
}))

function minimapX(progress: number): number {
  return 20 + Math.min(1, Math.max(0, progress / TRACK_LENGTH)) * 320
}

const TOUCH_BUTTONS: TouchControlButton[] = [
  { id: 'hold', label: 'Galopp (halten)', icon: '🐎' },
  { id: 'jump', label: 'Springen', icon: '⤴', primary: true },
]

function onTouchPress(seatIndex: number, id: string): void {
  if (id === 'hold') setHumanHold(seatIndex, true)
  else if (id === 'jump') triggerJump(seatIndex)
}

function onTouchRelease(seatIndex: number, id: string): void {
  if (id === 'hold') setHumanHold(seatIndex, false)
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
      emit('complete', [winnerSeat], sortStandings(game.state.horses.map((horse) => ({
        seatIndex: horse.seatIndex,
        score: horse.progress,
        label: horse.seatIndex === winnerSeat ? 'im Ziel' : `${Math.min(99, Math.round((horse.progress / TRACK_LENGTH) * 100))} % geschafft`,
      }))))
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
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-3" :style="{ maxWidth: `max(32rem, min(64rem, calc((100vh - 25rem) * ${SCENE_W / SCENE_H})))` }">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#2a6b8a]">Rennbahn</p>
        <p class="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
          Tastatur: Halten = Galopp · Tippen = Sprung
        </p>
      </div>
      <ol class="flex flex-wrap gap-2">
        <li
          v-for="(horse, rank) in rankedHorses"
          :key="`rank-${horse.seatIndex}`"
          class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold shadow-[0_2px_0_rgba(43,33,24,0.35)]"
          :style="{ backgroundColor: getHorseColor(horse.seatIndex), color: getHorseAccent(horse.seatIndex) }"
        >
          <span class="tabular-nums opacity-80">{{ rank + 1 }}.</span>
          <span class="max-w-[7rem] truncate">{{ getHorsePlayer(horse.seatIndex)?.displayName ?? `P${horse.seatIndex + 1}` }}</span>
        </li>
      </ol>
    </div>

    <div class="relative overflow-hidden rounded-[1.6rem] shadow-[0_16px_0_#1e3a2f]">
      <svg
        class="block h-auto w-full select-none"
        :viewBox="`0 0 ${SCENE_W} ${SCENE_H}`"
        role="img"
        aria-label="Pferderennen Bahn"
      >
        <defs>
          <linearGradient id="hr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#5fb0dc" />
            <stop offset="1" stop-color="#cfe9f2" />
          </linearGradient>
          <linearGradient id="hr-dirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#c79a5f" />
            <stop offset="1" stop-color="#a87843" />
          </linearGradient>
          <pattern id="hr-check" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#fff" />
            <rect width="8" height="8" fill="#111" />
            <rect x="8" y="8" width="8" height="8" fill="#111" />
          </pattern>
          <pattern
            id="hr-specks"
            width="200"
            height="60"
            patternUnits="userSpaceOnUse"
            :patternTransform="`translate(${-wrap(cameraPx, 200)} 0)`"
          >
            <ellipse cx="20" cy="10" rx="5" ry="1.4" fill="#8f6436" opacity="0.35" />
            <ellipse cx="90" cy="34" rx="4" ry="1.3" fill="#8f6436" opacity="0.3" />
            <ellipse cx="150" cy="18" rx="6" ry="1.5" fill="#8f6436" opacity="0.35" />
            <ellipse cx="60" cy="52" rx="3" ry="1.2" fill="#f1dcb2" opacity="0.35" />
            <ellipse cx="180" cy="46" rx="4" ry="1.2" fill="#8f6436" opacity="0.3" />
          </pattern>
          <g id="hr-cloud">
            <ellipse cx="0" cy="10" rx="56" ry="16" />
            <circle cx="-24" cy="2" r="18" />
            <circle cx="4" cy="-8" r="24" />
            <circle cx="30" cy="2" r="16" />
          </g>
          <g id="hr-hills">
            <path d="M0 190 C160 130 300 160 420 150 C560 135 700 175 860 150 C1020 125 1200 160 1500 190 L1500 240 L0 240 Z" fill="#7fb36d" />
            <path d="M0 210 C200 180 360 200 520 190 C700 180 880 205 1100 185 C1260 172 1400 190 1500 210 L1500 250 L0 250 Z" fill="#5f9a58" />
          </g>
          <g id="hr-trees">
            <g v-for="(tree, i) in TREES" :key="`tree-${i}`">
              <rect :x="tree.x - 3" y="200" width="6" height="26" fill="#5d3a1f" />
              <circle :cx="tree.x" :cy="198 - tree.r / 2" :r="tree.r" :fill="tree.color" />
            </g>
          </g>
          <g id="hr-stand">
            <rect x="0" y="40" width="560" height="78" fill="#e9dcc6" />
            <path d="M-20 44 L580 44 L560 10 L0 10 Z" fill="#e4572e" />
            <path
              v-for="i in 14"
              :key="`awning-${i}`"
              :d="`M${(i - 1) * 40} 10 L${(i - 1) * 40 + 20} 10 L${(i - 1) * 40 + 19} 44 L${(i - 1) * 40 - 1} 44 Z`"
              fill="#fff"
              opacity="0.9"
            />
            <g v-for="(fan, i) in CROWD" :key="`fan-${i}`">
              <circle :cx="fan.x" :cy="fan.y" r="5" fill="#f2c9a0" />
              <rect :x="fan.x - 5" :y="fan.y + 4" width="10" height="8" rx="3" :fill="fan.color" />
            </g>
            <g v-for="i in 6" :key="`flag-${i}`">
              <rect :x="30 + (i - 1) * 100" y="-26" width="3" height="40" fill="#5d3a1f" />
              <path
                class="hr-flag"
                :d="`M${33 + (i - 1) * 100} -26 L${63 + (i - 1) * 100} -19 L${33 + (i - 1) * 100} -12 Z`"
                :fill="CROWD_COLORS[i - 1]"
              />
            </g>
          </g>
          <g id="hr-hedge">
            <ellipse cx="0" cy="2" rx="30" ry="5" fill="rgba(40,30,15,0.3)" />
            <rect x="-26" y="-34" width="52" height="34" rx="12" fill="#3f7d3a" />
            <circle cx="-16" cy="-30" r="10" fill="#4f9447" />
            <circle cx="0" cy="-34" r="11" fill="#58a04f" />
            <circle cx="16" cy="-30" r="10" fill="#4f9447" />
            <rect x="-32" y="-46" width="6" height="46" rx="2" fill="#fff" />
            <rect x="26" y="-46" width="6" height="46" rx="2" fill="#fff" />
            <rect x="-34" y="-44" width="68" height="6" rx="3" fill="#fff" />
            <rect x="-34" y="-44" width="12" height="6" fill="#e4572e" />
            <rect x="-10" y="-44" width="12" height="6" fill="#e4572e" />
            <rect x="14" y="-44" width="12" height="6" fill="#e4572e" />
          </g>
        </defs>

        <!-- sky + parallax background -->
        <rect :width="SCENE_W" :height="SCENE_H" fill="url(#hr-sky)" />
        <circle cx="1320" cy="70" r="56" fill="#ffe27a" opacity="0.25" />
        <circle cx="1320" cy="70" r="40" fill="#ffe27a" />
        <g fill="#fff" :transform="`translate(${-wrap(cameraPx * 0.04, SCENE_W)} 0)`">
          <use v-for="offset in [0, SCENE_W]" :key="`clouds-${offset}`" href="#hr-cloud" :x="180 + offset" y="70" />
          <use v-for="offset in [0, SCENE_W]" :key="`clouds-b-${offset}`" href="#hr-cloud" :x="640 + offset" y="50" />
          <use v-for="offset in [0, SCENE_W]" :key="`clouds-c-${offset}`" href="#hr-cloud" :x="1040 + offset" y="96" />
        </g>
        <g :transform="`translate(${-wrap(cameraPx * 0.08, SCENE_W)} 0)`">
          <use href="#hr-hills" x="0" />
          <use href="#hr-hills" :x="SCENE_W" />
        </g>
        <g :transform="`translate(${-wrap(cameraPx * 0.25, SCENE_W)} 0)`">
          <use href="#hr-trees" x="0" />
          <use href="#hr-trees" :x="SCENE_W" />
          <use href="#hr-stand" x="280" y="128" />
          <use href="#hr-stand" :x="280 + SCENE_W" y="128" />
        </g>

        <!-- track -->
        <rect x="0" :y="TRACK_TOP" :width="SCENE_W" :height="SCENE_H - TRACK_TOP" fill="url(#hr-dirt)" />
        <rect x="0" :y="TRACK_TOP" :width="SCENE_W" :height="SCENE_H - TRACK_TOP" fill="url(#hr-specks)" />
        <rect
          v-for="lane in laneCount - 1"
          :key="`lane-line-${lane}`"
          x="0"
          :y="laneTop(lane) - 1.5"
          :width="SCENE_W"
          height="3"
          fill="#fff6e3"
          opacity="0.55"
        />
        <rect x="0" :y="TRACK_TOP - 10" :width="SCENE_W" height="6" fill="#fff" />
        <rect x="0" :y="TRACK_TOP + 2" :width="SCENE_W" height="5" fill="#fff" />
        <rect
          v-for="post in BACK_POSTS"
          :key="`post-${post}`"
          :x="post * 60 - wrap(cameraPx, 60)"
          :y="TRACK_TOP - 14"
          width="6"
          height="26"
          fill="#fff"
        />

        <!-- finish post -->
        <g v-if="showFinish">
          <rect :x="finishX - 3" :y="TRACK_TOP" width="6" :height="TRACK_BOTTOM - TRACK_TOP" fill="#fff" opacity="0.75" />
          <rect :x="finishX - 7" :y="TRACK_TOP - 90" width="14" :height="SCENE_H - TRACK_TOP + 90" fill="url(#hr-check)" />
          <rect :x="finishX - 55" :y="TRACK_TOP - 112" width="110" height="34" rx="8" fill="#2b2118" />
          <text :x="finishX" :y="TRACK_TOP - 88" text-anchor="middle" font-size="22" font-weight="900" fill="#fff">ZIEL</text>
        </g>

        <!-- lanes back to front: hurdles + horse -->
        <g v-for="hv in horseViews" :key="`lane-${hv.seatIndex}`">
          <use
            v-for="hurdle in visibleHurdles"
            :key="`hurdle-${hurdle.id}-${hv.lane}`"
            href="#hr-hedge"
            :transform="`translate(${hurdle.x + hv.lane * 6} ${hv.ground}) scale(${hv.scale})`"
          />

          <g v-if="hv.galloping && !reducedMotion" opacity="0.3">
            <rect
              v-for="k in 3"
              :key="`speed-${k}`"
              :x="hv.x - 100 * hv.scale - k * 26"
              :y="hv.ground - 70 * hv.scale + k * 9 - hv.lift * hv.scale"
              :width="50 - k * 8"
              height="3"
              rx="1.5"
              fill="#fff"
            />
          </g>
          <g
            v-if="hv.galloping && hv.lift === 0 && !reducedMotion"
            class="hr-dust"
            :transform="`translate(${hv.x - 66 * hv.scale} ${hv.ground - 6}) scale(${hv.scale})`"
          >
            <circle cx="0" cy="0" r="10" fill="#d9bf92" />
            <circle cx="-14" cy="-4" r="8" fill="#e3cda5" />
            <circle cx="-26" cy="2" r="6" fill="#e8d6b3" opacity="0.8" />
            <circle cx="-38" cy="-2" r="4" fill="#efe2c8" opacity="0.6" />
          </g>

          <g
            :class="{ 'hr-slowed': hv.slowed }"
            :transform="`translate(${hv.x - 96 * hv.scale} ${hv.ground - 126 * hv.scale}) scale(${hv.scale})`"
          >
            <HorseSprite
              :coat="hv.coat"
              :silk="hv.silk"
              :silk-accent="hv.silkAccent"
              :number="hv.lane + 1"
              :pose="hv.pose"
              :lift="hv.lift"
            />
          </g>

          <g
            v-if="hv.slowed"
            class="hr-stars"
            :transform="`translate(${hv.x + 20 * hv.scale} ${hv.ground - 150 * hv.scale - hv.lift * hv.scale})`"
          >
            <path
              v-for="(dx, k) in [-24, 0, 24]"
              :key="`star-${k}`"
              :transform="`translate(${dx} ${k === 1 ? -12 : 0})`"
              d="M0 -9 L2.6 -2.8 L9 -2.8 L4 1.4 L5.8 8 L0 4.2 L-5.8 8 L-4 1.4 L-9 -2.8 L-2.6 -2.8 Z"
              fill="#ffd23f"
              stroke="#2b2118"
              stroke-width="1.5"
            />
          </g>

          <g :transform="`translate(${hv.x + 20 * hv.scale - hv.tagWidth / 2} ${hv.ground - 166 * hv.scale - hv.lift * hv.scale})`">
            <rect :width="hv.tagWidth" height="24" rx="12" :fill="hv.silk" stroke="#fff" stroke-width="2" />
            <circle cx="12" cy="12" r="9" fill="#fff" />
            <text x="12" y="16.5" text-anchor="middle" font-size="12" font-weight="900" :fill="hv.silk">{{ hv.rank }}</text>
            <text x="26" y="17" font-size="14" font-weight="800" :fill="hv.silkAccent">{{ hv.name }}</text>
          </g>
        </g>

        <!-- lane numbers -->
        <g v-for="hv in horseViews" :key="`board-${hv.seatIndex}`">
          <rect
            x="12"
            :y="laneTop(hv.lane) + laneHeight / 2 - 17"
            width="34"
            height="34"
            rx="8"
            :fill="hv.silk"
            stroke="#fff"
            stroke-width="3"
          />
          <text
            x="29"
            :y="laneTop(hv.lane) + laneHeight / 2 + 7"
            text-anchor="middle"
            font-size="20"
            font-weight="900"
            :fill="hv.silkAccent"
          >{{ hv.lane + 1 }}</text>
        </g>

        <!-- front fence -->
        <rect x="0" :y="SCENE_H - 26" :width="SCENE_W" height="8" fill="#fff" />
        <rect x="0" :y="SCENE_H - 12" :width="SCENE_W" height="8" fill="#fff" />
        <rect
          v-for="post in FRONT_POSTS"
          :key="`front-post-${post}`"
          :x="post * 90 - wrap(cameraPx * 1.3, 90)"
          :y="SCENE_H - 34"
          width="9"
          height="34"
          fill="#fff"
        />

        <!-- minimap -->
        <g :transform="`translate(${SCENE_W / 2 - 190} 16)`">
          <rect width="380" height="40" rx="20" fill="rgba(43,33,24,0.75)" />
          <rect x="20" y="18" width="320" height="5" rx="2.5" fill="#fff" opacity="0.4" />
          <rect x="344" y="10" width="12" height="20" fill="url(#hr-check)" />
          <g v-for="hv in horseViews" :key="`mini-${hv.seatIndex}`">
            <circle
              :cx="minimapX(state.horses[hv.lane]!.progress)"
              cy="20"
              r="9"
              :fill="hv.silk"
              stroke="#fff"
              stroke-width="2"
            />
            <text
              :x="minimapX(state.horses[hv.lane]!.progress)"
              y="24.5"
              text-anchor="middle"
              font-size="11"
              font-weight="900"
              :fill="hv.silkAccent"
            >{{ hv.lane + 1 }}</text>
          </g>
        </g>
      </svg>

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
        </div>
      </div>
    </div>

    <div v-if="humanPlayers.length > 0" class="flex flex-wrap justify-center gap-3" aria-label="Steuerung">
      <TouchControls
        v-for="(human, index) in humanPlayers.slice(0, 2)"
        :key="`touch-${human.seatIndex}`"
        :player-name="`${human.displayName} · ${controlScheme(index).hold} halten, ${controlScheme(index).jump} springen`"
        :color="getHorseColor(human.seatIndex)"
        :buttons="TOUCH_BUTTONS"
        @press="onTouchPress(human.seatIndex, $event)"
        @release="onTouchRelease(human.seatIndex, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.hr-dust {
  animation: hr-dust-puff 0.35s ease-out infinite;
  transform-box: fill-box;
  transform-origin: right center;
}

.hr-stars {
  animation: hr-stars-bob 0.5s ease-in-out infinite alternate;
}

.hr-slowed {
  opacity: 0.85;
}

.hr-flag {
  animation: hr-flag-wave 1.2s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: left center;
}

@keyframes hr-dust-puff {
  0% { opacity: 0.2; }
  50% { opacity: 0.75; }
  100% { opacity: 0.15; }
}

@keyframes hr-stars-bob {
  from { opacity: 1; }
  to { opacity: 0.55; }
}

@keyframes hr-flag-wave {
  from { transform: scaleX(1) skewY(0deg); }
  to { transform: scaleX(0.82) skewY(6deg); }
}

@media (prefers-reduced-motion: reduce) {
  .hr-dust,
  .hr-stars,
  .hr-flag {
    animation: none !important;
  }
}
</style>
