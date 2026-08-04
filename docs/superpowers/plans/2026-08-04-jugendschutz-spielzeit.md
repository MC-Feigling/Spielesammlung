# Jugendschutz Playtime Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Device-wide daily 45-minute playtime budget with parent PIN, header warning, and soft-stop lock overlay.

**Architecture:** Extend `settings` store with `parental` state (localStorage). Pure helpers for day key, budget, and lock phase. `usePlaytimeGuard` ticks while the tab is visible. Global overlay blocks interaction when locked; PIN dialogs grant extra time.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, Pinia, TypeScript, Vitest (`bun run test`), localStorage, `crypto.subtle` SHA-256.

**Spec:** `docs/superpowers/specs/2026-08-04-jugendschutz-spielzeit-design.md`

## Global Constraints

- German UI copy; English code identifiers
- PIN: 4–6 digits only; store SHA-256 hash never plaintext
- Default limit 45 minutes; warn at 5 minutes; countdown 10 seconds
- Inactive while `pinHash === null`
- Device-wide budget (all profiles share one)
- Bun only (`bun run test`), work on branch `cursor/jugendschutz-spielzeit-ad54`
- Soft security only (localStorage); no OS lock

## File map

| File | Responsibility |
| --- | --- |
| `app/types/profile.ts` | `ParentalControls`, extend `Settings` |
| `app/features/parental/playtime.ts` | Pure: dayKey, budget, remaining, phase |
| `app/utils/pin.ts` | `hashPin`, `verifyPin` |
| `app/stores/settings.ts` | Parental hydrate/persist/mutations |
| `app/composables/usePlaytimeGuard.ts` | Visibility tick + session countdown state |
| `app/components/parental/PlaytimeLockOverlay.vue` | Countdown + lock UI |
| `app/components/parental/ParentalSetupDialog.vue` | First PIN setup |
| `app/components/parental/ParentalUnlockDialog.vue` | PIN + extra minutes |
| `app/components/parental/ParentalSettingsDialog.vue` | Change limit / PIN / reset usage |
| `app/layouts/default.vue` | Remaining time + Jugendschutz entry |
| `app/app.vue` | Mount guard + overlay |
| `test/unit/playtime.test.ts` | Pure playtime helpers |
| `test/unit/pin.test.ts` | Hash/verify |
| `test/unit/parental-settings.test.ts` | Load/migrate parental defaults |
| `test/unit/app-shell-files.test.ts` | Assert parental component files exist |

---

### Task 1: Pure playtime helpers

**Files:**
- Create: `app/features/parental/playtime.ts`
- Test: `test/unit/playtime.test.ts`

**Interfaces:**
- Produces:
  - `localDayKey(date?: Date): string`
  - `effectiveBudgetMs(limitMinutes: number, extraMs: number): number`
  - `remainingMs(budgetMs: number, usedMs: number): number`
  - `PlaytimePhase = 'inactive' | 'ok' | 'warn' | 'locked'`
  - `resolvePlaytimePhase(input: { active: boolean; remainingMs: number; warnAtMinutes: number }): PlaytimePhase`
  - Note: `countdown` is session UI only (not in `resolvePlaytimePhase`); phase `locked` when `remainingMs <= 0` and active

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  effectiveBudgetMs,
  localDayKey,
  remainingMs,
  resolvePlaytimePhase,
} from '../../app/features/parental/playtime'

