<script setup lang="ts">
import { EXTRA_MINUTE_OPTIONS } from '~/features/parental/playtime'
import { verifyPin } from '~/utils/pin'
import type { ExtraMinutes } from '~/composables/usePlaytimeGuard'

const settings = useSettingsStore()

const pin = ref('')
const error = ref('')
const checking = ref(false)

const emit = defineEmits<{
  close: []
  unlock: [minutes: ExtraMinutes]
}>()

async function unlock(minutes: ExtraMinutes) {
  error.value = ''
  checking.value = true
  try {
    const hash = settings.parental.pinHash
    if (!hash || !(await verifyPin(pin.value, hash))) {
      error.value = 'PIN ist falsch.'
      return
    }
    emit('unlock', minutes)
  } catch {
    error.value = 'PIN-Prüfung fehlgeschlagen.'
  } finally {
    checking.value = false
  }
}

function onCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[70] grid place-items-center bg-[#2b2118]/55 p-4"
      role="presentation"
      @click.self="onCancel"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="parental-unlock-title"
        class="w-full max-w-md rounded-3xl bg-[var(--color-panel)] p-6 shadow-[0_8px_0_#9e3b24] ring-4 ring-[#dfbd8c]"
      >
        <h2 id="parental-unlock-title" class="font-[var(--font-display)] text-3xl font-semibold">
          Eltern entsperren
        </h2>
        <p class="mt-3 text-[var(--text-base)]">PIN eingeben und Extra-Zeit wählen.</p>

        <label class="mt-5 block font-bold" for="unlock-pin">PIN</label>
        <input
          id="unlock-pin"
          v-model="pin"
          class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
          inputmode="numeric"
          maxlength="6"
          autocomplete="current-password"
          type="password"
        >

        <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <AppButton
            v-for="minutes in EXTRA_MINUTE_OPTIONS"
            :key="minutes"
            :disabled="checking"
            @click="unlock(minutes)"
          >
            +{{ minutes }} Min.
          </AppButton>
        </div>

        <div class="mt-6">
          <AppButton variant="ghost" block @click="onCancel">Abbrechen</AppButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>
