<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import {
  BASE_SPEED,
  TRACK_LENGTH,
  VIEW_AHEAD,
  VIEW_BEHIND,
  createRacingGame,
  speedMultForProgress,
  LANE_COUNT,
  type RacingState,
} from './engine'
import { chooseRacingLaneDelta } from './ai'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()

const CAR_COLORS = ['#e45b3a', '#f0b429', '#3d8fd1', '#4faf6a'] as const

const SCENE_W = 560
const SCENE_H = 560
const ROAD_X = 88
const ROAD_W = 384
const LANE_W = ROAD_W / LANE_COUNT
const PX_PER_UNIT = SCENE_H / (VIEW_AHEAD + VIEW_BEHIND)
const TILE_H = 560
const HIT_ANIM_MS = 650
const LANE_EASE_MS = 90
const MAX_TILT_DEG = 16
const DASHES = Array.from({ length: Math.ceil(SCENE_H / 56) + 2 }, (_, index) => index)
const TREE_TILE = [
  { x: 40, y: 60, r: 26 }, { x: 46, y: 250, r: 30 }, { x: 34, y: 430, r: 24 },
  { x: 524, y: 140, r: 28 }, { x: 520, y: 360, r: 32 }, { x: 532, y: 520, r: 24 },
] as const
const BUSH_TILE = [{ x: 22, y: 160 }, { x: 538, y: 30 }, { x: 540, y: 470 }, { x: 60, y: 540 }] as const

const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)

const game = createRacingGame({
  players: props.players.map((player) => ({ seatIndex: player.seatIndex, type: player.type })),
})

const state = ref<RacingState>(cloneState())

const humanPlayers = computed(() => props.players.filter((player) => player.type === 'human'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))
const cameraProgress = computed(() => Math.max(0, ...state.value.cars.map((car) => car.progress)))
const raceProgressPercent = computed(() => Math.min(100, (cameraProgress.value / TRACK_LENGTH) * 100))
const cameraPx = computed(() => cameraProgress.value * PX_PER_UNIT)
const reducedMotion = ref(false)
const nowTs = ref(0)
const carVisuals = ref<Record<number, { x: number; tilt: number; shared: boolean; slot: number }>>({})
const hitAt = new Map<number, number>()

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
const previousSlowdowns = new Map<number, number>()
const keysHeld = new Set<string>()

function cloneState(): RacingState {
  return {
    ...game.state,
    cars: game.state.cars.map((car) => ({ ...car })),
    obstacles: game.state.obstacles.map((obstacle) => ({ ...obstacle })),
  }
}

function syncState(): void {
  state.value = cloneState()
}

function applyLaneIntent(seatIndex: number, laneDelta: -1 | 1): void {
  game.setLaneIntent(seatIndex, laneDelta)
  syncState()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (state.value.phase !== 'racing') return

  const key = event.key
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
    event.preventDefault()
  }

  if (keysHeld.has(key)) return
  keysHeld.add(key)

  const humans = humanPlayers.value
  if (humans.length >= 1 && (key === 'a' || key === 'A')) {
    applyLaneIntent(humans[0]!.seatIndex, -1)
  }
  else if (humans.length >= 1 && (key === 'd' || key === 'D')) {
    applyLaneIntent(humans[0]!.seatIndex, 1)
  }
  else if (humans.length >= 2 && key === 'ArrowLeft') {
    applyLaneIntent(humans[1]!.seatIndex, -1)
  }
  else if (humans.length >= 2 && key === 'ArrowRight') {
    applyLaneIntent(humans[1]!.seatIndex, 1)
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  keysHeld.delete(event.key)
}

function progressToY(progress: number): number {
  return (cameraProgress.value + VIEW_AHEAD - progress) * PX_PER_UNIT
}

function laneCenterX(lane: number): number {
  return ROAD_X + LANE_W * (lane + 0.5)
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size
}

