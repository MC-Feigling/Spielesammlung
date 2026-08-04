# Jugendschutz: Tägliche Spielzeitbegrenzung

## Goal

Device-wide daily playtime limit for the Spielesammlung (kids game hub on a shared laptop). Parents set a PIN; when the limit is reached, play soft-stops with a warning and lock overlay.

## Decisions

| Topic | Choice |
| --- | --- |
| Limit type | Daily total only (no time windows) |
| Default limit | 45 minutes |
| Scope | Whole device — all profiles share one budget |
| Parent control | PIN required to change settings and grant extra time |
| Expiry behavior | Soft-stop: warn → countdown → pause/lock |
| Inactive until | PIN is set for the first time |

## Out of scope

- OS-level or hard security against localStorage edits
- Per-profile budgets
- Allowed time-of-day windows
- Cross-device sync
- Network / account auth

## Data model

Extend persisted settings (`STORAGE_SETTINGS` / `Settings`):

```ts
interface ParentalControls {
  pinHash: string | null
  dailyLimitMinutes: number // default 45
  usedMsToday: number
  dayKey: string // local calendar date YYYY-MM-DD
  extraMsToday: number
  warnAtMinutes: number // default 5
}

interface Settings {
  soundEnabled: boolean
  uiScale: UiScale
  parental: ParentalControls
}
```

Rules:

- PIN is stored only as a hash (SHA-256 of PIN string). Never plaintext.
- Effective budget for the day: `dailyLimitMinutes * 60_000 + extraMsToday`.
- Remaining: `effectiveBudget - usedMsToday` (clamped ≥ 0).
- On hydrate and on each tick: if `dayKey` ≠ today’s local date, reset `usedMsToday`, `extraMsToday`, and set `dayKey`.
- Parental feature is **inactive** while `pinHash === null` (no tracking, no lock).

### Defaults

```ts
const DEFAULT_PARENTAL: ParentalControls = {
  pinHash: null,
  dailyLimitMinutes: 45,
  usedMsToday: 0,
  dayKey: '', // set on first hydrate/tick to today
  extraMsToday: 0,
  warnAtMinutes: 5,
}
```

## Behavior

### Tracking

- Composable `usePlaytimeGuard` owns the tick loop.
- Every 1 second while `document.visibilityState === 'visible'` and parental is active: add elapsed ms to `usedMsToday` and persist.
- When the tab is hidden, ticking pauses (no time counted).
- Tracking runs app-wide (hub, lobby, play) once PIN is set — matches device-wide budget.

### Warning and soft-stop states

Derived state from remaining time:

1. **ok** — remaining > `warnAtMinutes`
2. **warn** — `0 < remaining ≤ warnAtMinutes` → show header rest-time hint (“Noch X Min.”)
3. **countdown** — remaining ≤ 0 just triggered → full-screen overlay with **10 second** countdown; game input blocked / paused
4. **locked** — after countdown → lock screen: “Spielzeit vorbei” + “Eltern entsperren”

Transitions:

- Entering `countdown` freezes further `usedMsToday` growth until unlocked (already at/over budget).
- If remaining ≤ 0 on hydrate/reload (budget already exhausted this session day), skip countdown and go straight to `locked`.
- Unlock with valid PIN + chosen extra time (`15 | 30 | 45` minutes) adds to `extraMsToday`, clears lock, resumes tracking.
- Mid-game: boards do not need per-game pause APIs for v1; global overlay blocks pointer/keyboard interaction. Session state remains in memory so play can continue after unlock.
- Persist a boolean `lockArmed` is unnecessary: lock is derived from remaining ≤ 0 while parental active; countdown is session-only UI state (not persisted).

### PIN flows

| Flow | UI | Rules |
| --- | --- | --- |
| First setup | `ParentalSetupDialog` | PIN 4–6 digits, confirm match, set `pinHash` |
| Unlock | `ParentalUnlockDialog` | Verify PIN → pick extra minutes → apply |
| Change limit / PIN / reset used time | Parental settings behind PIN | Require successful verify before mutate |

Failed PIN: show error, do not reveal whether hash exists; allow retry (no hard lockout in v1).

## UI

- Header (`default` layout): when parental active, show remaining time; entry “Jugendschutz” opens setup (if inactive) or PIN-gated settings (if active).
- `PlaytimeLockOverlay` mounted globally (`app.vue` or layout) for countdown + locked.
- Components under `app/components/parental/`.
- Visual language: existing wood / warm palette, Fredoka / Nunito — no new card clutter in hub hero; parental UI is dialogs/overlays only.

## Architecture

```
app.vue / layout
  └─ usePlaytimeGuard (tick + derived state)
       ├─ useSettingsStore.parental (persist)
       ├─ PlaytimeLockOverlay
       └─ ParentalSetupDialog / ParentalUnlockDialog / ParentalSettingsDialog
app/utils/pin.ts — hashPin, verifyPin
```

### File map

| File | Role |
| --- | --- |
| `app/types/profile.ts` | `ParentalControls`, extend `Settings` |
| `app/constants/storage.ts` | unchanged key (same `settings.v1`; schema additive) |
| `app/stores/settings.ts` | parental hydrate/persist/mutations |
| `app/composables/usePlaytimeGuard.ts` | visibility tick, day rollover, lock states |
| `app/utils/pin.ts` | SHA-256 hash + verify |
| `app/components/parental/*` | dialogs + overlay |
| `app/layouts/default.vue` | remaining time + Jugendschutz entry |
| `test/unit/playtime-guard.test.ts` | day reset, budget, extra time, warn thresholds |
| `test/unit/pin.test.ts` | hash/verify |

## Error handling

- Corrupt parental JSON → fall back to `DEFAULT_PARENTAL` (inactive).
- `crypto.subtle` unavailable → show setup error; do not store plaintext PIN.
- Persist failures → keep in-memory state; retry on next mutation.

## Testing

- Unit: dayKey rollover resets usage and extra.
- Unit: effective budget includes `extraMsToday`.
- Unit: warn / countdown / locked thresholds.
- Unit: PIN hash verify true/false.
- Light UI wiring test (source contains overlay + header entry) consistent with existing `app-shell-files` style tests.

## Success criteria

1. With PIN set, shared device budget defaults to 45 minutes/day.
2. Tab hidden → time does not count.
3. At 5 minutes left → header warning visible.
4. At 0 → 10s countdown overlay, then lock; interaction blocked.
5. Valid PIN can grant 15/30/45 extra minutes and resume.
6. Without PIN, app behaves as today (no tracking/lock).
