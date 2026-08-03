<script setup lang="ts">
import { AVATARS, type AvatarId } from '~/constants/avatars'

const model = defineModel<AvatarId>({ required: true })
</script>

<template>
  <div role="radiogroup" aria-label="Avatar auswählen" class="grid grid-cols-3 gap-3 sm:grid-cols-6">
    <button
      v-for="avatar in AVATARS"
      :key="avatar.id"
      type="button"
      role="radio"
      :aria-checked="model === avatar.id"
      :aria-label="avatar.label"
      class="group flex min-h-[var(--hit-min)] flex-col items-center gap-1 rounded-2xl border-3 p-2 transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      :class="model === avatar.id
        ? 'border-[var(--color-accent)] bg-[#ffe2d6] shadow-[0_3px_0_#9e3b24]'
        : 'border-transparent bg-white/70 hover:border-[var(--color-wood)] hover:bg-white'"
      @click="model = avatar.id"
    >
      <img :src="avatar.src" alt="" class="h-12 w-12">
      <span class="text-sm font-bold">{{ avatar.label }}</span>
    </button>
  </div>
</template>
