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

const props = defineProps<{
  players: SessionPlayer[]
}>()

const emit = defineEmits<{
  complete: [winnerSeatIndexes: number[]]
}>()

const { play } = useSound()

const PLAYER_COLORS = ['#2a6b8a', '#a85a2a'] as const

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
const rankedByHits = computed(() =>
  [...state.value.players].sort((a, b) => b.hits - a.hits),
)

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
  const index = state.value.players.findIndex((player) => player.seatIndex === seatIndex)
  return PLAYER_COLORS[index] ?? PLAYER_COLORS[0]!
}

function toLeftPercent(x: number): number {
  return (x / ARENA_WIDTH) * 100
}

function toTopPercent(y: number): number {
  return (y / ARENA_HEIGHT) * 100
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
  keysHeld.delete(event.key)
  syncHumanMoves()
  syncState()
}

function handleWindowBlur(): void {
  keysHeld.clear()
  clearHumanMoves()
  syncState()
}

function lifeIcons(player: DragonBossPlayer): string {
  return '❤'.repeat(player.lives) + '♡'.repeat(Math.max(0, 3 - player.lives))
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

  if (game.state.dragon.hp < previousDragonHp.value) {
    play('match')
    previousDragonHp.value = game.state.dragon.hp
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
      emit('complete', game.getWinnerSeatIndexes())
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
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#6b3a2a]">Drachenhort</p>
        <p class="font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
          Treffen · Ausweichen · 3 Leben
        </p>
        <p class="mt-1 text-sm text-[var(--text-muted)]">
          P1: WASD + Leertaste · P2: Pfeile + Enter
        </p>
      </div>
      <div class="min-w-[12rem] flex-1 sm:max-w-sm">
        <div class="mb-1 flex justify-between text-xs font-bold text-[var(--text-muted)]">
          <span>Drache</span>
          <span class="tabular-nums">{{ state.dragon.hp }} / {{ state.dragon.maxHp }}</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full bg-[#d7c4a3]">
          <div
            class="h-full rounded-full bg-[#c45c2a] transition-[width] duration-100 ease-linear"
            :style="{ width: `${dragonHpPercent}%` }"
          />
        </div>
      </div>
    </div>

    <ol class="flex flex-wrap gap-2">
      <li
        v-for="player in rankedByHits"
        :key="`hud-${player.seatIndex}`"
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold text-[#fff8ef] shadow-[0_2px_0_rgba(43,33,24,0.35)]"
        :style="{ backgroundColor: getPlayerColor(player.seatIndex) }"
      >
        <span class="max-w-[7rem] truncate">{{ getPlayerMeta(player.seatIndex)?.displayName ?? `P${player.seatIndex + 1}` }}</span>
        <span class="tabular-nums opacity-90">{{ player.hits }}</span>
        <span aria-hidden="true">{{ lifeIcons(player) }}</span>
      </li>
    </ol>

    <div class="relative overflow-hidden rounded-[1.6rem] shadow-[0_16px_0_#3a2418]">
      <div
        class="dragon-arena relative h-[min(64vh,540px)] w-full select-none"
        role="img"
        aria-label="Drachenkampf Arena"
      >
        <div class="arena-sky absolute inset-0" aria-hidden="true" />
        <div class="arena-ground absolute inset-x-0 bottom-0 h-[28%]" aria-hidden="true" />
        <div class="ember ember-a" aria-hidden="true" />
        <div class="ember ember-b" aria-hidden="true" />

        <div
          v-if="state.dragon.sweepMs > 0"
          class="absolute left-0 z-10 h-4 w-full -translate-y-1/2 sweep-beam"
          :style="{ top: `${toTopPercent(state.dragon.sweepY)}%` }"
          aria-hidden="true"
        />

        <div
          class="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          :style="{
            left: `${toLeftPercent(state.dragon.x)}%`,
            top: `${toTopPercent(state.dragon.y)}%`,
          }"
        >
          <div class="dragon-body" :class="{ 'is-hurt': state.dragon.hp < state.dragon.maxHp * 0.35 }" aria-hidden="true">
            <span class="dragon-emoji">🐉</span>
          </div>
        </div>

        <div
          v-for="fireball in state.fireballs"
          :key="`fire-${fireball.id}`"
          class="absolute z-30 -translate-x-1/2 -translate-y-1/2"
          :style="{
            left: `${toLeftPercent(fireball.x)}%`,
            top: `${toTopPercent(fireball.y)}%`,
          }"
          aria-hidden="true"
        >
          <span class="fireball">🔥</span>
        </div>

        <div
          v-for="projectile in state.projectiles"
          :key="`shot-${projectile.id}`"
          class="absolute z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe7a0] shadow-[0_0_10px_#ffd36a]"
          :style="{
            left: `${toLeftPercent(projectile.x)}%`,
            top: `${toTopPercent(projectile.y)}%`,
          }"
          aria-hidden="true"
        />

        <div
          v-for="player in state.players"
          :key="`fighter-${player.seatIndex}`"
          class="absolute z-40 -translate-x-1/2 -translate-y-1/2"
          :class="[
            player.alive ? 'opacity-100' : 'opacity-35',
            player.invulnMs > 0 ? 'is-invuln' : '',
          ]"
          :style="{
            left: `${toLeftPercent(player.x)}%`,
            top: `${toTopPercent(player.y)}%`,
          }"
        >
          <div class="flex flex-col items-center gap-1">
            <span
              class="max-w-[6.5rem] truncate rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold text-[#fff8ef]"
              :style="{ backgroundColor: getPlayerColor(player.seatIndex) }"
            >
              {{ getPlayerMeta(player.seatIndex)?.displayName ?? `P${player.seatIndex + 1}` }}
            </span>
            <div
              class="fighter-token grid h-11 w-11 place-items-center rounded-full text-lg font-black text-[#fff8ef] ring-4 ring-[#fff4df]"
              :style="{ backgroundColor: getPlayerColor(player.seatIndex) }"
            >
              ⚔
            </div>
          </div>
        </div>

        <div
          v-if="state.phase === 'countdown'"
          class="absolute inset-0 z-50 grid place-items-center bg-[#1b120c]/45"
        >
          <p class="font-[var(--font-display)] text-7xl font-bold text-[#fff4df] drop-shadow-lg tabular-nums">
            {{ countdownSeconds }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dragon-arena {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 180, 90, 0.28), transparent 55%),
    linear-gradient(180deg, #6a3a28 0%, #3f261c 48%, #2a1a14 100%);
}

