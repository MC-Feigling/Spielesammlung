<script setup lang="ts">
import { computed } from 'vue'
import { playerColor, playerTextColor } from '~/constants/players'
import type { GameBarTurn } from '~/composables/useGameBar'
import type { SessionPlayer } from '~/types/game'

const props = defineProps<{
  title: string
  players: SessionPlayer[]
  turn: GameBarTurn | null
}>()

defineEmits<{
  quit: []
}>()

const activeIndex = computed(() => {
  const turn = props.turn
  if (!turn) return -1
  if (turn.seatIndex !== null) {
    const bySeat = props.players.findIndex((player) => player.seatIndex === turn.seatIndex)
    if (bySeat >= 0) return bySeat
  }
  return props.players.findIndex((player) => player.displayName === turn.playerName)
})

const chips = computed(() => props.players.map((player, index) => ({
  key: player.seatIndex,
  name: player.displayName,
  avatarId: player.avatarId,
  isAi: player.type === 'ai',
  color: playerColor(index),
  textColor: playerTextColor(index),
  active: index === activeIndex.value,
})))

const statusText = computed(() => {
  const turn = props.turn
  if (!turn) return ''
  return turn.isAi ? `${turn.playerName} überlegt …` : `${turn.playerName} ist dran!`
})
</script>

<template>
  <header
    class="mb-4 flex flex-wrap items-center gap-2 rounded-[1.4rem] bg-[var(--color-panel)] px-3 py-2 shadow-[0_4px_0_#dfbd8c] ring-2 ring-[#ecd4ae] sm:gap-3"
  >
    <h1 class="px-1 font-[var(--font-display)] text-xl font-semibold sm:text-2xl">{{ title }}</h1>

    <ul class="flex flex-1 flex-wrap items-center gap-2" aria-label="Mitspieler">
      <li
        v-for="chip in chips"
        :key="chip.key"
        class="flex min-h-[2.75rem] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-extrabold transition-all duration-200"
        :class="chip.active ? 'scale-105 shadow-[0_0_0_3px_#fff,0_0_0_6px_var(--chip)]' : 'bg-[#f1e4d0] text-[var(--color-ink)]'"
        :style="chip.active
          ? { backgroundColor: chip.color, color: chip.textColor, '--chip': chip.color }
          : { boxShadow: `inset 0 0 0 3px ${chip.color}` }"
        :aria-current="chip.active ? 'true' : undefined"
      >
        <PlayerAvatar :avatar-id="chip.avatarId" :is-ai="chip.isAi" :color="chip.color" :size="34" />
        <span class="leading-tight">
          <span class="block max-w-[8rem] truncate">{{ chip.name }}</span>
          <span v-if="chip.active && turn" class="block max-w-[16rem] truncate text-[0.7rem] font-bold opacity-90">
            <template v-if="turn.isAi">
              überlegt
              <span class="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
            </template>
            <template v-else>{{ turn.hint }}</template>
          </span>
        </span>
      </li>
    </ul>

    <p class="sr-only" aria-live="polite">{{ statusText }}</p>

    <AppButton variant="ghost" class="!min-h-[2.75rem] !px-4 !py-1 text-sm" @click="$emit('quit')">
      <span aria-hidden="true">✕</span> Beenden
    </AppButton>
  </header>
</template>

<style scoped>
.thinking-dots i {
  display: inline-block;
  width: 0.3rem;
  height: 0.3rem;
  margin-left: 0.15rem;
  border-radius: 999px;
  background: currentColor;
  animation: dot-bounce 0.9s ease-in-out infinite;
}

.thinking-dots i:nth-child(2) { animation-delay: 0.15s; }
.thinking-dots i:nth-child(3) { animation-delay: 0.3s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
  30% { transform: translateY(-0.25rem); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .thinking-dots i { animation: none; }
}
</style>
