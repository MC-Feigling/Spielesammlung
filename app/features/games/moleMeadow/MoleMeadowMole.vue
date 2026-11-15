<script setup lang="ts">
/** Mole peeking out of a hole; `peek` false shows only the dirt hole. */
withDefaults(defineProps<{
  peek?: boolean
}>(), {
  peek: true,
})
</script>

<template>
  <svg viewBox="0 0 64 48" class="block h-full w-full overflow-visible" aria-hidden="true">
    <ellipse cx="32" cy="38" rx="28" ry="9" fill="#6b4a2b" />
    <ellipse cx="32" cy="38" rx="21" ry="6" fill="#1f130a" />
    <g v-if="peek">
      <path d="M17 38 C16 20 22 10 32 10 C42 10 48 20 47 38 Z" fill="#5d5550" stroke="#2f2925" stroke-width="1.6" />
      <circle cx="26" cy="22" r="2" fill="#111" />
      <circle cx="38" cy="22" r="2" fill="#111" />
      <ellipse cx="32" cy="29" rx="5.5" ry="4" fill="#f08aa0" stroke="#b9566d" stroke-width="1" />
      <path d="M22 30 L12 28 M22 32 L12 33 M42 30 L52 28 M42 32 L52 33" stroke="#2f2925" stroke-width="1" />
      <path d="M17 37 Q14 32 20 31 Q22 34 21 38 Z M47 37 Q50 32 44 31 Q42 34 43 38 Z" fill="#f2b6b0" stroke="#b97a72" stroke-width="1" />
    </g>
    <path d="M6 37 Q10 30 18 34 Q24 30 30 34 Q38 30 44 34 Q52 30 58 37" fill="none" stroke="#8a6440" stroke-width="3" stroke-linecap="round" />
  </svg>
</template>