describe('playtime helpers', () => {
  it('formats local day key as YYYY-MM-DD', () => {
    expect(localDayKey(new Date(2026, 7, 4, 23, 30))).toBe('2026-08-04')
  })

  it('computes budget including extra ms', () => {
    expect(effectiveBudgetMs(45, 15 * 60_000)).toBe(60 * 60_000)
  })

  it('clamps remaining at zero', () => {
    expect(remainingMs(1000, 1500)).toBe(0)
  })

  it('returns inactive when parental off', () => {
    expect(resolvePlaytimePhase({ active: false, remainingMs: 0, warnAtMinutes: 5 })).toBe('inactive')
  })

  it('returns warn within warn window', () => {
    expect(resolvePlaytimePhase({
      active: true,
      remainingMs: 4 * 60_000,
      warnAtMinutes: 5,
    })).toBe('warn')
  })

  it('returns locked at zero remaining', () => {
    expect(resolvePlaytimePhase({ active: true, remainingMs: 0, warnAtMinutes: 5 })).toBe('locked')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `bun run test test/unit/playtime.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helpers**

```ts
export type PlaytimePhase = 'inactive' | 'ok' | 'warn' | 'locked'

export function localDayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function effectiveBudgetMs(limitMinutes: number, extraMs: number): number {
  return Math.max(0, limitMinutes) * 60_000 + Math.max(0, extraMs)
}

export function remainingMs(budgetMs: number, usedMs: number): number {
  return Math.max(0, budgetMs - Math.max(0, usedMs))
}

export function resolvePlaytimePhase(input: {
  active: boolean
  remainingMs: number
  warnAtMinutes: number
}): PlaytimePhase {
  if (!input.active) return 'inactive'
  if (input.remainingMs <= 0) return 'locked'
  if (input.remainingMs <= input.warnAtMinutes * 60_000) return 'warn'
  return 'ok'
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `bun run test test/unit/playtime.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/features/parental/playtime.ts test/unit/playtime.test.ts
git commit -m "feat: add parental playtime pure helpers"
```

---

### Task 2: PIN hash utilities

**Files:**
- Create: `app/utils/pin.ts`
- Test: `test/unit/pin.test.ts`

**Interfaces:**
- Produces:
  - `isValidPin(pin: string): boolean` — `/^\d{4,6}$/`
  - `hashPin(pin: string): Promise<string>` — hex SHA-256
  - `verifyPin(pin: string, hash: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, verifyPin } from '../../app/utils/pin'

describe('pin utils', () => {
  it('accepts 4-6 digit pins only', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12')).toBe(false)
    expect(isValidPin('abcdef')).toBe(false)
  })

  it('hashes and verifies', async () => {
    const hash = await hashPin('1234')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(await verifyPin('1234', hash)).toBe(true)
    expect(await verifyPin('9999', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `bun run test test/unit/pin.test.ts`

- [ ] **Step 3: Implement**

```ts
const PIN_PATTERN = /^\d{4,6}$/

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin)
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new Error('Invalid PIN')
  if (!globalThis.crypto?.subtle) throw new Error('crypto.subtle unavailable')
  const data = new TextEncoder().encode(pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!isValidPin(pin) || !hash) return false
  const next = await hashPin(pin)
  return next === hash
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add app/utils/pin.ts test/unit/pin.test.ts
git commit -m "feat: add parental PIN hash helpers"
```

---

### Task 3: Settings types + parental store

**Files:**
- Modify: `app/types/profile.ts`
- Modify: `app/stores/settings.ts`
- Test: `test/unit/parental-settings.test.ts`

**Interfaces:**
- Produces on store:
  - `parental: Ref<ParentalControls>`
  - `isParentalActive: ComputedRef<boolean>`
  - `setParentalPinHash(hash: string): void`
  - `setDailyLimitMinutes(minutes: number): void`
  - `addExtraMsToday(ms: number): void`
  - `resetUsedToday(): void`
  - `addUsedMs(ms: number): void`
  - `ensureDayRollover(now?: Date): void`
- Consumes: `localDayKey` from playtime helpers

**Types to add in `profile.ts`:**

```ts
export interface ParentalControls {
  pinHash: string | null
  dailyLimitMinutes: number
  usedMsToday: number
  dayKey: string
  extraMsToday: number
  warnAtMinutes: number
}

export interface Settings {
  soundEnabled: boolean
  uiScale: UiScale
  parental: ParentalControls
}
```

Export `DEFAULT_PARENTAL` from settings store or a small constant file used by load():

```ts
export const DEFAULT_PARENTAL: ParentalControls = {
  pinHash: null,
  dailyLimitMinutes: 45,
  usedMsToday: 0,
  dayKey: '',
  extraMsToday: 0,
  warnAtMinutes: 5,
}
```

Load must merge partial parental safely (missing keys → defaults). Persist includes `parental`.

- [ ] **Step 1: Write failing tests** for pure load/merge helper extracted as `normalizeParental(raw: unknown): ParentalControls` in `app/features/parental/playtime.ts` or `app/features/parental/settings.ts`

Prefer `app/features/parental/normalize.ts`:

```ts
export function normalizeParental(raw: unknown): ParentalControls { /* ... */ }
```

Test: corrupt/partial → defaults; valid fields kept; invalid pinHash type → null.

- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement normalize + wire settings store**
- [ ] **Step 4: Run — PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: persist parental controls in settings store"
```

---

### Task 4: usePlaytimeGuard composable

**Files:**
- Create: `app/composables/usePlaytimeGuard.ts`
- Test: extend `test/unit/playtime.test.ts` OR pure functions for countdown session state in `app/features/parental/playtime.ts`:
  - `COUNTDOWN_SECONDS = 10`
  - `EXTRA_MINUTE_OPTIONS = [15, 30, 45] as const`

Logic in composable (client-only):
- On mount: `settings.ensureDayRollover()`, start `setInterval` 1s
- Tick: if inactive or `document.visibilityState !== 'visible'` or phase already locked → skip add; else `addUsedMs(elapsed)`
- Session refs: `countdownSecondsLeft: Ref<number | null>` — when transitioning ok/warn → locked while visible, set to 10 and decrement; on hydrate already locked → `null` and `showLock = true` immediately (skip countdown)
- Expose: `phase`, `remainingMs`, `remainingLabel`, `isInteractionBlocked` (countdown or locked), `openSetup`, dialog flags, `grantExtraMinutes(minutes)` after PIN verified by caller

Keep business logic testable: export `shouldSkipCountdownOnLoad(phase): boolean` → true when phase === 'locked'.

- [ ] **Step 1–5:** TDD for skip-countdown helper + implement composable; commit `feat: add playtime guard composable`

---

### Task 5: Parental UI components

**Files:**
- Create: `app/components/parental/PlaytimeLockOverlay.vue`
- Create: `app/components/parental/ParentalSetupDialog.vue`
- Create: `app/components/parental/ParentalUnlockDialog.vue`
- Create: `app/components/parental/ParentalSettingsDialog.vue`
- Modify: `test/unit/app-shell-files.test.ts` — add the four component paths

**UI rules:**
- Overlay: `fixed inset-0 z-[60]`, wood panel style, blocks clicks; Escape does nothing while locked
- Setup: two PIN inputs, confirm, call `hashPin` → `setParentalPinHash`
- Unlock: PIN + 15/30/45 buttons → `verifyPin` → `addExtraMsToday` → clear lock/countdown
- Settings: verify PIN first, then edit limit (number input min 5 max 240), change PIN, reset used today

- [ ] **Step 1:** Extend app-shell test with new files (will fail)
- [ ] **Step 2:** Create components
- [ ] **Step 3:** Tests pass
- [ ] **Step 4:** Commit `feat: add parental control dialogs and lock overlay`

---

### Task 6: Wire layout + app shell

**Files:**
- Modify: `app/layouts/default.vue` — remaining time badge when phase `ok`/`warn`; button „Jugendschutz“
- Modify: `app/app.vue` — `usePlaytimeGuard()`, mount `PlaytimeLockOverlay` + dialogs

Header hint copy:
- warn/ok: `Noch {minutes} Min.` (ceil remaining minutes, min 1 while remaining > 0)

- [ ] **Step 1:** Add source wiring assertions in `test/unit/final-review-ui.test.ts` or new `test/unit/parental-ui.test.ts`:
  - `default.vue` contains `Jugendschutz`
  - `app.vue` contains `PlaytimeLockOverlay`
- [ ] **Step 2:** Implement wiring
- [ ] **Step 3:** `bun run test` all green
- [ ] **Step 4:** Commit `feat: wire Jugendschutz playtime guard into app shell`

---

### Task 7: Final verification

- [ ] **Step 1:** `bun run test`
- [ ] **Step 2:** `bun run build` (if deps available)
- [ ] **Step 3:** Update PR description
- [ ] **Step 4:** Push branch

---

## Self-review

1. Spec coverage: daily 45, device-wide, PIN, soft-stop warn→countdown→lock, reload skips countdown, inactive without PIN — all tasked.
2. No placeholders.
3. Types consistent: `ParentalControls`, `PlaytimePhase`, store methods named above.
