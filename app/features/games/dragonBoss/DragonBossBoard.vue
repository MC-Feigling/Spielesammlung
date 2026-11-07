<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SessionPlayer } from '~/types/game'
import { useSessionStore } from '~/stores/session'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  createDragonBossGame,
  type DragonBossPlayer,
  type DragonBossState,
} from './engine'
import { chooseDragonBossActions } from './ai'
import { playerColor } from '~/constants/players'
import type { TouchControlButton } from '~/components/game/TouchControls.vue'
import { plural, sortStandings, type GameStanding } from '../shared/standings'

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[], standings?: GameStanding[]]
}>()

const { play } = useSound()

const SCALE = 10
const SCENE_W = ARENA_WIDTH * SCALE
const SCENE_H = ARENA_HEIGHT * SCALE
const SWEEP_WARN_MS = 1100
const HIT_FLASH_MS = 140
const STARS = Array.from({ length: 34 }, (_, index) => ({
  x: (index * 131) % SCENE_W,
  y: 8 + ((index * 37) % 110),
  r: 1 + (index % 2),
}))
const KEYS = [
  { left: 'a', right: 'd', up: 'w', down: 's', shoot: ' ', hint: 'WASD + Leertaste' },
  { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', shoot: 'Enter', hint: 'Pfeile + Enter' },
] as const
const TOUCH_BUTTONS: TouchControlButton[] = [
  { id: 'up', label: 'Hoch', icon: '▲' },
  { id: 'left', label: 'Links', icon: '◀' },
  { id: 'down', label: 'Runter', icon: '▼' },
  { id: 'right', label: 'Rechts', icon: '▶' },
  { id: 'shoot', label: 'Schießen', icon: '➶', primary: true },
]

const P1_LEFT = new Set(['a', 'A'])
const P1_RIGHT = new Set(['d', 'D'])
const P1_UP = new Set(['w', 'W'])
const P1_DOWN = new Set(['s', 'S'])
const P1_SHOOT = new Set([' '])
const P2_LEFT = new Set(['ArrowLeft'])
const P2_RIGHT = new Set(['ArrowRight'])
const P2_UP = new Set(['ArrowUp'])
const P2_DOWN = new Set(['ArrowDown'])
const P2_SHOOT = new Set(['Enter'])

const session = useSessionStore()
const aiDifficulty = computed(() => session.aiDifficulty)

const game = createDragonBossGame({
  players: props.players.map((player) => ({ seatIndex: player.seatIndex, type: player.type })),
})

const state = ref<DragonBossState>(cloneState())

const humanPlayers = computed(() => props.players.filter((player) => player.type === 'human'))
const countdownSeconds = computed(() => Math.ceil(state.value.countdownMs / 1000))
const isFighting = computed(() => state.value.phase === 'fighting')
const dragonHpPercent = computed(() =>
  Math.max(0, (state.value.dragon.hp / state.value.dragon.maxHp) * 100),
)
const nowMs = ref(0)
const lastDragonHitAt = ref(-Infinity)
const dragonFlash = computed(() => nowMs.value - lastDragonHitAt.value < HIT_FLASH_MS)
const sweepWarning = computed(() => isFighting.value
  && state.value.dragon.sweepMs === 0
  && state.value.dragon.sweepCooldownMs < SWEEP_WARN_MS)

let rafId: number | undefined
let lastTimestamp = 0
let hasPlayedStart = false
let hasEmittedComplete = false
const previousLives = new Map<number, number>()
const previousDragonHp = ref(game.state.dragon.hp)
const keysHeld = new Set<string>()

function cloneState(): DragonBossState {
  return {
    ...game.state,
    players: game.state.players.map((player) => ({ ...player })),
    dragon: { ...game.state.dragon },
    projectiles: game.state.projectiles.map((projectile) => ({ ...projectile })),
    fireballs: game.state.fireballs.map((fireball) => ({ ...fireball })),
  }
}

function syncState(): void {
  state.value = cloneState()
}

function getPlayerMeta(seatIndex: number): SessionPlayer | undefined {
  return props.players.find((player) => player.seatIndex === seatIndex)
}

function getPlayerColor(seatIndex: number): string {
  const index = props.players.findIndex((player) => player.seatIndex === seatIndex)
  return playerColor(Math.max(0, index))
}

function playerName(seatIndex: number): string {
  return getPlayerMeta(seatIndex)?.displayName ?? `P${seatIndex + 1}`
}

function projectileColor(ownerSeatIndex: number): string {
  return getPlayerColor(ownerSeatIndex)
}

function fireballAngle(vx: number, vy: number): number {
  return (Math.atan2(vy, vx) * 180) / Math.PI - 90
}

function axisFromKeys(
  left: Set<string>,
  right: Set<string>,
  up: Set<string>,
  down: Set<string>,
): { moveX: -1 | 0 | 1, moveY: -1 | 0 | 1 } {
  let moveX: -1 | 0 | 1 = 0
  let moveY: -1 | 0 | 1 = 0
  if ([...left].some((key) => keysHeld.has(key))) moveX = -1
  if ([...right].some((key) => keysHeld.has(key))) moveX = 1
  if ([...up].some((key) => keysHeld.has(key))) moveY = -1
  if ([...down].some((key) => keysHeld.has(key))) moveY = 1
  return { moveX, moveY }
}

function syncHumanMoves(): void {
  const humans = humanPlayers.value
  if (humans.length >= 1) {
    const move = axisFromKeys(P1_LEFT, P1_RIGHT, P1_UP, P1_DOWN)
    game.setMove(humans[0]!.seatIndex, move.moveX, move.moveY)
  }
  if (humans.length >= 2) {
    const move = axisFromKeys(P2_LEFT, P2_RIGHT, P2_UP, P2_DOWN)
    game.setMove(humans[1]!.seatIndex, move.moveX, move.moveY)
  }
}

function clearHumanMoves(): void {
  for (const player of humanPlayers.value) {
    game.setMove(player.seatIndex, 0, 0)
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  const key = event.key
  const isControlKey = (
    P1_LEFT.has(key) || P1_RIGHT.has(key) || P1_UP.has(key) || P1_DOWN.has(key) || P1_SHOOT.has(key)
    || P2_LEFT.has(key) || P2_RIGHT.has(key) || P2_UP.has(key) || P2_DOWN.has(key) || P2_SHOOT.has(key)
  )
  if (isControlKey) event.preventDefault()
  if (event.repeat) return
  pressKey(key)
}

function pressKey(key: string): void {
  if (keysHeld.has(key)) return
  keysHeld.add(key)

  if (!isFighting.value) return

  const humans = humanPlayers.value
  if (humans.length >= 1 && P1_SHOOT.has(key)) {
    game.shoot(humans[0]!.seatIndex)
  }
  else if (humans.length >= 2 && P2_SHOOT.has(key)) {
    game.shoot(humans[1]!.seatIndex)
  }

  syncHumanMoves()
  syncState()
}

function handleKeyUp(event: KeyboardEvent): void {
  releaseKey(event.key)
}

function releaseKey(key: string): void {
  keysHeld.delete(key)
  syncHumanMoves()
  syncState()
}

function touchKey(humanIndex: number, id: string): string | undefined {
  const keys = KEYS[humanIndex]
  if (!keys) return undefined
  return (keys as Record<string, string>)[id]
}

function onTouchPress(humanIndex: number, id: string): void {
  const key = touchKey(humanIndex, id)
  if (key) pressKey(key)
}

function onTouchRelease(humanIndex: number, id: string): void {
  const key = touchKey(humanIndex, id)
  if (key) releaseKey(key)
}

function handleWindowBlur(): void {
  keysHeld.clear()
  clearHumanMoves()
  syncState()
}

function hearts(player: DragonBossPlayer): boolean[] {
  return [0, 1, 2].map((index) => index < player.lives)
}

function tickLoop(timestamp: number): void {
  if (!lastTimestamp) lastTimestamp = timestamp
  const dt = Math.min(48, timestamp - lastTimestamp)
  lastTimestamp = timestamp

  const previousPhase = game.state.phase
  syncHumanMoves()
  game.tick(dt)

  if (previousPhase === 'countdown' && game.state.phase === 'fighting' && !hasPlayedStart) {
    play('start')
    hasPlayedStart = true
  }

  for (const player of game.state.players) {
    const previous = previousLives.get(player.seatIndex) ?? player.lives
    if (player.lives < previous) {
      play('hit')
    }
    previousLives.set(player.seatIndex, player.lives)
  }

  nowMs.value = timestamp
  if (game.state.dragon.hp < previousDragonHp.value) {
    play('match')
    previousDragonHp.value = game.state.dragon.hp
    lastDragonHitAt.value = timestamp
  }

  for (const player of props.players) {
    if (player.type !== 'ai') continue
    const actions = chooseDragonBossActions(game.state, player.seatIndex, {
      difficulty: aiDifficulty.value,
    })
    game.setMove(player.seatIndex, actions.moveX, actions.moveY)
    if (actions.shoot) {
      game.shoot(player.seatIndex)
    }
  }

  syncState()

  if (game.state.phase === 'finished') {
    if (!hasEmittedComplete) {
      hasEmittedComplete = true
      play('win')
      emit('complete', game.getWinnerSeatIndexes(), sortStandings(game.state.players.map((player) => ({
        seatIndex: player.seatIndex,
        score: player.hits,
        label: plural(player.hits, 'Treffer', 'Treffer'),
      }))))
    }
    return
  }

  rafId = requestAnimationFrame(tickLoop)
}

onMounted(() => {
  for (const player of game.state.players) {
    previousLives.set(player.seatIndex, player.lives)
  }
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
  clearHumanMoves()
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-3">
    <div
      class="relative mx-auto w-full overflow-hidden rounded-[1.6rem] shadow-[0_12px_0_#2a1e3a]"
      :style="{ maxWidth: `max(32rem, calc((100vh - 23.5rem) * ${SCENE_W / SCENE_H}))` }"
    >
      <svg
        class="block h-auto w-full select-none"
        :viewBox="`0 0 ${SCENE_W} ${SCENE_H}`"
        role="img"
        aria-label="Drachenkampf Arena"
      >
        <defs>
          <linearGradient id="db-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2c2550" />
            <stop offset="1" stop-color="#6d4a6f" />
          </linearGradient>
          <pattern id="db-stone" width="64" height="40" patternUnits="userSpaceOnUse">
            <rect width="64" height="40" fill="#5b5148" />
            <rect x="2" y="2" width="28" height="16" rx="3" fill="#6a5f55" />
            <rect x="34" y="2" width="28" height="16" rx="3" fill="#645a50" />
            <rect x="-14" y="22" width="28" height="16" rx="3" fill="#62584e" />
            <rect x="18" y="22" width="28" height="16" rx="3" fill="#6b6056" />
            <rect x="50" y="22" width="28" height="16" rx="3" fill="#605649" />
          </pattern>
          <radialGradient id="db-glow" cx="0.5" cy="0.5">
            <stop offset="0" stop-color="#ffb43a" stop-opacity="0.6" />
            <stop offset="1" stop-color="#ffb43a" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="db-flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffd23f" stop-opacity="0.2" />
            <stop offset="0.5" stop-color="#ff6a1a" stop-opacity="0.95" />
            <stop offset="1" stop-color="#ffd23f" stop-opacity="0.2" />
          </linearGradient>
        </defs>

        <!-- night sky, castle -->
        <rect :width="SCENE_W" :height="SCENE_H" fill="url(#db-sky)" />
        <circle v-for="(star, i) in STARS" :key="`star-${i}`" :cx="star.x" :cy="star.y" :r="star.r" fill="#fff" opacity="0.7" />
        <circle cx="880" cy="62" r="30" fill="#f6e7b0" />
        <rect x="0" y="150" :width="SCENE_W" height="80" fill="#4a423b" />
        <rect v-for="n in 25" :key="`merlon-${n}`" :x="(n - 1) * 40" y="136" width="24" height="18" fill="#4a423b" />
        <g v-for="(tower, i) in [{ x: 70, c: playerColor(0) }, { x: 930, c: playerColor(2) }]" :key="`tower-${i}`">
          <rect :x="tower.x - 36" y="80" width="72" height="150" fill="#3f3832" />
          <path :d="`M${tower.x - 42} 82 L${tower.x} 34 L${tower.x + 42} 82 Z`" fill="#8a3a2a" />
          <rect :x="tower.x - 8" y="120" width="16" height="26" rx="8" fill="#ffcf6a" />
          <rect :x="tower.x" y="12" width="3" height="24" fill="#2b2118" />
          <path class="db-flag" :d="`M${tower.x + 3} 14 l28 7 l-28 7 z`" :fill="tower.c" />
        </g>
        <rect x="0" y="230" :width="SCENE_W" :height="SCENE_H - 230" fill="url(#db-stone)" />
        <rect x="0" y="230" :width="SCENE_W" height="18" fill="rgba(0,0,0,0.25)" />

        <!-- fire sweep: warning, then flame wall -->
        <g v-if="sweepWarning" class="db-warn">
          <rect
            x="0"
            :y="(state.dragon.y + 6) * SCALE"
            :width="SCENE_W"
            :height="SCENE_H - (state.dragon.y + 6) * SCALE"
            fill="#ff3b1f"
            opacity="0.12"
          />
          <text x="20" :y="(state.dragon.y + 6) * SCALE + 36" font-size="26" font-weight="900" fill="#ffd2c4">⚠ Feuerstrahl!</text>
        </g>
        <g v-if="state.dragon.sweepMs > 0">
          <rect
            x="0"
            :y="(state.dragon.sweepY - 4) * SCALE"
            :width="SCENE_W"
            :height="8 * SCALE"
            fill="url(#db-flame)"
          />
          <rect
            x="0"
            :y="(state.dragon.sweepY - 1) * SCALE"
            :width="SCENE_W"
            :height="2 * SCALE"
            fill="#fff4b0"
            opacity="0.8"
          />
        </g>

        <!-- dragon -->
        <g :transform="`translate(${state.dragon.x * SCALE} ${state.dragon.y * SCALE}) scale(0.62)`">
          <g :class="{ 'db-hit': dragonFlash }">
            <ellipse cx="0" cy="230" rx="90" ry="14" fill="rgba(0,0,0,0.25)" />
            <g class="db-wing db-wing-left">
              <path d="M-30 -10 C-90 -70 -170 -60 -210 -10 C-170 -30 -150 -10 -150 10 C-130 -6 -110 0 -100 20 C-80 4 -60 10 -40 26 Z" fill="#2f7a4a" />
              <path d="M-40 -6 C-90 -50 -150 -46 -190 -14" stroke="#1f5a34" stroke-width="5" fill="none" />
            </g>
            <g class="db-wing db-wing-right">
              <path d="M30 -10 C90 -70 170 -60 210 -10 C170 -30 150 -10 150 10 C130 -6 110 0 100 20 C80 4 60 10 40 26 Z" fill="#2f7a4a" />
              <path d="M40 -6 C90 -50 150 -46 190 -14" stroke="#1f5a34" stroke-width="5" fill="none" />
            </g>
            <path d="M0 110 C30 130 60 120 70 96" stroke="#3f9a5c" stroke-width="16" fill="none" stroke-linecap="round" />
            <path d="M70 96 l16 -6 l-6 16 z" fill="#e4572e" />
            <ellipse cx="0" cy="40" rx="58" ry="72" fill="#3f9a5c" />
            <ellipse cx="0" cy="56" rx="34" ry="52" fill="#f2d48a" />
            <path
              v-for="i in 5"
              :key="`belly-${i}`"
              :d="`M-26 ${2 + i * 18} Q0 ${10 + i * 18} 26 ${2 + i * 18}`"
              stroke="#d9b45e"
              stroke-width="3"
              fill="none"
            />
            <path d="M-50 90 l-14 26 l10 -2 l2 10 l10 -18 z M50 90 l14 26 l-10 -2 l-2 10 l-10 -18 z" fill="#2f7a4a" />
            <ellipse cx="0" cy="-26" rx="44" ry="38" fill="#3f9a5c" />
            <path d="M-32 -52 L-46 -92 L-20 -60 Z M32 -52 L46 -92 L20 -60 Z" fill="#f4ede2" />
            <path d="M-12 -62 l6 -14 l6 12 l6 -14 l6 14" fill="#e4572e" />
            <ellipse cx="-17" cy="-32" rx="10" ry="12" fill="#fff4b0" />
            <ellipse cx="17" cy="-32" rx="10" ry="12" fill="#fff4b0" />
            <ellipse cx="-15" cy="-30" rx="4" ry="8" fill="#1a1411" />
            <ellipse cx="15" cy="-30" rx="4" ry="8" fill="#1a1411" />
            <path d="M-28 -46 l20 6 M28 -46 l-20 6" stroke="#1f5a34" stroke-width="5" stroke-linecap="round" />
            <ellipse cx="0" cy="-4" rx="28" ry="18" fill="#5bb377" />
            <circle cx="-9" cy="-8" r="3" fill="#1f5a34" />
            <circle cx="9" cy="-8" r="3" fill="#1f5a34" />
            <path d="M-16 4 Q0 14 16 4" stroke="#1f5a34" stroke-width="3" fill="none" />
            <path d="M-10 6 l3 6 l3 -5 M4 6 l3 6 l3 -5" fill="#fff" />
            <circle
              cx="0"
              cy="18"
              :r="sweepWarning ? 64 : 40"
              fill="url(#db-glow)"
              :class="{ 'db-charge': sweepWarning }"
            />
          </g>
          <g v-if="dragonFlash">
            <path
              v-for="angle in [0, 60, 120, 180, 240, 300]"
              :key="`spark-${angle}`"
              :transform="`translate(-20 20) rotate(${angle})`"
              d="M0 -10 L5 -36 L0 -28 L-5 -36 Z"
              fill="#fff6a0"
            />
          </g>
        </g>

        <!-- fireballs -->
        <g
          v-for="fireball in state.fireballs"
          :key="`fire-${fireball.id}`"
          :transform="`translate(${fireball.x * SCALE} ${fireball.y * SCALE}) rotate(${fireballAngle(fireball.vx, fireball.vy)})`"
        >
          <path d="M-9 -6 C-13 -28 -2 -42 0 -50 C4 -40 15 -28 9 -6 Z" fill="#ff8a3d" opacity="0.55" />
          <circle r="13" fill="#ff6a1a" />
          <circle r="8" fill="#ffb43a" />
          <circle cx="-2" cy="-2" r="4" fill="#fff4b0" />
        </g>

        <!-- crossbow bolts -->
        <g
          v-for="projectile in state.projectiles"
          :key="`shot-${projectile.id}`"
          :transform="`translate(${projectile.x * SCALE} ${projectile.y * SCALE})`"
        >
          <rect x="-2.5" y="-18" width="5" height="28" rx="2" fill="#f4ede2" />
          <path d="M0 -28 l7 11 h-14 z" fill="#c9ced6" />
          <path d="M-6 9 h12 l-6 7z" :fill="projectileColor(projectile.ownerSeatIndex)" />
        </g>

        <!-- knights -->
        <g
          v-for="player in state.players"
          :key="`knight-${player.seatIndex}`"
          :transform="`translate(${player.x * SCALE} ${player.y * SCALE})`"
          :class="{ 'db-invuln': player.alive && player.invulnMs > 0 }"
        >
          <g :transform="player.alive ? '' : 'rotate(90) translate(10 0)'" :opacity="player.alive ? 1 : 0.45">
            <ellipse cx="0" cy="30" rx="24" ry="7" fill="rgba(0,0,0,0.35)" />
            <rect x="-14" y="2" width="28" height="28" rx="8" fill="#c9ced6" />
            <rect x="-14" y="10" width="28" height="13" :fill="getPlayerColor(player.seatIndex)" />
            <path d="M-6 10 h12 l-6 10 z" fill="#fff" opacity="0.85" />
            <circle cx="0" cy="-7" r="14" fill="#d7dbe2" stroke="#8b929c" stroke-width="2" />
            <rect x="-10" y="-9" width="20" height="4" rx="2" fill="#2b2f36" />
            <path d="M0 -21 C10 -35 24 -28 20 -15 C15 -22 6 -22 0 -19 Z" :fill="getPlayerColor(player.seatIndex)" />
            <path d="M-26 0 h13 v19 c0 6 -6.5 10 -6.5 10 c0 0 -6.5 -4 -6.5 -10 z" :fill="getPlayerColor(player.seatIndex)" stroke="#fff" stroke-width="2" />
            <g transform="translate(17 -2)">
              <rect x="-2" y="-19" width="4" height="26" fill="#7a4e28" />
              <path d="M-13 -15 Q0 -24 13 -15" stroke="#4a3020" stroke-width="3" fill="none" />
            </g>
          </g>
          <g transform="translate(0 -52)">
            <rect x="-40" y="-12" width="80" height="22" rx="11" :fill="getPlayerColor(player.seatIndex)" stroke="#fff" stroke-width="2" />
            <text y="4" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">
              {{ player.alive ? playerName(player.seatIndex).slice(0, 10) : 'K.O.' }}
            </text>
          </g>
        </g>

        <!-- HUD: dragon health -->
        <g :transform="`translate(${SCENE_W / 2 - 180} 14)`">
          <rect width="360" height="38" rx="19" fill="rgba(20,14,10,0.72)" />
          <circle cx="22" cy="19" r="14" fill="#3f9a5c" />
          <path d="M13 9 l-4 -8 l11 6z M31 9 l4 -8 l-11 6z" fill="#f4ede2" />
          <circle cx="17" cy="17" r="2.2" fill="#fff4b0" />
          <circle cx="27" cy="17" r="2.2" fill="#fff4b0" />
          <rect x="44" y="13" width="300" height="12" rx="6" fill="#4a2a20" />
          <rect x="44" y="13" :width="Math.max(0, 300 * dragonHpPercent / 100)" height="12" rx="6" fill="#e4572e" />
          <rect x="44" y="13" :width="Math.max(0, 300 * dragonHpPercent / 100)" height="5" rx="3" fill="#ff9a6b" />
          <text x="338" y="23.5" text-anchor="end" font-size="11" font-weight="900" fill="#fff">{{ state.dragon.hp }} / {{ state.dragon.maxHp }}</text>
        </g>

        <!-- HUD: players -->
        <g
          v-for="(player, index) in state.players"
          :key="`hud-${player.seatIndex}`"
          :transform="`translate(${index === 0 ? 14 : SCENE_W - 284} ${SCENE_H - 46})`"
        >
          <rect width="270" height="34" rx="17" fill="rgba(20,14,10,0.72)" />
          <circle cx="18" cy="17" r="10" :fill="getPlayerColor(player.seatIndex)" />
          <text x="36" y="22" font-size="14" font-weight="800" fill="#fff">
            {{ playerName(player.seatIndex).slice(0, 10) }} · {{ player.hits }} Treffer
          </text>
          <path
            v-for="(on, h) in hearts(player)"
            :key="`heart-${h}`"
            :transform="`translate(${200 + h * 20} 9)`"
            d="M0 4 C0 -2 8 -2 8 4 C8 -2 16 -2 16 4 C16 10 8 14 8 16 C8 14 0 10 0 4 Z"
            :fill="on ? '#ff5470' : '#5a4a44'"
          />
        </g>
      </svg>

      <div
        v-if="state.phase === 'countdown'"
        class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#1b120c]/50 px-4 text-center"
      >
        <p class="font-[var(--font-display)] text-7xl font-bold text-[#fff4df] drop-shadow-lg tabular-nums">
          {{ countdownSeconds }}
        </p>
        <p class="font-[var(--font-display)] text-2xl font-semibold text-[#fff4df]">Triff den Drachen, weich dem Feuer aus!</p>
        <p v-for="(human, index) in humanPlayers" :key="`hint-${human.seatIndex}`" class="text-sm font-bold text-[#f3e6ff]">
          {{ human.displayName }}: {{ KEYS[index]?.hint }}
        </p>
      </div>
    </div>

    <div v-if="humanPlayers.length" class="flex flex-wrap justify-center gap-3">
      <TouchControls
        v-for="(human, index) in humanPlayers.slice(0, 2)"
        :key="`touch-${human.seatIndex}`"
        :player-name="`${human.displayName} · ${KEYS[index]?.hint}`"
        :color="getPlayerColor(human.seatIndex)"
        :buttons="TOUCH_BUTTONS"
        dpad
        @press="onTouchPress(index, $event)"
        @release="onTouchRelease(index, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.db-wing {
  transform-box: fill-box;
  animation: db-flap 0.7s ease-in-out infinite alternate;
}

.db-wing-left { transform-origin: right center; }
.db-wing-right { transform-origin: left center; }

.db-hit {
  filter: brightness(2.4) saturate(0.4);
}

.db-charge {
  animation: db-pulse 0.25s ease-in-out infinite alternate;
}

.db-warn {
  animation: db-blink 0.3s ease-in-out infinite alternate;
}

.db-invuln {
  animation: db-blink 0.16s steps(2) infinite;
}

.db-flag {
  transform-box: fill-box;
  transform-origin: left center;
  animation: db-wave 1.1s ease-in-out infinite alternate;
}

@keyframes db-flap {
  from { transform: scaleY(1) rotate(0deg); }
  to { transform: scaleY(0.72) rotate(0deg); }
}

@keyframes db-pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

@keyframes db-blink {
  from { opacity: 1; }
  to { opacity: 0.35; }
}

@keyframes db-wave {
  from { transform: scaleX(1); }
  to { transform: scaleX(0.8) skewY(6deg); }
}

@media (prefers-reduced-motion: reduce) {
  .db-wing,
  .db-charge,
  .db-warn,
  .db-flag {
    animation: none;
  }
}
</style>