function updateCarVisuals(dt: number): void {
  const next: Record<number, { x: number; tilt: number; shared: boolean; slot: number }> = {}
  const ease = reducedMotion.value ? 1 : Math.min(1, dt / LANE_EASE_MS)
  for (const car of game.state.cars) {
    const sharing = game.state.cars.filter((other) => (
      other.lane === car.lane && Math.abs(other.progress - car.progress) < 4
    ))
    const slot = sharing.findIndex((other) => other.seatIndex === car.seatIndex)
    const spread = sharing.length > 1 ? (slot - (sharing.length - 1) / 2) * (LANE_W / 2) : 0
    const target = laneCenterX(car.lane) + spread
    const previous = carVisuals.value[car.seatIndex]?.x ?? target
    const x = previous + (target - previous) * ease
    const tilt = reducedMotion.value ? 0 : Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, (target - x) * 0.25))
    next[car.seatIndex] = { x, tilt, shared: sharing.length > 1, slot }
  }
  carVisuals.value = next
}

function obstacleKind(id: number): 'cone' | 'oil' | 'hay' {
  const kinds = ['cone', 'cone', 'oil', 'hay'] as const
  return kinds[id % kinds.length]!
}

const visibleObstacles = computed(() => state.value.obstacles
  .map((obstacle) => ({
    id: obstacle.id,
    x: laneCenterX(obstacle.lane),
    y: progressToY(obstacle.progress),
    kind: obstacleKind(obstacle.id),
  }))
  .filter((obstacle) => obstacle.y > -60 && obstacle.y < SCENE_H + 60))

const finishY = computed(() => progressToY(TRACK_LENGTH))
const startY = computed(() => progressToY(0))

const carViews = computed(() => state.value.cars.map((car) => {
  const visual = carVisuals.value[car.seatIndex] ?? { x: laneCenterX(car.lane), tilt: 0, shared: false, slot: 0 }
  const since = nowTs.value - (hitAt.get(car.seatIndex) ?? -Infinity)
  const hitT = since >= 0 && since < HIT_ANIM_MS ? since / HIT_ANIM_MS : null
  const spin = hitT === null || reducedMotion.value ? 0 : 360 * (1 - (1 - hitT) ** 3)
  const name = getCarPlayer(car.seatIndex)?.displayName ?? `P${car.seatIndex + 1}`
  const shortName = name.length > 10 ? `${name.slice(0, 9)}…` : name
  const fast = speedMultForProgress(car.progress) > 1.3 && !isSlowed(car.speed, car.progress)
  return {
    seatIndex: car.seatIndex,
    x: visual.x,
    y: Math.min(SCENE_H - 60, Math.max(60, progressToY(car.progress))),
    rotate: visual.tilt + spin,
    scale: visual.shared ? 0.82 : 1,
    tagLift: visual.shared && visual.slot % 2 === 1 ? 26 : 0,
    hit: hitT !== null,
    fast: fast && state.value.phase === 'racing',
    color: getCarColor(car.seatIndex),
    name: shortName,
    tagWidth: shortName.length * 8.4 + 22,
  }
}))

const speedLines = computed(() => {
  if (state.value.phase !== 'racing' || reducedMotion.value) return []
  const count = 4 + Math.round(raceProgressPercent.value / 15)
  return Array.from({ length: count }, (_, index) => ({
    x: ROAD_X + 16 + ((index * 83) % (ROAD_W - 32)),
    y: wrap(index * 131 + cameraPx.value * 1.6, SCENE_H + 80) - 80,
    h: 40 + (index % 3) * 22,
  }))
})

function getCarPlayer(seatIndex: number): SessionPlayer | undefined {
  return props.players.find((player) => player.seatIndex === seatIndex)
}

function getCarColor(seatIndex: number): string {
  return CAR_COLORS[seatIndex % CAR_COLORS.length]!
}

