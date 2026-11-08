<script setup lang="ts">
import type { PartId, ToolId } from './catalog'

/** Large, recognisable illustration of a tool or part (viewBox 0 0 100 100). */
defineProps<{
  item: ToolId | PartId
  size?: number
}>()
</script>

<template>
  <svg :width="size ?? 84" :height="size ?? 84" viewBox="0 0 100 100" aria-hidden="true">
    <!-- tools -->
    <g v-if="item === 'hammer'" transform="rotate(-35 50 50)">
      <rect x="44" y="30" width="12" height="62" rx="5" fill="#b07a45" />
      <rect x="44" y="70" width="12" height="22" rx="5" fill="#e4572e" />
      <rect x="24" y="16" width="52" height="20" rx="5" fill="#8b929c" />
      <rect x="24" y="16" width="52" height="7" rx="3" fill="#b6bcc5" />
      <path d="M76 18 l14 -6 v28 l-14 -6z" fill="#8b929c" />
    </g>
    <g v-else-if="item === 'screwdriver'" transform="rotate(-35 50 50)">
      <rect x="40" y="56" width="20" height="38" rx="8" fill="#3d8fd1" />
      <rect x="44" y="60" width="4" height="30" rx="2" fill="#fff" opacity="0.5" />
      <rect x="47" y="14" width="6" height="44" fill="#b6bcc5" />
      <path d="M45 14 h10 l-3 -8 h-4z" fill="#8b929c" />
    </g>
    <g v-else-if="item === 'wrench'" transform="rotate(-40 50 50)">
      <rect x="44" y="30" width="12" height="62" rx="6" fill="#8b929c" />
      <rect x="47" y="40" width="3" height="44" rx="1.5" fill="#b6bcc5" />
      <path d="M38 12 A17 17 0 1 0 62 12" stroke="#8b929c" stroke-width="11" fill="none" stroke-linecap="round" />
      <circle cx="50" cy="91" r="6" fill="#6d737c" />
    </g>
    <g v-else-if="item === 'pliers'">
      <path d="M44 52 L30 92 L40 94 L50 58 Z" fill="#e4572e" />
      <path d="M56 52 L70 92 L60 94 L50 58 Z" fill="#c8402a" />
      <path d="M42 54 L36 14 L48 12 L52 52 Z" fill="#8b929c" />
      <path d="M58 54 L64 14 L52 12 L48 52 Z" fill="#a3a9b2" />
      <circle cx="50" cy="54" r="6" fill="#5c626b" />
    </g>
    <g v-else-if="item === 'paintbrush'" transform="rotate(-30 50 50)">
      <rect x="44" y="48" width="12" height="46" rx="6" fill="#b07a45" />
      <rect x="40" y="34" width="20" height="16" rx="3" fill="#b6bcc5" />
      <path d="M40 34 C40 20 44 10 50 6 C56 10 60 20 60 34 Z" fill="#e8c35a" />
      <path d="M40 34 C40 26 42 20 44 16 C48 22 54 22 58 18 C60 24 60 28 60 34 Z" fill="#3d8fd1" />
    </g>
    <g v-else-if="item === 'tape'">
      <path d="M40 78 H92 l-3 4 l3 4 l-3 4 l3 4 H40 Z" fill="#9aa7b4" />
      <circle cx="40" cy="50" r="34" fill="#8795a3" />
      <circle cx="40" cy="50" r="28" fill="#9aa7b4" />
      <circle cx="40" cy="50" r="16" fill="#e8dcc8" />
      <circle cx="40" cy="50" r="11" fill="#fff8ef" />
      <path d="M22 34 a24 24 0 0 1 20 -10" stroke="#c4ced8" stroke-width="4" fill="none" stroke-linecap="round" />
    </g>

    <!-- parts -->
    <g v-else-if="item === 'nail'">
      <rect x="47" y="22" width="6" height="56" fill="#9aa0a8" />
      <path d="M47 78 h6 l-3 12z" fill="#9aa0a8" />
      <rect x="36" y="14" width="28" height="9" rx="3" fill="#7d838c" />
    </g>
    <g v-else-if="item === 'screw'">
      <path d="M44 26 h12 v44 l-6 16 l-6 -16z" fill="#c9a43a" />
      <path v-for="i in 5" :key="`thread-${i}`" :d="`M44 ${24 + i * 8} l12 4`" stroke="#8a6e1f" stroke-width="2.5" />
      <ellipse cx="50" cy="22" rx="15" ry="6" fill="#d9b44a" />
      <path d="M42 22 h16" stroke="#8a6e1f" stroke-width="3" />
    </g>
    <g v-else-if="item === 'pipe'">
      <path d="M14 34 H58 A12 12 0 0 1 70 46 V88" stroke="#8b929c" stroke-width="16" fill="none" />
      <path d="M14 30 H58" stroke="#b6bcc5" stroke-width="4" fill="none" />
      <rect x="8" y="22" width="10" height="24" rx="3" fill="#6d737c" />
      <rect x="58" y="82" width="24" height="10" rx="3" fill="#6d737c" />
      <path d="M78 64 c0 6 -6 6 -6 0 c0 -4 3 -8 3 -8 c0 0 3 4 3 8z" fill="#3d8fd1" />
    </g>
    <g v-else-if="item === 'wire'">
      <path d="M12 70 C22 40 36 86 48 56 C58 32 70 74 82 44" stroke="#e4572e" stroke-width="8" fill="none" stroke-linecap="round" />
      <rect x="78" y="26" width="16" height="20" rx="4" fill="#2b2118" transform="rotate(20 86 36)" />
      <path d="M90 20 v-8 M96 22 v-8" stroke="#c9a43a" stroke-width="3" transform="rotate(20 86 36)" />
      <path d="M6 76 l6 -6 M4 70 l8 0" stroke="#d98b3a" stroke-width="3" stroke-linecap="round" />
    </g>
    <g v-else-if="item === 'paint'">
      <path d="M26 30 h48 v54 c0 6 -48 6 -48 0 z" fill="#c9ced6" />
      <rect x="26" y="44" width="48" height="26" fill="#4faf6a" />
      <ellipse cx="50" cy="30" rx="24" ry="7" fill="#e3e6ea" />
      <ellipse cx="50" cy="30" rx="18" ry="4.5" fill="#4faf6a" />
      <path d="M26 30 c-2 -14 46 -20 50 -2" stroke="#6d737c" stroke-width="2.5" fill="none" />
      <path d="M70 32 v10 c0 4 4 4 4 0 v-6" fill="#4faf6a" />
    </g>
    <g v-else-if="item === 'hinge'">
      <rect x="22" y="22" width="26" height="56" rx="4" fill="#b6bcc5" />
      <rect x="52" y="22" width="26" height="56" rx="4" fill="#a3a9b2" />
      <rect x="45" y="18" width="10" height="64" rx="5" fill="#7d838c" />
      <circle v-for="([x, y], i) in [[33, 36], [33, 64], [67, 36], [67, 64]]" :key="`hole-${i}`" :cx="x" :cy="y" r="4" fill="#5c626b" />
    </g>
  </svg>
</template>
