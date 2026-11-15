<script setup lang="ts">
/** Sitting rabbit seen from the side, scarf in the player's colour. */
defineProps<{
  color: string
}>()
</script>

<template>
  <svg viewBox="0 0 64 64" class="block h-full w-full overflow-visible" aria-hidden="true">
    <ellipse cx="32" cy="59" rx="20" ry="4" fill="rgba(40,60,20,0.28)" />
    <!-- ears -->
    <path d="M30 22 C24 4 28 -2 33 2 C36 6 35 16 35 22 Z" fill="#efe6dc" stroke="#7d6a5a" stroke-width="1.6" />
    <path d="M31 18 C28 8 30 3 32.5 5 C34 8 33.5 14 33.5 18 Z" fill="#f4b8c0" />
    <path d="M37 23 C38 6 44 2 47 6 C49 11 44 18 41 24 Z" fill="#e6dbcf" stroke="#7d6a5a" stroke-width="1.6" />
    <!-- body -->
    <ellipse cx="27" cy="44" rx="18" ry="15" fill="#efe6dc" stroke="#7d6a5a" stroke-width="1.8" />
    <circle cx="10" cy="46" r="5.5" fill="#fff" stroke="#7d6a5a" stroke-width="1.4" />
    <ellipse cx="34" cy="56" rx="8" ry="3.6" fill="#e6dbcf" stroke="#7d6a5a" stroke-width="1.4" />
    <!-- head -->
    <ellipse cx="40" cy="30" rx="13" ry="11" fill="#efe6dc" stroke="#7d6a5a" stroke-width="1.8" />
    <circle cx="44" cy="27.5" r="2.4" fill="#2b2118" />
    <circle cx="44.8" cy="26.7" r="0.8" fill="#fff" />
    <ellipse cx="52.5" cy="31.5" rx="2" ry="1.6" fill="#e88a9a" />
    <path d="M50 35 Q52 37 54 35" fill="none" stroke="#7d6a5a" stroke-width="1.2" stroke-linecap="round" />
    <circle cx="46" cy="33.5" r="2.6" fill="#f6c4c4" opacity="0.7" />
    <!-- scarf -->
    <path d="M28 37 Q38 43 48 38 L49 42 Q38 48 27 41 Z" :fill="color" stroke="rgba(0,0,0,0.25)" stroke-width="1" />
    <path d="M30 40 L25 50 L30 49 L33 41 Z" :fill="color" stroke="rgba(0,0,0,0.25)" stroke-width="1" />
  </svg>
</template>
