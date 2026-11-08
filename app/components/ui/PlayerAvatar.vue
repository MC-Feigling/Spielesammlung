<script setup lang="ts">
/** Round avatar: animal picture for children, robot face for AI players. */
withDefaults(defineProps<{
  avatarId?: string
  isAi?: boolean
  color?: string
  size?: number
}>(), {
  avatarId: 'bear',
  isAi: false,
  color: '#3d8fd1',
  size: 40,
})
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-white"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <svg v-if="isAi" viewBox="0 0 62 62" :width="size * 0.9" :height="size * 0.9">
      <rect x="29" y="5" width="4" height="10" :fill="color" />
      <circle cx="31" cy="6" r="4.5" fill="#ffd23f" />
      <rect x="9" y="14" width="44" height="36" rx="11" :fill="color" />
      <rect x="16" y="22" width="30" height="15" rx="7" fill="#dff0ff" />
      <circle cx="24" cy="29.5" r="3.4" fill="#2b2118" />
      <circle cx="38" cy="29.5" r="3.4" fill="#2b2118" />
      <path d="M23 43 h16" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      <rect x="4" y="26" width="5" height="12" rx="2" :fill="color" />
      <rect x="53" y="26" width="5" height="12" rx="2" :fill="color" />
    </svg>
    <img v-else :src="`/avatars/${avatarId}.svg`" alt="" class="h-full w-full">
  </span>
</template>
