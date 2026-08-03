<script setup lang="ts">
const settings = useSettingsStore()

const label = computed(() => (
  settings.uiScale === 'large' ? 'Große Ansicht aktiv' : 'Kompakte Ansicht aktiv'
))

function toggleUiScale() {
  settings.setUiScale(settings.uiScale === 'large' ? 'compact' : 'large')
}
</script>

<template>
  <button
    type="button"
    class="inline-flex min-h-[var(--hit-min)] items-center gap-2 rounded-xl bg-white/70 px-3 font-bold text-[var(--color-ink)] ring-2 ring-[var(--color-wood)] transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    :aria-label="label"
    :aria-pressed="settings.uiScale === 'large'"
    @click="toggleUiScale"
  >
    <span aria-hidden="true">A<span class="text-lg">A</span></span>
    <span class="hidden sm:inline">{{ settings.uiScale === 'large' ? 'Groß' : 'Kompakt' }}</span>
  </button>
</template>
