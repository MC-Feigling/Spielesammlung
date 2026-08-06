<script setup lang="ts">
import { EXTRA_MINUTE_OPTIONS } from '~/features/parental/playtime'
import { isSuperPin, normalizePin, verifyParentalAccess } from '~/utils/pin'
import type { ExtraMinutes } from '~/composables/usePlaytimeGuard'

const settings = useSettingsStore()

const pin = ref('')
const error = ref('')
const checking = ref(false)
const recoveryMode = ref(false)

const emit = defineEmits<{
  close: []
  unlock: [minutes: ExtraMinutes]
  recovered: []
}>()

async function unlock(minutes: ExtraMinutes) {
  error.value = ''
  checking.value = true
  try {
    const hash = settings.parental.pinHash
    if (!(await verifyParentalAccess(pin.value, hash))) {
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

async function recoverWithSuperPin() {
  error.value = ''
  checking.value = true
  try {
    if (!isSuperPin(normalizePin(pin.value))) {
      error.value = 'Super-PIN ist falsch.'
      return
    }
    settings.clearParentalControls()
    emit('recovered')
  } catch {
    error.value = 'Zurücksetzen fehlgeschlagen.'
  } finally {
    checking.value = false
  }
}

function openRecovery() {
  recoveryMode.value = true
  pin.value = ''
  error.value = ''
}

function cancelRecovery() {
  recoveryMode.value = false
  pin.value = ''
  error.value = ''
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
          {{ recoveryMode ? 'PIN wiederherstellen' : 'Eltern entsperren' }}
        </h2>
        <p class="mt-3 text-[var(--text-base)]">
          <template v-if="recoveryMode">
            Super-PIN eingeben. Jugendschutz wird zurückgesetzt.
          </template>
          <template v-else>
            PIN eingeben und Extra-Zeit wählen.
          </template>
        </p>

        <label class="mt-5 block font-bold" for="unlock-pin">
          {{ recoveryMode ? 'Super-PIN' : 'PIN' }}
        </label>
        <input
          id="unlock-pin"
          v-model="pin"
          class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          type="password"
          @keyup.enter="recoveryMode ? recoverWithSuperPin() : undefined"
        >

        <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>

        <template v-if="recoveryMode">
          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <AppButton variant="ghost" @click="cancelRecovery">Abbrechen</AppButton>
            <AppButton :disabled="checking" @click="recoverWithSuperPin">
              Zurücksetzen
            </AppButton>
          </div>
        </template>
        <template v-else>
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

          <button
            type="button"
            class="mt-4 w-full text-center text-sm font-bold text-[#6b4f3a] underline underline-offset-2"
            @click="openRecovery"
          >
            PIN vergessen?
          </button>

          <div class="mt-6">
            <AppButton variant="ghost" block @click="onCancel">Abbrechen</AppButton>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>