function isSlowed(speed: number, progress: number): boolean {
  return speed < BASE_SPEED * speedMultForProgress(progress) * 0.95
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

  // Engine edge-triggers slowdown once per contact; still guard so hit SFX cannot spam.
  for (const car of game.state.cars) {
    const previous = previousSlowdowns.get(car.seatIndex) ?? 0
    if (car.slowdownUntil > previous) {
      play('hit')
      previousSlowdowns.set(car.seatIndex, car.slowdownUntil)
      hitAt.set(car.seatIndex, timestamp)
    }
  }

  for (const player of props.players) {
    if (player.type !== 'ai') continue
    const delta = chooseRacingLaneDelta(game.state, player.seatIndex, { difficulty: aiDifficulty.value })
    if (delta) {
      game.setLaneIntent(player.seatIndex, delta)
    }
  }

  nowTs.value = timestamp
  updateCarVisuals(dt)
  syncState()

  const winnerSeat = game.getWinnerSeatIndex()
  if (winnerSeat !== null) {
    play('win')
    emit('complete', [winnerSeat])
    return
  }

  rafId = requestAnimationFrame(tickLoop)
}

onMounted(() => {
  reducedMotion.value = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('keydown', handleKeyDown, { passive: false })
  document.addEventListener('keyup', handleKeyUp)
  rafId = requestAnimationFrame(tickLoop)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-4">
    <div class="flex items-center justify-between gap-3 text-sm font-semibold">
      <p class="text-[var(--color-ink)]">Strecke · ca. 3 Min</p>
      <p class="tabular-nums text-[var(--text-muted)]">{{ Math.round(cameraProgress) }} / {{ TRACK_LENGTH }} m</p>
    </div>
    <div class="h-3 overflow-hidden rounded-full bg-[#dfbd8c]/60">
      <div
        class="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-100 ease-linear"
        :style="{ width: `${raceProgressPercent}%` }"
      />
    </div>

    <div class="relative overflow-hidden rounded-[1.75rem] border-[6px] border-[#2b2118] shadow-[0_18px_0_#2b2118]">
      <div class="relative w-full">
        <svg
          class="block h-auto w-full select-none"
          :viewBox="`0 0 ${SCENE_W} ${SCENE_H}`"
          role="img"
          aria-label="Spurrennen Bahn"
        >
          <defs>
            <pattern
              id="rc-grass"
              width="40"
              height="80"
              patternUnits="userSpaceOnUse"
              :patternTransform="`translate(0 ${wrap(cameraPx, 80)})`"
            >
              <rect width="40" height="40" fill="#4f9a4a" />
              <rect y="40" width="40" height="40" fill="#5aa653" />
            </pattern>
            <pattern
              id="rc-kerb"
              width="14"
              height="36"
              patternUnits="userSpaceOnUse"
              :patternTransform="`translate(0 ${wrap(cameraPx, 36)})`"
            >
              <rect width="14" height="18" fill="#e4572e" />
              <rect y="18" width="14" height="18" fill="#fff" />
            </pattern>
            <pattern
              id="rc-asphalt"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
              :patternTransform="`translate(0 ${wrap(cameraPx, 60)})`"
            >
              <rect width="60" height="60" fill="#55504b" />
              <circle cx="12" cy="8" r="1.2" fill="#6b655f" />
              <circle cx="40" cy="30" r="1" fill="#46413d" />
              <circle cx="22" cy="48" r="1.3" fill="#6b655f" />
              <circle cx="52" cy="12" r="0.9" fill="#46413d" />
            </pattern>
            <pattern id="rc-check" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#fff" />
              <rect width="12" height="12" fill="#111" />
              <rect x="12" y="12" width="12" height="12" fill="#111" />
            </pattern>
            <g id="rc-scenery">
              <g v-for="(tree, i) in TREE_TILE" :key="`tree-${i}`" :transform="`translate(${tree.x} ${tree.y})`">
                <circle cx="6" cy="8" :r="tree.r" fill="rgba(0,0,0,0.2)" />
                <circle :r="tree.r" fill="#3f7d3a" />
                <circle :cx="-tree.r * 0.3" :cy="-tree.r * 0.3" :r="tree.r * 0.6" fill="#58a04f" />
                <circle :cx="-tree.r * 0.45" :cy="-tree.r * 0.45" :r="tree.r * 0.25" fill="#73b866" />
              </g>
              <g v-for="(bush, i) in BUSH_TILE" :key="`bush-${i}`" :transform="`translate(${bush.x} ${bush.y})`">
                <circle r="10" fill="#3f7d3a" />
                <circle cx="9" cy="3" r="8" fill="#4a8a43" />
                <circle cx="-3" cy="-4" r="4" fill="#ff6b8a" />
              </g>
            </g>
            <g id="rc-cone">
              <ellipse cx="3" cy="4" rx="18" ry="16" fill="rgba(0,0,0,0.25)" />
              <rect x="-16" y="-16" width="32" height="32" rx="5" fill="#e4572e" />
              <circle r="12" fill="#ff8a3d" />
              <circle r="8" fill="#fff" />
              <circle r="4.5" fill="#ff8a3d" />
            </g>
            <g id="rc-oil">
              <path d="M-30 -6 C-28 -22 -4 -24 8 -16 C24 -20 34 -6 26 6 C30 20 4 24 -8 16 C-24 22 -36 10 -30 -6 Z" fill="#141414" opacity="0.88" />
              <path d="M-14 -8 C-6 -14 6 -12 10 -6" stroke="#6c5ce7" stroke-width="3" fill="none" opacity="0.7" />
              <path d="M-10 -2 C-2 -6 6 -4 12 0" stroke="#00b894" stroke-width="2.5" fill="none" opacity="0.6" />
            </g>
            <g id="rc-hay">
              <rect x="-26" y="-14" width="56" height="34" rx="8" fill="rgba(0,0,0,0.22)" />
              <rect x="-30" y="-18" width="56" height="34" rx="8" fill="#e8c35a" />
              <path d="M-20 -16 v30 M-10 -16 v30 M0 -16 v30 M10 -16 v30" stroke="#c99a2e" stroke-width="2" />
              <path d="M-30 -6 h56 M-30 6 h56" stroke="#a0522d" stroke-width="3" />
            </g>
          </defs>

          <rect :width="SCENE_W" :height="SCENE_H" fill="url(#rc-grass)" />
          <use href="#rc-scenery" :y="wrap(cameraPx, TILE_H) - TILE_H" />
          <use href="#rc-scenery" :y="wrap(cameraPx, TILE_H)" />

          <rect :x="ROAD_X" y="0" :width="ROAD_W" :height="SCENE_H" fill="url(#rc-asphalt)" />
          <rect :x="ROAD_X - 14" y="0" width="14" :height="SCENE_H" fill="url(#rc-kerb)" />
          <rect :x="ROAD_X + ROAD_W" y="0" width="14" :height="SCENE_H" fill="url(#rc-kerb)" />
          <rect :x="ROAD_X + 6" y="0" width="4" :height="SCENE_H" fill="#fff" opacity="0.8" />
          <rect :x="ROAD_X + ROAD_W - 10" y="0" width="4" :height="SCENE_H" fill="#fff" opacity="0.8" />
          <g v-for="lane in LANE_COUNT - 1" :key="`lane-${lane}`">
            <rect
              v-for="dash in DASHES"
              :key="`dash-${lane}-${dash}`"
              :x="ROAD_X + lane * LANE_W - 3"
              :y="(dash - 1) * 56 + wrap(cameraPx, 56)"
              width="6"
              height="30"
              rx="2"
              fill="#fff"
              opacity="0.75"
            />
          </g>

          <!-- start line -->
          <g v-if="startY < SCENE_H + 30 && startY > -30">
            <rect :x="ROAD_X" :y="startY" :width="ROAD_W" height="16" fill="url(#rc-check)" />
          </g>

          <!-- finish line + gantry -->
          <g v-if="finishY > -80 && finishY < SCENE_H + 40">
            <rect :x="ROAD_X" :y="finishY - 12" :width="ROAD_W" height="24" fill="url(#rc-check)" />
            <rect :x="ROAD_X - 26" :y="finishY - 28" :width="ROAD_W + 52" height="12" rx="4" fill="#2b2118" />
            <rect :x="ROAD_X - 30" :y="finishY - 32" width="12" height="54" fill="#2b2118" />
            <rect :x="ROAD_X + ROAD_W + 18" :y="finishY - 32" width="12" height="54" fill="#2b2118" />
            <rect :x="SCENE_W / 2 - 50" :y="finishY - 44" width="100" height="30" rx="8" fill="#e4572e" stroke="#fff" stroke-width="3" />
            <text :x="SCENE_W / 2" :y="finishY - 22" text-anchor="middle" font-size="18" font-weight="900" fill="#fff">ZIEL</text>
          </g>

          <!-- obstacles -->
          <use
            v-for="obstacle in visibleObstacles"
            :key="`obstacle-${obstacle.id}`"
            :href="`#rc-${obstacle.kind}`"
            :transform="`translate(${obstacle.x} ${obstacle.y})`"
          />

          <!-- speed lines -->
          <rect
            v-for="(line, i) in speedLines"
            :key="`speed-${i}`"
            :x="line.x"
            :y="line.y"
            width="3"
            :height="line.h"
            rx="1.5"
            fill="#fff"
            opacity="0.22"
          />

          <!-- cars -->
          <g v-for="car in carViews" :key="`car-${car.seatIndex}`">
            <g v-if="car.hit" class="rc-smoke" :transform="`translate(${car.x + 26} ${car.y + 34})`">
              <circle r="12" fill="#cfcac4" opacity="0.8" />
              <circle cx="-14" cy="10" r="9" fill="#cfcac4" opacity="0.8" />
              <circle cx="12" cy="12" r="8" fill="#cfcac4" opacity="0.7" />
            </g>
            <g :transform="`translate(${car.x} ${car.y}) rotate(${car.rotate}) scale(${car.scale}) translate(-30 -50)`">
              <RaceCarSprite :color="car.color" :number="car.seatIndex + 1" :flames="car.fast" />
            </g>
            <g v-if="car.hit" :transform="`translate(${car.x} ${car.y - 66})`">
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
            <g :transform="`translate(${car.x - car.tagWidth / 2} ${car.y - (car.hit ? 106 : 82) - car.tagLift})`">
              <rect :width="car.tagWidth" height="22" rx="11" :fill="car.color" stroke="#fff" stroke-width="2" />
              <text
                :x="car.tagWidth / 2"
                y="15.5"
                text-anchor="middle"
                font-size="13"
                font-weight="800"
                :fill="car.color === '#f0b429' ? '#2b2118' : '#fff'"
              >{{ car.name }}</text>
            </g>
          </g>
        </svg>

        <div
          v-if="state.phase === 'countdown'"
          class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#2b2118]/55 px-4 text-center backdrop-blur-[2px]"
        >
          <p class="font-[var(--font-display)] text-7xl font-bold text-[#fff6e8] drop-shadow-md sm:text-8xl">
            {{ countdownSeconds }}
          </p>
          <p class="text-lg font-semibold text-[#fff6e8]">Gleich geht's los!</p>
          <div class="space-y-2 text-sm text-[#fff6e8]/90">
            <p v-if="humanPlayers.length >= 1">
              <strong>{{ humanPlayers[0]!.displayName }}:</strong>
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">A</kbd>/<kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">D</kbd>
            </p>
            <p v-if="humanPlayers.length >= 2">
              <strong>{{ humanPlayers[1]!.displayName }}:</strong>
              <kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">←</kbd>/<kbd class="mx-1 rounded bg-[#fff6e8]/15 px-2 py-1 font-mono">→</kbd>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rc-smoke {
  animation: rc-smoke-puff 0.65s ease-out forwards;
}

@keyframes rc-smoke-puff {
  from { opacity: 0.9; }
  to { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .rc-smoke {
    animation: none;
  }
}
</style>
