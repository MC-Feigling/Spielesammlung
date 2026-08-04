import {
  COUNTDOWN_SECONDS,
  effectiveBudgetMs,
  formatRemainingMinutesLabel,
  remainingMs as calcRemainingMs,
  resolvePlaytimePhase,
  type PlaytimePhase,
} from '~/features/parental/playtime'
import { useSettingsStore } from '~/stores/settings'

const EXTRA_MS = {
  15: 15 * 60_000,
  30: 30 * 60_000,
  45: 45 * 60_000,
} as const

export type ExtraMinutes = keyof typeof EXTRA_MS

export function usePlaytimeGuard() {
  const settings = useSettingsStore()

  const countdownSecondsLeft = ref<number | null>(null)
  const countdownStarted = ref(false)
  const showSetup = ref(false)
  const showUnlock = ref(false)
  const showSettings = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null
  let lastTickAt = 0

  const budgetMs = computed(() =>
    effectiveBudgetMs(settings.parental.dailyLimitMinutes, settings.parental.extraMsToday),
  )

  const remaining = computed(() =>
    calcRemainingMs(budgetMs.value, settings.parental.usedMsToday),
  )

  const phase = computed<PlaytimePhase>(() =>
    resolvePlaytimePhase({
      active: settings.isParentalActive,
      remainingMs: remaining.value,
      warnAtMinutes: settings.parental.warnAtMinutes,
    }),
  )

  const remainingLabel = computed(() => formatRemainingMinutesLabel(remaining.value))

  const isInteractionBlocked = computed(() => phase.value === 'locked')

  const showCountdown = computed(
    () => phase.value === 'locked'
      && countdownSecondsLeft.value !== null
      && countdownSecondsLeft.value > 0,
  )

  const showLockScreen = computed(
    () => phase.value === 'locked' && !showCountdown.value,
  )

  function tick() {
    if (!import.meta.client) return
    settings.ensureDayRollover()

    const now = Date.now()
    const elapsed = lastTickAt > 0 ? now - lastTickAt : 0
    lastTickAt = now

    const visible = document.visibilityState === 'visible'
    const canCount = settings.isParentalActive
      && visible
      && phase.value !== 'locked'
      && elapsed > 0

    if (canCount) {
      settings.addUsedMs(elapsed)
    }

    if (phase.value === 'locked') {
      if (!countdownStarted.value) {
        countdownStarted.value = true
        countdownSecondsLeft.value = COUNTDOWN_SECONDS
      } else if (
        countdownSecondsLeft.value !== null
        && countdownSecondsLeft.value > 0
        && visible
      ) {
        countdownSecondsLeft.value -= 1
        if (countdownSecondsLeft.value <= 0) {
          countdownSecondsLeft.value = null
        }
      }
    } else {
      countdownSecondsLeft.value = null
      countdownStarted.value = false
    }
  }

  function openJugendschutz() {
    if (!settings.isParentalActive) {
      showSetup.value = true
      return
    }
    showSettings.value = true
  }

  function openUnlock() {
    showUnlock.value = true
  }

  function grantExtraMinutes(minutes: ExtraMinutes) {
    settings.addExtraMsToday(EXTRA_MS[minutes])
    countdownSecondsLeft.value = null
    countdownStarted.value = false
    showUnlock.value = false
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') {
      lastTickAt = Date.now()
    }
  }

  function start() {
    if (!import.meta.client) return
    settings.ensureDayRollover()
    lastTickAt = Date.now()
    countdownStarted.value = false
    countdownSecondsLeft.value = null

    // Reload while already over budget: skip countdown, show lock immediately
    if (phase.value === 'locked') {
      countdownStarted.value = true
      countdownSecondsLeft.value = null
    }

    timer = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', onVisibility)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }

  onMounted(() => {
    start()
  })

  onBeforeUnmount(() => {
    stop()
  })

  return {
    phase,
    remainingMs: remaining,
    remainingLabel,
    isInteractionBlocked,
    showCountdown,
    showLockScreen,
    countdownSecondsLeft,
    showSetup,
    showUnlock,
    showSettings,
    openJugendschutz,
    openUnlock,
    grantExtraMinutes,
  }
}
