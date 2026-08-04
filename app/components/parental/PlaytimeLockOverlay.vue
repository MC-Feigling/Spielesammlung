<script setup lang="ts">
defineProps<{
  showCountdown: boolean
  showLockScreen: boolean
  countdownSeconds: number | null
}>()

const emit = defineEmits<{
  unlock: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showCountdown || showLockScreen"
      class="fixed inset-0 z-[60] grid place-items-center bg-[#2b2118]/75 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="playtime-lock-title"
      aria-describedby="playtime-lock-desc"
    >
      <section
        class="w-full max-w-lg rounded-3xl bg-[var(--color-panel)] p-8 text-center shadow-[0_8px_0_#9e3b24] ring-4 ring-[#dfbd8c]"
      >
        <template v-if="showCountdown">
          <h2 id="playtime-lock-title" class="font-[var(--font-display)] text-3xl font-semibold sm:text-4xl">
            Spielzeit ist um
          </h2>
          <p id="playtime-lock-desc" class="mt-3 text-[var(--text-base)]">
            Gleich Pause…
          </p>
          <p class="mt-6 font-[var(--font-display)] text-6xl font-semibold text-[var(--color-accent)]" aria-live="polite">
            {{ countdownSeconds }}
          </p>
        </template>

        <template v-else>
          <h2 id="playtime-lock-title" class="font-[var(--font-display)] text-3xl font-semibold sm:text-4xl">
            Spielzeit vorbei
          </h2>
          <p id="playtime-lock-desc" class="mt-3 text-[var(--text-base)]">
            Für heute ist Schluss. Eltern können Extra-Zeit freigeben.
          </p>
          <AppButton class="mt-8" @click="emit('unlock')">
            Eltern entsperren
          </AppButton>
        </template>
      </section>
    </div>
  </Teleport>
</template>
