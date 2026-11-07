<script setup lang="ts">
import {
  formatRecoveryCode,
  generateRecoveryCode,
  hashPin,
  hashRecoveryCode,
  isValidPin,
  normalizePin,
} from '~/utils/pin'

const settings = useSettingsStore()

const pin = ref('')
const confirmPin = ref('')
const error = ref('')
const saving = ref(false)
const recoveryCode = ref<string | null>(null)

const emit = defineEmits<{
  close: []
}>()

async function submit() {
  error.value = ''
  const nextPin = normalizePin(pin.value)
  const nextConfirm = normalizePin(confirmPin.value)
  if (!isValidPin(nextPin)) {
    error.value = 'PIN muss 4–6 Ziffern haben.'
    return
  }
  if (nextPin !== nextConfirm) {
    error.value = 'PINs stimmen nicht überein.'
    return
  }

  saving.value = true
  try {
    const hash = await hashPin(nextPin)
    const code = generateRecoveryCode()
    settings.setParentalPinHash(hash, await hashRecoveryCode(code))
    recoveryCode.value = code
  } catch {
    error.value = 'PIN konnte nicht gespeichert werden.'
  } finally {
    saving.value = false
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
      @click.self="recoveryCode ? undefined : onCancel()"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="parental-setup-title"
        class="w-full max-w-md rounded-3xl bg-[var(--color-panel)] p-6 shadow-[0_8px_0_#9e3b24] ring-4 ring-[#dfbd8c]"
      >
        <template v-if="recoveryCode">
          <h2 id="parental-setup-title" class="font-[var(--font-display)] text-3xl font-semibold">
            Wiederherstellungscode
          </h2>
          <p class="mt-3 text-[var(--text-base)]">
            Schreibe diesen Code auf und bewahre ihn sicher auf. Wenn du die PIN vergisst, kannst du
            damit den Jugendschutz zurücksetzen. Er wird nur jetzt einmal angezeigt.
          </p>
          <p
            class="mt-5 rounded-2xl bg-white px-4 py-4 text-center font-mono text-3xl font-bold tracking-widest"
            data-testid="recovery-code"
          >
            {{ formatRecoveryCode(recoveryCode) }}
          </p>
          <AppButton class="mt-6" block @click="onCancel">Ich habe den Code notiert</AppButton>
        </template>

        <template v-else>
        <h2 id="parental-setup-title" class="font-[var(--font-display)] text-3xl font-semibold">
          Jugendschutz einrichten
        </h2>
        <p class="mt-3 text-[var(--text-base)]">
          Tägliches Limit: {{ settings.parental.dailyLimitMinutes }} Minuten. PIN nur für Eltern.
        </p>

        <label class="mt-5 block font-bold" for="setup-pin">PIN (4–6 Ziffern)</label>
        <input
          id="setup-pin"
          v-model="pin"
          class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          type="password"
        >

        <label class="mt-4 block font-bold" for="setup-pin-confirm">PIN bestätigen</label>
        <input
          id="setup-pin-confirm"
          v-model="confirmPin"
          class="mt-2 w-full rounded-2xl border-2 border-[#dfbd8c] bg-white px-4 py-3 text-lg tracking-widest"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
          type="password"
        >

        <p v-if="error" class="mt-3 font-bold text-[var(--color-accent)]" role="alert">{{ error }}</p>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <AppButton variant="ghost" @click="onCancel">Abbrechen</AppButton>
          <AppButton :disabled="saving" @click="submit">Aktivieren</AppButton>
        </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>
