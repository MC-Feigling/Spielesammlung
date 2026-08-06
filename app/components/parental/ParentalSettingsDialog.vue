<script setup lang="ts">
import { isSuperPin, hashPin, isValidPin, normalizePin, verifyParentalAccess } from '~/utils/pin'

const settings = useSettingsStore()

const pin = ref('')
const unlocked = ref(false)
const unlockedViaSuper = ref(false)
const recoveryMode = ref(false)
const error = ref('')
const success = ref('')
const limitInput = ref(settings.parental.dailyLimitMinutes)
const newPin = ref('')
const newPinConfirm = ref('')
const busy = ref(false)

const emit = defineEmits<{
  close: []
}>()

async function verify() {
  error.value = ''
  success.value = ''
  busy.value = true
  try {
    const hash = settings.parental.pinHash
    const candidate = normalizePin(pin.value)
    if (!(await verifyParentalAccess(candidate, hash))) {
      error.value = recoveryMode.value
        ? 'Super-PIN ist falsch.'
        : 'PIN ist falsch.'
      return
    }

    unlockedViaSuper.value = isSuperPin(candidate)
    unlocked.value = true
    limitInput.value = settings.parental.dailyLimitMinutes

    if (recoveryMode.value && unlockedViaSuper.value) {
      settings.clearParentalControls()
      success.value = 'Jugendschutz zurückgesetzt. Neue PIN setzen oder schließen.'
    }
  } catch {
    error.value = 'PIN-Prüfung fehlgeschlagen.'
  } finally {
    busy.value = false
  }
}

function saveLimit() {
  settings.setDailyLimitMinutes(limitInput.value)
  success.value = 'Limit gespeichert.'
}

function resetToday() {
  settings.resetUsedToday()
  success.value = 'Heutige Spielzeit zurückgesetzt.'
}

function resetParental() {
  settings.clearParentalControls()
  success.value = 'Jugendschutz zurückgesetzt. Neue PIN setzen oder schließen.'
  unlockedViaSuper.value = true
}

async function changePin() {
  error.value = ''
  success.value = ''
  const nextPin = normalizePin(newPin.value)
  const nextConfirm = normalizePin(newPinConfirm.value)
  if (!isValidPin(nextPin)) {
    error.value = 'Neue PIN muss 4–6 Ziffern haben.'
    return
  }
  if (isSuperPin(nextPin)) {
    error.value = 'Super-PIN darf nicht als Eltern-PIN verwendet werden.'
    return
  }
  if (nextPin !== nextConfirm) {
    error.value = 'Neue PINs stimmen nicht überein.'
    return
  }
  busy.value = true
  try {
    const hash = await hashPin(nextPin)
    settings.setParentalPinHash(hash)
    newPin.value = ''
    newPinConfirm.value = ''
    unlockedViaSuper.value = false
    recoveryMode.value = false
    success.value = 'Neue PIN gespeichert.'
  } catch {
    error.value = 'PIN konnte nicht geändert werden.'
  } finally {
    busy.value = false
  }
}

function openRecovery() {
  recoveryMode.value = true
  unlocked.value = false
  unlockedViaSuper.value = false
  pin.value = ''
  error.value = ''
  success.value = ''
}

function cancelRecovery() {
  recoveryMode.value = false
  pin.value = ''
  error.value = ''
  success.value = ''
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
          <p class="mt-3 text-[var(--text-base)]">
            <template v-if="recoveryMode">
              Super-PIN eingeben, um den Jugendschutz zurückzusetzen.
            </template>
            <template v-else>
              Eltern-PIN eingeben.
            </template>
          </p>
          <label class="mt-5 block font-bold" for="settings-pin">
            {{ recoveryMode ? 'Super-PIN' : 'PIN' }}
          </label>
          <input
            id="settings-pin"
            v-model="pin"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
            inputmode="numeric"
            maxlength="6"
            type="password"
            autocomplete="one-time-code"
            @keyup.enter="verify"
          >
          <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>
          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <AppButton
              variant="ghost"
              @click="recoveryMode ? cancelRecovery() : onCancel()"
            >
              Abbrechen
            </AppButton>
            <AppButton :disabled="busy" @click="verify">
              {{ recoveryMode ? 'Zurücksetzen' : 'Weiter' }}
            </AppButton>
          </div>
          <button
            v-if="!recoveryMode"
            type="button"
            class="mt-4 w-full text-center text-sm font-bold text-[#6b4f3a] underline underline-offset-2"
            @click="openRecovery"
          >
            PIN vergessen?
          </button>
        </template>

        <template v-else>
          <p class="mt-3 text-[var(--text-base)]">
            <template v-if="unlockedViaSuper && !settings.isParentalActive">
              Jugendschutz ist aus. Neue PIN setzen oder schließen.
            </template>
            <template v-else>
              Tageslimit und PIN verwalten.
            </template>
          </p>
          <p
            v-if="unlockedViaSuper && settings.isParentalActive"
            class="mt-2 text-sm font-bold text-[#6b4f3a]"
          >
            Super-PIN erkannt — Wiederherstellung aktiv.
          </p>
          <p v-if="success" class="mt-3 font-bold text-[#2f6b3a]" role="status">{{ success }}</p>

          <template v-if="settings.isParentalActive">
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

            <AppButton
              v-if="unlockedViaSuper"
              class="mt-3"
              variant="secondary"
              block
              @click="resetParental"
            >
              Jugendschutz komplett zurücksetzen
            </AppButton>
          </template>

          <h3 class="mt-6 font-[var(--font-display)] text-xl font-semibold">
            {{ settings.isParentalActive ? 'PIN ändern' : 'Neue PIN setzen' }}
          </h3>
          <label class="mt-3 block font-bold" for="new-pin">Neue PIN</label>
          <input
            id="new-pin"
            v-model="newPin"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
            type="password"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
          >
          <label class="mt-3 block font-bold" for="new-pin-confirm">Neue PIN bestätigen</label>
          <input
            id="new-pin-confirm"
            v-model="newPinConfirm"
            class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
            type="password"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
          >
          <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>
          <AppButton class="mt-3" :disabled="busy" block @click="changePin">PIN speichern</AppButton>

          <AppButton class="mt-6" variant="ghost" block @click="onCancel">Schließen</AppButton>
        </template>
      </section>
    </div>
  </Teleport>
</template>
