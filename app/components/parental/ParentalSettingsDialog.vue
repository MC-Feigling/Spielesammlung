<script setup lang="ts">
import { hashPin, isValidPin, verifyPin } from '~/utils/pin'

const settings = useSettingsStore()

const pin = ref('')
const unlocked = ref(false)
const error = ref('')
const limitInput = ref(settings.parental.dailyLimitMinutes)
const newPin = ref('')
const newPinConfirm = ref('')
const busy = ref(false)

const emit = defineEmits<{
  close: []
}>()

async function verify() {
  error.value = ''
  busy.value = true
  try {
    const hash = settings.parental.pinHash
    if (!hash || !(await verifyPin(pin.value, hash))) {
      error.value = 'PIN ist falsch.'
      return
    }
    unlocked.value = true
    limitInput.value = settings.parental.dailyLimitMinutes
  } catch {
    error.value = 'PIN-Prüfung fehlgeschlagen.'
  } finally {
    busy.value = false
  }
}

function saveLimit() {
  settings.setDailyLimitMinutes(limitInput.value)
}

function resetToday() {
  settings.resetUsedToday()
}

async function changePin() {
  error.value = ''
  if (!isValidPin(newPin.value)) {
    error.value = 'Neue PIN muss 4–6 Ziffern haben.'
    return
  }
  if (newPin.value !== newPinConfirm.value) {
    error.value = 'Neue PINs stimmen nicht überein.'
    return
  }
  busy.value = true
  try {
    const hash = await hashPin(newPin.value)
    settings.setParentalPinHash(hash)
    newPin.value = ''
    newPinConfirm.value = ''
  } catch {
    error.value = 'PIN konnte nicht geändert werden.'
  } finally {
    busy.value = false
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
        aria-labelledby="parental-settings-title"
        class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[var(--color-panel)] p-6 shadow-[0_8px_0_#9e3b24] ring-4 ring-[#dfbd8c]"
      >
        <h2 id="parental-settings-title" class="font-[var(--font-display)] text-3xl font-semibold">
          Jugendschutz
        </h2>

        <template v-if="!unlocked">
          <p class="mt-3 text-[var(--text-base)]">Eltern-PIN eingeben.</p>
          <label class="mt-5 block font-bold" for="settings-pin">PIN</label>
          <input
            id="settings-pin"
            v-model="pin"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
            inputmode="numeric"
            maxlength="6"
            type="password"
            autocomplete="current-password"
          >
          <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>
          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <AppButton variant="ghost" @click="onCancel">Abbrechen</AppButton>
            <AppButton :disabled="busy" @click="verify">Weiter</AppButton>
          </div>
        </template>

        <template v-else>
          <p class="mt-3 text-[var(--text-base)]">Tageslimit und PIN verwalten.</p>

          <label class="mt-5 block font-bold" for="daily-limit">Tageslimit (Minuten)</label>
          <input
            id="daily-limit"
            v-model.number="limitInput"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg"
            type="number"
            min="5"
            max="240"
          >
          <AppButton class="mt-3" block @click="saveLimit">Limit speichern</AppButton>

          <AppButton class="mt-3" variant="secondary" block @click="resetToday">
            Heutige Spielzeit zurücksetzen
          </AppButton>

          <h3 class="mt-6 font-[var(--font-display)] text-xl font-semibold">PIN ändern</h3>
          <label class="mt-3 block font-bold" for="new-pin">Neue PIN</label>
          <input
            id="new-pin"
            v-model="newPin"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
            type="password"
            maxlength="6"
            inputmode="numeric"
          >
          <label class="mt-3 block font-bold" for="new-pin-confirm">Neue PIN bestätigen</label>
          <input
            id="new-pin-confirm"
            v-model="newPinConfirm"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
            type="password"
            maxlength="6"
            inputmode="numeric"
          >
          <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>
          <AppButton class="mt-3" :disabled="busy" block @click="changePin">PIN speichern</AppButton>

          <AppButton class="mt-6" variant="ghost" block @click="onCancel">Schließen</AppButton>
        </template>
      </section>
    </div>
  </Teleport>
</template>
