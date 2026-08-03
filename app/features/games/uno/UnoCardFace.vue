<script setup lang="ts">
import { computed } from 'vue'
import type { UnoCard, UnoColor, UnoRank } from './engine'

const props = withDefaults(
  defineProps<{
    card: UnoCard
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    size: 'md',
  },
)

const COLOR_HEX: Record<UnoColor, string> = {
  red: '#d7263d',
  yellow: '#f5c518',
  green: '#2a9d4a',
  blue: '#1f6feb',
}

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-24 w-[4.25rem] sm:h-28 sm:w-20',
  md: 'h-28 w-20 sm:h-36 sm:w-24',
  lg: 'h-32 w-[5.5rem] sm:h-40 sm:w-28',
}

const isWild = computed(() => props.card.rank === 'wild' || props.card.rank === 'wildDrawFour')

const shellColor = computed(() => {
  if (isWild.value) return '#1a1a1a'
  return COLOR_HEX[props.card.color as UnoColor]
})

const inkColor = computed(() => {
  if (isWild.value) return '#f7f3ea'
  if (props.card.color === 'yellow') return '#1a1a1a'
  return '#ffffff'
})

const cornerLabel = computed(() => rankCorner(props.card.rank))

function rankCorner(rank: UnoRank): string {
  switch (rank) {
    case 'skip':
      return '⊘'
    case 'reverse':
      return '⇄'
    case 'drawTwo':
      return '+2'
    case 'wild':
      return '★'
    case 'wildDrawFour':
      return '+4'
    default:
      return rank
  }
}
</script>

<template>
  <div
    class="relative select-none overflow-hidden rounded-[0.85rem] border-[3px] border-[#f4f0e6] shadow-[0_3px_0_rgba(43,33,24,0.45),inset_0_0_0_2px_rgba(0,0,0,0.18)]"
    :class="SIZE_CLASS[props.size]"
    :style="{ backgroundColor: shellColor }"
    aria-hidden="true"
  >
    <!-- Corner marks -->
    <span
      class="absolute left-1 top-1 z-20 font-[var(--font-display)] text-[0.7rem] font-black leading-none sm:left-1.5 sm:top-1.5 sm:text-sm"
      :style="{ color: inkColor }"
    >
      {{ cornerLabel }}
    </span>
    <span
      class="absolute bottom-1 right-1 z-20 rotate-180 font-[var(--font-display)] text-[0.7rem] font-black leading-none sm:bottom-1.5 sm:right-1.5 sm:text-sm"
      :style="{ color: inkColor }"
    >
      {{ cornerLabel }}
    </span>

    <!-- Classic oval plate -->
    <div
      class="absolute inset-[12%] flex items-center justify-center rounded-[50%] border-2 border-black/10 bg-[#f7f3ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
      style="transform: rotate(-12deg)"
    >
      <!-- Wild wedges -->
      <svg
        v-if="isWild"
        class="h-[72%] w-[72%]"
        viewBox="0 0 100 100"
        style="transform: rotate(12deg)"
      >
        <path d="M50 50 L50 4 A46 46 0 0 1 96 50 Z" fill="#d7263d" />
        <path d="M50 50 L96 50 A46 46 0 0 1 50 96 Z" fill="#f5c518" />
        <path d="M50 50 L50 96 A46 46 0 0 1 4 50 Z" fill="#2a9d4a" />
        <path d="M50 50 L4 50 A46 46 0 0 1 50 4 Z" fill="#1f6feb" />
        <circle cx="50" cy="50" r="16" fill="#1a1a1a" />
        <text
          x="50"
          y="56"
          text-anchor="middle"
          fill="#f7f3ea"
          font-size="16"
          font-weight="800"
          font-family="system-ui,sans-serif"
        >
          {{ card.rank === 'wildDrawFour' ? '+4' : 'W' }}
        </text>
      </svg>

      <!-- Number / action glyph -->
      <div
        v-else
        class="flex items-center justify-center"
        style="transform: rotate(12deg)"
        :style="{ color: shellColor }"
      >
        <svg
          v-if="card.rank === 'skip'"
          class="h-10 w-10 sm:h-12 sm:w-12"
          viewBox="0 0 64 64"
          fill="none"
        >
          <circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="7" />
          <line x1="16" y1="48" x2="48" y2="16" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
        </svg>
        <svg
          v-else-if="card.rank === 'reverse'"
          class="h-10 w-10 sm:h-12 sm:w-12"
          viewBox="0 0 64 64"
          fill="currentColor"
        >
          <path d="M18 28c0-8 7-14 15-14h6v-8l14 12-14 12v-8h-5c-4 0-7 3-7 6v4H18v-4z" />
          <path d="M46 36c0 8-7 14-15 14h-6v8L11 46l14-12v8h5c4 0 7-3 7-6v-4h9v4z" />
        </svg>
        <span
          v-else-if="card.rank === 'drawTwo'"
          class="font-[var(--font-display)] text-3xl font-black leading-none sm:text-4xl"
        >
          +2
        </span>
        <span
          v-else
          class="font-[var(--font-display)] text-4xl font-black leading-none sm:text-5xl"
        >
          {{ card.rank }}
        </span>
      </div>
    </div>
  </div>
</template>
