<script setup lang="ts">
const settings = useSettingsStore()

const label = computed(() => (settings.soundEnabled ? 'Ton an' : 'Ton aus'))

function toggleSound() {
  settings.setSoundEnabled(!settings.soundEnabled)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex min-h-[var(--hit-min)] items-center gap-2 rounded-xl bg-white/70 px-3 font-bold text-[var(--color-ink)] ring-2 ring-[var(--color-wood)] transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    :aria-label="label"
    :aria-pressed="settings.soundEnabled"
    @click="toggleSound"
  >
    <span aria-hidden="true">{{ settings.soundEnabled ? '🔊' : '🔇' }}</span>
    <span class="hidden sm:inline">{{ settings.soundEnabled ? 'Ton an' : 'Ton aus' }}</span>
  </button>
</template>