.arena-sky {
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 214, 140, 0.22), transparent 28%),
    radial-gradient(circle at 78% 12%, rgba(255, 140, 90, 0.16), transparent 24%);
}

.arena-ground {
  background:
    linear-gradient(180deg, transparent, rgba(28, 18, 12, 0.55)),
    repeating-linear-gradient(
      90deg,
      rgba(90, 55, 35, 0.35) 0 12px,
      rgba(70, 42, 28, 0.35) 12px 24px
    );
}

.ember {
  position: absolute;
  border-radius: 999px;
  filter: blur(1px);
  opacity: 0.55;
  animation: float-ember 4.5s ease-in-out infinite;
}

.ember-a {
  left: 12%;
  top: 30%;
  width: 10px;
  height: 10px;
  background: #ffb45a;
}

.ember-b {
  right: 18%;
  top: 42%;
  width: 8px;
  height: 8px;
  background: #ff7a3a;
  animation-delay: -1.6s;
}

.dragon-body {
  display: grid;
  place-items: center;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 999px;
  background: radial-gradient(circle at 40% 30%, #6fbf6a, #2f6b3a 70%);
  box-shadow: 0 10px 0 rgba(20, 30, 16, 0.35);
  animation: dragon-bob 2.2s ease-in-out infinite;
}

.dragon-body.is-hurt {
  background: radial-gradient(circle at 40% 30%, #d97a4a, #7a3020 70%);
}

.dragon-emoji {
  font-size: 2.8rem;
  line-height: 1;
}

.fireball {
  font-size: 1.4rem;
  filter: drop-shadow(0 0 6px #ff8a3a);
}

.sweep-beam {
  background: linear-gradient(90deg, transparent, rgba(255, 140, 60, 0.85), transparent);
  box-shadow: 0 0 24px rgba(255, 120, 40, 0.65);
}

.is-invuln .fighter-token {
  animation: blink-invuln 0.25s steps(2) infinite;
}

@keyframes dragon-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes float-ember {
  0%, 100% { transform: translateY(0); opacity: 0.35; }
  50% { transform: translateY(-18px); opacity: 0.8; }
}

@keyframes blink-invuln {
  from { opacity: 1; }
  to { opacity: 0.35; }
}
</style>
