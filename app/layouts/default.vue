<script setup lang="ts">
const {
  phase,
  remainingLabel,
  showCountdown,
  showLockScreen,
  countdownSecondsLeft,
  showSetup,
  showUnlock,
  showSettings,
  openJugendschutz,
  openUnlock,
  grantExtraMinutes,
} = usePlaytimeGuard()

const showRemaining = computed(() => phase.value === 'ok' || phase.value === 'warn')

const remainingClass = computed(() =>
  phase.value === 'warn'
    ? 'bg-[#fff1ce] text-[var(--color-accent)] ring-[var(--color-accent)]'
    : 'bg-white/70 text-[var(--color-ink)] ring-[var(--color-wood)]',
)

function onParentalRecovered() {
  showUnlock.value = false
  showSetup.value = true
}
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff6e8_0,_#f3e7d3_45%,_#e5cda9_100%)]">
    <header class="border-b-4 border-[#a46d36] bg-[var(--color-wood)] text-white shadow-[0_4px_0_#83552b]">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NuxtLink
          to="/"
          class="rounded-xl font-[var(--font-display)] text-2xl font-semibold tracking-wide transition hover:text-[#fff1ce] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Spielesammlung
        </NuxtLink>

        <nav aria-label="Hauptnavigation" class="order-3 flex w-full gap-2 sm:order-none sm:w-auto">
          <NuxtLink
            to="/"
            class="inline-flex min-h-[var(--hit-min)] flex-1 items-center justify-center rounded-xl px-4 font-bold transition hover:bg-white/15 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-none"
            active-class="bg-white/20"
            exact-active-class="bg-white/30"
          >
            Hub
          </NuxtLink>
          <NuxtLink
            to="/profiles"
            class="inline-flex min-h-[var(--hit-min)] flex-1 items-center justify-center rounded-xl px-4 font-bold transition hover:bg-white/15 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-none"
            active-class="bg-white/20"
          >
            Profile
          </NuxtLink>
        </nav>

        <div class="flex flex-wrap items-center gap-2">
          <p
            v-if="showRemaining"
            class="inline-flex min-h-[var(--hit-min)] items-center rounded-xl px-3 font-bold ring-2"
            :class="remainingClass"
            aria-live="polite"
          >
            {{ remainingLabel }}
          </p>

          <button
            type="button"
            class="inline-flex min-h-[var(--hit-min)] items-center rounded-xl bg-white/70 px-3 font-bold text-[var(--color-ink)] ring-2 ring-[var(--color-wood)] transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            @click="openJugendschutz"
          >
            Jugendschutz
          </button>

          <SoundToggle />
          <UiScaleToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <slot />
    </main>

    <PlaytimeLockOverlay
      v-if="!showUnlock"
      :show-countdown="showCountdown"
      :show-lock-screen="showLockScreen"
      :countdown-seconds="countdownSecondsLeft"
      @unlock="openUnlock"
    />

    <ParentalSetupDialog
      v-if="showSetup"
      @close="showSetup = false"
    />

    <ParentalUnlockDialog
      v-if="showUnlock"
      @close="showUnlock = false"
      @unlock="grantExtraMinutes"
      @recovered="onParentalRecovered"
    />

    <ParentalSettingsDialog
      v-if="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>
