<script setup lang="ts">
import { formatPlayerRange } from '~/constants/games'
import type { GameId } from '~/types/game'

interface GameCardData {
  id: GameId
  title: string
  blurb: string
  minPlayers: number
  maxPlayers: number
}

defineProps<{
  game: GameCardData
}>()

defineEmits<{
  select: []
}>()

const GAME_ICONS: Record<GameId, string> = {
  memory: '🧠',
  kniffel: '🎲',
  ludo: '🏁',
  racing: '🏎️',
  uno: '🃏',
  connectFour: '🔴',
  shutTheBox: '📦',
  muehle: '⚪',
  horseRacing: '🐴',
  puzzleRace: '🧩',
  dragonBoss: '🐉',
  handyman: '🔧',
}
</script>

<template>
  <article class="flex h-full flex-col rounded-3xl bg-[var(--color-panel)] p-5 shadow-[0_6px_0_#c48a4a] ring-2 ring-[#dfbd8c]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-[#ffe1a8] text-3xl" aria-hidden="true">
        {{ GAME_ICONS[game.id] }}
      </span>
      <span class="rounded-full bg-[#dceddc] px-3 py-1 text-sm font-bold text-[#27462f]">
        {{ formatPlayerRange(game.minPlayers, game.maxPlayers) }}
      </span>
    </div>
    <h2 class="font-[var(--font-display)] text-2xl font-semibold">{{ game.title }}</h2>
    <p class="mt-2 flex-1 text-[var(--text-base)] leading-relaxed">{{ game.blurb }}</p>
    <AppButton class="mt-5" block @click="$emit('select')">
      Spiel auswählen
      <span aria-hidden="true">→</span>
    </AppButton>
  </article>
</template>
