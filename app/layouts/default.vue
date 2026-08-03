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

        <div class="flex items-center gap-2">
          <SoundToggle />
          <UiScaleToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <slot />
    </main>
  </div>
</template>
