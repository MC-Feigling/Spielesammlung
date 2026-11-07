<script setup lang="ts">
import { computed } from 'vue'

export interface WinScreenEntry {
  key: number
  name: string
  avatarId: string
  isAi: boolean
  color: string
  textColor: string
  place: number
  label: string
}

const props = defineProps<{
  gameTitle?: string
  headline: string
  entries: WinScreenEntry[]
  note?: string
}>()

defineEmits<{
  again: []
  backToHub: []
}>()

const STEP_HEIGHTS = [150, 108, 80] as const
const CONFETTI_COLORS = ['#e45b3a', '#f0b429', '#3d8fd1', '#4faf6a', '#9b5de5'] as const

/** Podium order on screen: 2nd, 1st, 3rd. */
const podium = computed(() => {
  const top = props.entries.slice(0, 3).map((entry, rank) => ({
    ...entry,
    height: STEP_HEIGHTS[rank]!,
    rank,
  }))
  if (top.length < 2) return top
  const [first, second, third] = top
  return third ? [second!, first!, third] : [second!, first!]
})

const rest = computed(() => props.entries.slice(3))

const confetti = Array.from({ length: 36 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: ((index * 13) % 20) / 10,
  duration: 2.6 + ((index * 7) % 10) / 6,
  rotate: (index * 47) % 360,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
}))
</script>

<template>
  <section
    aria-live="assertive"
    class="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_25%,_#fff3d6,_#f0c98a)] px-4 pb-8 pt-6 text-center shadow-[0_8px_0_#c48a4a] ring-4 ring-[#f3d9a8] sm:px-8"
  >
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <span
        v-for="(piece, index) in confetti"
        :key="index"
        class="confetti"
        :style="{
          left: `${piece.left}%`,
          backgroundColor: piece.color,
          animationDelay: `${piece.delay}s`,
          animationDuration: `${piece.duration}s`,
          '--rot': `${piece.rotate}deg`,
        }"
      />
    </div>

    <div class="relative">
      <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--color-accent)]">
        <template v-if="gameTitle">{{ gameTitle }} · </template>Spiel beendet
      </p>
      <h2 class="mt-1 font-[var(--font-display)] text-4xl font-semibold sm:text-5xl">{{ headline }}</h2>
      <p v-if="note" class="mt-2 font-bold text-[#7a4a20]">{{ note }}</p>

      <ol class="mx-auto mt-6 flex max-w-xl items-end justify-center gap-3 sm:gap-4" aria-label="Platzierung">
        <li
          v-for="entry in podium"
          :key="entry.key"
          class="flex w-1/3 max-w-[11rem] flex-col items-center"
        >
          <span v-if="entry.place === 1" class="crown" aria-hidden="true">👑</span>
          <span
            class="podium-avatar rounded-full bg-white p-1"
            :style="{ boxShadow: `0 0 0 5px ${entry.color}` }"
          >
            <PlayerAvatar :avatar-id="entry.avatarId" :is-ai="entry.isAi" :color="entry.color" :size="entry.rank === 0 ? 76 : 60" />
          </span>
          <div
            class="podium-step mt-3 flex w-full flex-col items-center justify-between rounded-t-2xl px-2 pb-2 pt-1 shadow-[inset_0_10px_0_rgba(255,255,255,0.22)]"
            :style="{ height: `${entry.height}px`, backgroundColor: entry.color, color: entry.textColor, animationDelay: `${0.15 * (2 - entry.rank)}s` }"
          >
            <span class="font-[var(--font-display)] text-4xl font-bold">{{ entry.place }}</span>
            <span class="w-full text-sm font-extrabold leading-tight">
              <span class="block truncate">{{ entry.name }}</span>
              <span v-if="entry.label" class="block truncate text-xs opacity-90">{{ entry.label }}</span>
            </span>
          </div>
        </li>
      </ol>

      <ul v-if="rest.length" class="mx-auto mt-3 flex max-w-xl flex-wrap justify-center gap-2">
        <li
          v-for="entry in rest"
          :key="entry.key"
          class="flex items-center gap-2 rounded-full bg-white/80 py-1 pl-1 pr-3 text-sm font-bold"
        >
          <PlayerAvatar :avatar-id="entry.avatarId" :is-ai="entry.isAi" :color="entry.color" :size="28" />
          {{ entry.place }}. {{ entry.name }}<template v-if="entry.label"> · {{ entry.label }}</template>
        </li>
      </ul>

      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <AppButton class="px-8 text-lg" @click="$emit('again')">
          <span aria-hidden="true">↻</span> Nochmal spielen
        </AppButton>
        <AppButton variant="ghost" @click="$emit('backToHub')">Anderes Spiel</AppButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.confetti {
  position: absolute;
  top: -1rem;
  width: 0.55rem;
  height: 0.9rem;
  border-radius: 2px;
  opacity: 0.9;
  animation: confetti-fall linear infinite;
}

.podium-step {
  animation: step-rise 0.5s ease-out both;
  transform-origin: bottom;
}

.crown {
  font-size: 1.8rem;
  line-height: 1;
  margin-bottom: -0.2rem;
  animation: crown-bob 1.4s ease-in-out infinite alternate;
}

@keyframes confetti-fall {
  0% { transform: translateY(0) rotate(var(--rot)); }
  100% { transform: translateY(34rem) rotate(calc(var(--rot) + 540deg)); }
}

@keyframes step-rise {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@keyframes crown-bob {
  from { transform: translateY(0) rotate(-6deg); }
  to { transform: translateY(-4px) rotate(6deg); }
}

@media (prefers-reduced-motion: reduce) {
  .confetti { display: none; }
  .podium-step,
  .crown { animation: none; }
}
</style>
