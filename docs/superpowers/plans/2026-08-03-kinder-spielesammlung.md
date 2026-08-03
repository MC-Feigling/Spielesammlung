# Kinder-Spielesammlung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Local Nuxt 4 + Bun browser app: Memory, Kniffel, Mensch ärgere dich nicht — hot-seat + AI, profiles, child-friendly UI.

**Architecture:** Client-only Nuxt monolith (`ssr: false`). Pure TS game engines under `app/features/games/*`; Pinia for session/settings/profiles; localStorage persistence for profiles/settings; shared engine contract for human + AI.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Pinia (`@pinia/nuxt`), Vitest + `@nuxt/test-utils`, Bun (no npm).

**Spec:** `docs/superpowers/specs/2026-08-03-kinder-spielesammlung-design.md`  
**Project:** `PROJECT_INFO.md`

## Global Constraints

- Package manager: **Bun only** (never npm/yarn/pnpm)
- Target: elementaryOS laptop, local browser (`bun install` + `bun run dev`)
- UI language: **German**
- Kniffel Yahtzee category = **60** points; add categories Viele Augen (≥25 → 40), Wenig Augen (≤10 → 40); Chance stays
- One rule set per game; age adaptation = UI scale + hints only
- No backend, no auth, no online multiplayer
- Work on `dev` branch; feature commits in English (`feat:`, `fix:`, `test:`)
- Nuxt 4 app root: `app/` (pages, components, stores, composables, features)

---

## Phase 0: Documentation Discovery (complete)

### Allowed APIs / commands

| Area | Use | Source |
|------|-----|--------|
| Scaffold | `bun create nuxt@latest . --packageManager=bun` | https://nuxt.com/docs/4.x/getting-started/installation |
| Tailwind v4 | `bun add tailwindcss @tailwindcss/vite` + `vite.plugins` + `@import "tailwindcss"` | https://tailwindcss.com/docs/installation/framework-guides/nuxt |
| Pinia | `bunx nuxi@latest module add pinia` → `modules: ['@pinia/nuxt']`, stores in `app/stores/` | https://pinia.vuejs.org/ssr/nuxt.html |
| SPA | `ssr: false` in `nuxt.config.ts` | https://nuxt.com/docs/4.x/guide/concepts/rendering |
| Tests | Vitest projects; unit under `test/unit/` with `environment: 'node'` | https://nuxt.com/docs/4.x/getting-started/testing |
| Stores | `defineStore('id', () => { ... })` setup stores | Pinia Nuxt docs |

### Anti-patterns

- Do **not** use `create-nuxt-app` / `npm init nuxt-app`
- Do **not** use `@nuxtjs/tailwindcss` for this project (prefer official TW4 Vite plugin)
- Do **not** invent server routes or SQLite
- Do **not** set Kniffel Yahtzee points to 50

---

## File map

```
nuxt.config.ts
package.json
vitest.config.ts
PROJECT_INFO.md
public/sounds/{dice,match,hit,win}.wav   # short SFX placeholders OK
public/avatars/{bear,fox,owl,frog,cat,dog}.svg
app/
  app.vue
  assets/css/main.css
  assets/css/tokens.css
  pages/index.vue
  pages/profiles.vue
  pages/lobby/[game].vue
  pages/play/[game].vue
  layouts/default.vue
  components/ui/AppButton.vue
  components/ui/AppDialog.vue
  components/ui/TurnBanner.vue
  components/ui/AvatarPicker.vue
  components/ui/SoundToggle.vue
  components/ui/UiScaleToggle.vue
  components/ui/WinScreen.vue
  components/hub/GameCard.vue
  components/lobby/PlayerSeat.vue
  composables/useSound.ts
  composables/useAgeUi.ts
  composables/useHotSeat.ts
  stores/settings.ts
  stores/profiles.ts
  stores/session.ts
  types/game.ts
  types/profile.ts
  constants/games.ts
  constants/avatars.ts
  constants/storage.ts
  features/games/shared/engine.ts
  features/games/memory/engine.ts
  features/games/memory/ai.ts
  features/games/memory/MemoryBoard.vue
  features/games/kniffel/engine.ts
  features/games/kniffel/scoring.ts
  features/games/kniffel/ai.ts
  features/games/kniffel/KniffelBoard.vue
  features/games/ludo/engine.ts
  features/games/ludo/board.ts
  features/games/ludo/ai.ts
  features/games/ludo/LudoBoard.vue
test/unit/memory-engine.test.ts
test/unit/kniffel-scoring.test.ts
test/unit/ludo-engine.test.ts
```

---

### Task 1: Scaffold Nuxt 4 + Bun + SPA + Tailwind + Pinia + Vitest

**Files:**
- Create: project via CLI in repo root (`.`)
- Create/Modify: `nuxt.config.ts`, `app/assets/css/main.css`, `vitest.config.ts`, `package.json` scripts
- Keep existing: `docs/**`, `PROJECT_INFO.md`

**Interfaces:**
- Produces: runnable Nuxt 4 app with Bun, Pinia module, Tailwind v4, `ssr: false`, `bun test` for unit folder

- [ ] **Step 1: Ensure git + `dev` branch**

```bash
git init
git checkout -b dev
git add docs PROJECT_INFO.md
git commit -m "docs: add design spec and project info"
```

- [ ] **Step 2: Scaffold Nuxt in current directory**

```bash
bun create nuxt@latest . --packageManager=bun --no-modules --gitInit=false
```

If interactive prompts appear: TypeScript=yes, ESLint=optional no, Prettier=optional no, SPA or answer later (we force `ssr: false`).

- [ ] **Step 3: Add Tailwind v4 + Pinia + Vitest**

```bash
bun add tailwindcss @tailwindcss/vite
bunx nuxi@latest module add pinia
bun add -d @nuxt/test-utils vitest @vue/test-utils happy-dom
```

- [ ] **Step 4: Configure `nuxt.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['./app/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  pinia: {
    storesDirs: ['./app/stores/**'],
  },
})
```

- [ ] **Step 5: Create `app/assets/css/main.css`**

```css
@import "tailwindcss";
@import "./tokens.css";

html, body, #__nuxt {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-ui);
  background: var(--color-bg);
  color: var(--color-ink);
}
```

- [ ] **Step 6: Create `app/assets/css/tokens.css`**

```css
:root {
  --font-display: "Fredoka", "Trebuchet MS", sans-serif;
  --font-ui: "Nunito", "Trebuchet MS", sans-serif;
  --color-bg: #f3e7d3;
  --color-ink: #2b2118;
  --color-wood: #c48a4a;
  --color-felt: #3f6b4a;
  --color-accent: #d45d3a;
  --color-panel: #fff6e8;
  --hit-min: 48px;
}

[data-ui-scale="large"] {
  --text-base: 1.25rem;
  --hit-min: 56px;
}

[data-ui-scale="compact"] {
  --text-base: 1rem;
  --hit-min: 48px;
}
```

Load fonts via `app/app.vue` `useHead` Google Fonts link for Fredoka + Nunito (or self-host later).

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'unit',
    include: ['test/unit/**/*.{test,spec}.ts'],
    environment: 'node',
  },
})
```

Add script: `"test": "vitest run"` in `package.json`.

- [ ] **Step 8: Verify**

```bash
bun run dev
bun test
```

Expected: Nuxt starts; Vitest exits 0 with no tests or “no test files” OK until Task 5+.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Nuxt 4 app with Bun, Tailwind, Pinia"
```

---

### Task 2: Shared types, constants, stores (settings + profiles)

**Files:**
- Create: `app/types/game.ts`, `app/types/profile.ts`, `app/constants/games.ts`, `app/constants/avatars.ts`, `app/constants/storage.ts`
- Create: `app/stores/settings.ts`, `app/stores/profiles.ts`
- Test: `test/unit/profiles-store-logic.test.ts` (pure helpers if extracted) OR test localStorage helpers

**Interfaces:**
- Produces types/constants matching spec; `useSettingsStore`, `useProfilesStore`

- [ ] **Step 1: Create types**

`app/types/game.ts`:

```ts
export type GameId = 'memory' | 'kniffel' | 'ludo'
export type UiScale = 'large' | 'compact'
export type PlayerType = 'human' | 'ai'

export interface SessionPlayer {
  seatIndex: number
  type: PlayerType
  profileId?: string
  displayName: string
  avatarId: string
  color?: string
}
```

`app/types/profile.ts`:

```ts
import type { GameId } from './game'

export interface Profile {
  id: string
  name: string
  avatarId: string
  wins: Partial<Record<GameId, number>>
  favoriteGameId?: GameId
  createdAt: string
}

export interface Settings {
  soundEnabled: boolean
  uiScale: UiScale
}

import type { UiScale } from './game'
```

Fix import order: put `UiScale` import at top of `profile.ts`.

- [ ] **Step 2: Constants**

`app/constants/storage.ts`:

```ts
export const STORAGE_PROFILES = 'spielesammlung.profiles.v1'
export const STORAGE_SETTINGS = 'spielesammlung.settings.v1'
```

`app/constants/games.ts`:

```ts
import type { GameId } from '~/types/game'

export const GAMES: Array<{ id: GameId; title: string; blurb: string; minPlayers: number; maxPlayers: number }> = [
  { id: 'memory', title: 'Memory', blurb: 'Finde die Paare!', minPlayers: 2, maxPlayers: 4 },
  { id: 'kniffel', title: 'Kniffel', blurb: 'Würfle die besten Augen!', minPlayers: 2, maxPlayers: 4 },
  { id: 'ludo', title: 'Mensch ärgere dich nicht', blurb: 'Rauswerfen und ins Ziel!', minPlayers: 2, maxPlayers: 4 },
]

export function isGameId(value: string): value is GameId {
  return value === 'memory' || value === 'kniffel' || value === 'ludo'
}
```

`app/constants/avatars.ts`:

```ts
export const AVATARS = [
  { id: 'bear', label: 'Bär', src: '/avatars/bear.svg' },
  { id: 'fox', label: 'Fuchs', src: '/avatars/fox.svg' },
  { id: 'owl', label: 'Eule', src: '/avatars/owl.svg' },
  { id: 'frog', label: 'Frosch', src: '/avatars/frog.svg' },
  { id: 'cat', label: 'Katze', src: '/avatars/cat.svg' },
  { id: 'dog', label: 'Hund', src: '/avatars/dog.svg' },
] as const

export type AvatarId = (typeof AVATARS)[number]['id']
```

- [ ] **Step 3: Settings store**

`app/stores/settings.ts`:

```ts
import { STORAGE_SETTINGS } from '~/constants/storage'
import type { Settings, UiScale } from '~/types/profile'

const DEFAULTS: Settings = { soundEnabled: true, uiScale: 'large' }

function load(): Settings {
  if (!import.meta.client) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) as Partial<Settings> }
  } catch {
    return { ...DEFAULTS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const soundEnabled = ref(true)
  const uiScale = ref<UiScale>('large')

  function hydrate() {
    const s = load()
    soundEnabled.value = s.soundEnabled
    uiScale.value = s.uiScale
    if (import.meta.client) {
      document.documentElement.dataset.uiScale = uiScale.value
    }
  }

  function persist() {
    if (!import.meta.client) return
    const payload: Settings = { soundEnabled: soundEnabled.value, uiScale: uiScale.value }
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(payload))
    document.documentElement.dataset.uiScale = uiScale.value
  }

  function setSoundEnabled(value: boolean) {
    soundEnabled.value = value
    persist()
  }

  function setUiScale(value: UiScale) {
    uiScale.value = value
    persist()
  }

  return { soundEnabled, uiScale, hydrate, setSoundEnabled, setUiScale }
})
```

- [ ] **Step 4: Profiles store**

`app/stores/profiles.ts`:

```ts
import { STORAGE_PROFILES } from '~/constants/storage'
import type { GameId } from '~/types/game'
import type { Profile } from '~/types/profile'

function loadProfiles(): Profile[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES)
    if (!raw) return []
    return JSON.parse(raw) as Profile[]
  } catch {
    return []
  }
}

function saveProfiles(profiles: Profile[]) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_PROFILES, JSON.stringify(profiles))
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref<Profile[]>([])

  function hydrate() {
    profiles.value = loadProfiles()
  }

  function createProfile(input: { name: string; avatarId: string }): Profile {
    const name = input.name.trim()
    if (!name) throw new Error('Name erforderlich')
    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      avatarId: input.avatarId,
      wins: {},
      createdAt: new Date().toISOString(),
    }
    profiles.value = [...profiles.value, profile]
    saveProfiles(profiles.value)
    return profile
  }

  function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'avatarId' | 'favoriteGameId'>>) {
    profiles.value = profiles.value.map((p) => (p.id === id ? { ...p, ...patch } : p))
    saveProfiles(profiles.value)
  }

  function recordWin(profileId: string, gameId: GameId) {
    profiles.value = profiles.value.map((p) => {
      if (p.id !== profileId) return p
      const wins = { ...p.wins, [gameId]: (p.wins[gameId] ?? 0) + 1 }
      return { ...p, wins, favoriteGameId: topGame(wins) ?? p.favoriteGameId }
    })
    saveProfiles(profiles.value)
  }

  function topGame(wins: Partial<Record<GameId, number>>): GameId | undefined {
    const entries = (Object.entries(wins) as Array<[GameId, number]>).sort((a, b) => b[1] - a[1])
    return entries[0]?.[0]
  }

  return { profiles, hydrate, createProfile, updateProfile, recordWin }
})
```

- [ ] **Step 5: Unit test for `topGame` / win increment**

Extract `topGame` + pure `applyWin(profile, gameId)` to `app/features/profiles/wins.ts` and test that — keep store thin.

`app/features/profiles/wins.ts`:

```ts
import type { GameId } from '~/types/game'
import type { Profile } from '~/types/profile'

export function favoriteFromWins(wins: Partial<Record<GameId, number>>): GameId | undefined {
  const entries = (Object.entries(wins) as Array<[GameId, number]>).sort((a, b) => b[1] - a[1])
  return entries[0]?.[0]
}

export function withWin(profile: Profile, gameId: GameId): Profile {
  const wins = { ...profile.wins, [gameId]: (profile.wins[gameId] ?? 0) + 1 }
  return { ...profile, wins, favoriteGameId: favoriteFromWins(wins) }
}
```

Use `withWin` inside `recordWin`.

`test/unit/wins.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { favoriteFromWins, withWin } from '../../app/features/profiles/wins'
import type { Profile } from '../../app/types/profile'

const base: Profile = {
  id: '1',
  name: 'Mia',
  avatarId: 'fox',
  wins: {},
  createdAt: '2026-01-01',
}

describe('withWin', () => {
  it('increments wins and sets favorite', () => {
    const once = withWin(base, 'memory')
    expect(once.wins.memory).toBe(1)
    const twice = withWin(once, 'memory')
    const kniffel = withWin(twice, 'kniffel')
    expect(kniffel.favoriteGameId).toBe('memory')
    expect(favoriteFromWins({ kniffel: 5, memory: 1 })).toBe('kniffel')
  })
})
```

- [ ] **Step 6: Run tests**

```bash
bun test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add profile and settings stores with localStorage"
```

---

### Task 3: App shell UI (layout, hub, profiles, toggles)

**Files:**
- Create: UI components listed in file map, `app/layouts/default.vue`, pages `index.vue`, `profiles.vue`
- Create: simple SVG avatars under `public/avatars/`
- Modify: `app/app.vue`

**Interfaces:**
- Consumes: stores from Task 2, `GAMES`, `AVATARS`
- Produces: navigable Hub + Profiles; sound/UI-scale toggles persist

- [ ] **Step 1: `app/app.vue`**

```vue
<script setup lang="ts">
const settings = useSettingsStore()
const profiles = useProfilesStore()

onMounted(() => {
  settings.hydrate()
  profiles.hydrate()
})

useHead({
  title: 'Spielesammlung',
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@500;700&display=swap',
    },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 2: Default layout + toggles**

`AppButton.vue`: large min-height `var(--hit-min)`, German labels via props.  
`SoundToggle` / `UiScaleToggle`: call store setters.  
Layout header: title „Spielesammlung“, links Hub / Profile, toggles.

- [ ] **Step 3: Hub `pages/index.vue`**

Render `GameCard` per `GAMES` → `navigateTo(`/lobby/${game.id}`)`.  
Empty profiles hint: „Zuerst ein Profil anlegen“ → `/profiles`.

- [ ] **Step 4: Profiles page**

Create form: name + AvatarPicker; list profiles with wins; edit name/avatar.

- [ ] **Step 5: Manual check**

```bash
bun run dev
```

Reload browser: settings + profiles persist.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add hub, profiles, and shell UI"
```

---

### Task 4: Session store, lobby, sound, shared engine types

**Files:**
- Create: `app/stores/session.ts`, `app/pages/lobby/[game].vue`, `app/components/lobby/PlayerSeat.vue`
- Create: `app/composables/useSound.ts`, `app/composables/useAgeUi.ts`, `app/composables/useHotSeat.ts`
- Create: `app/features/games/shared/engine.ts`
- Create: placeholder WAVs or silent stubs in `public/sounds/`

**Interfaces:**
- Produces: `useSessionStore` with `startLobby`, `setSeat`, `beginPlay`, `endSession`
- Shared:

```ts
// app/features/games/shared/engine.ts
export type EngineResult<TState> = {
  state: TState
  winnerSeatIndexes: number[]
}

export interface GameEngine<TState, TAction> {
  getState: () => TState
  getValidActions: () => TAction[]
  applyAction: (action: TAction) => EngineResult<TState>
  isTerminal: () => boolean
}
```

- [ ] **Step 1: Implement session store**

Rules: 2–4 seats; each seat human (needs profileId) or ai; `beginPlay` navigates to `/play/${gameId}` only if ≥2 seats filled; quit clears session.

- [ ] **Step 2: Lobby page**

Validate `game` with `isGameId`; else redirect `/`.  
Seats 2–4; AI names „Robo-Bär“ etc.; Start button disabled until valid.

- [ ] **Step 3: `useSound`**

```ts
export function useSound() {
  const settings = useSettingsStore()
  function play(name: 'dice' | 'match' | 'hit' | 'win') {
    if (!import.meta.client || !settings.soundEnabled) return
    const audio = new Audio(`/sounds/${name}.wav`)
    void audio.play().catch(() => {})
  }
  return { play }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add lobby session flow and sound helper"
```

---

### Task 5: Memory engine + tests + AI + UI

**Files:**
- Create: `app/features/games/memory/engine.ts`, `ai.ts`, `MemoryBoard.vue`
- Create: `test/unit/memory-engine.test.ts`
- Modify: `app/pages/play/[game].vue` (route Memory)

**Interfaces:**
- `createMemoryGame({ playerCount, rows, cols, seed? })`
- Actions: `{ type: 'flip'; cardIndex: number }`
- Grid must be even cell count; default 4×3 or 4×4 from lobby option

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { createMemoryGame } from '../../app/features/games/memory/engine'

describe('memory engine', () => {
  it('rejects odd cell counts', () => {
    expect(() => createMemoryGame({ playerCount: 2, rows: 3, cols: 3 })).toThrow()
  })

  it('matches pair and grants another turn', () => {
    const game = createMemoryGame({ playerCount: 2, rows: 2, cols: 2, deck: [0, 0, 1, 1] })
    game.applyAction({ type: 'flip', cardIndex: 0 })
    const r = game.applyAction({ type: 'flip', cardIndex: 1 })
    expect(r.state.matchedPairIds).toContain(0)
    expect(r.state.currentPlayerIndex).toBe(0)
  })

  it('switches player on mismatch after resolve', () => {
    const game = createMemoryGame({ playerCount: 2, rows: 2, cols: 2, deck: [0, 1, 0, 1] })
    game.applyAction({ type: 'flip', cardIndex: 0 })
    game.applyAction({ type: 'flip', cardIndex: 1 })
    game.applyAction({ type: 'resolveMismatch' })
    expect(game.getState().currentPlayerIndex).toBe(1)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test test/unit/memory-engine.test.ts
```

- [ ] **Step 3: Implement engine + AI**

AI: remember seen face-up cards; if known pair available flip those; else random unknown.

- [ ] **Step 4: UI**

`MemoryBoard.vue`: big cards, turn banner, grid select in lobby for memory only.  
On AI turn: `setTimeout` chain applying AI actions + sounds.

- [ ] **Step 5: Tests PASS + commit**

```bash
bun test
git add -A
git commit -m "feat: add Memory game with AI"
```

---

### Task 6: Kniffel scoring + engine + tests + AI + UI

**Files:**
- Create: `app/features/games/kniffel/scoring.ts`, `engine.ts`, `ai.ts`, `KniffelBoard.vue`
- Create: `test/unit/kniffel-scoring.test.ts`

**Interfaces — categories (exact ids):**

```ts
export type KniffelCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'threeOfKind' | 'fourOfKind' | 'fullHouse'
  | 'smallStraight' | 'largeStraight'
  | 'kniffel' | 'chance'
  | 'manyPips'   // ≥25 → 40
  | 'fewPips'    // ≤10 → 40
```

Scoring rules (must match tests):
- `kniffel`: five equal → **60**, else 0
- `manyPips`: sum ≥ 25 → **40**, else 0
- `fewPips`: sum ≤ 10 → **40**, else 0
- `chance`: sum
- Classic formulas for rest (German Kniffel: Full House 25, small straight 30, large 40; 3/4-kind = sum if qualified)

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { scoreCategory } from '../../app/features/games/kniffel/scoring'

describe('kniffel scoring', () => {
  it('scores kniffel as 60', () => {
    expect(scoreCategory('kniffel', [6, 6, 6, 6, 6])).toBe(60)
    expect(scoreCategory('kniffel', [6, 6, 6, 6, 5])).toBe(0)
  })

  it('scores manyPips and fewPips as 40', () => {
    expect(scoreCategory('manyPips', [6, 6, 6, 6, 1])).toBe(40) // sum 25
    expect(scoreCategory('manyPips', [6, 6, 6, 5, 1])).toBe(0) // sum 24
    expect(scoreCategory('fewPips', [1, 1, 1, 1, 1])).toBe(40) // sum 5
    expect(scoreCategory('fewPips', [2, 2, 2, 2, 2])).toBe(40) // sum 10
    expect(scoreCategory('fewPips', [3, 2, 2, 2, 2])).toBe(0) // sum 11
  })

  it('chance is sum', () => {
    expect(scoreCategory('chance', [1, 2, 3, 4, 5])).toBe(15)
  })
})
```

- [ ] **Step 2: Implement `scoring.ts` + engine**

Engine: 5 dice, holds, max 3 rolls, then must score unused category; next player; game ends when all categories filled for all players; winner highest total.

- [ ] **Step 3: AI**

Prefer kniffel if available; else best positive `scoreCategory` among open categories; else strike lowest opportunity.

- [ ] **Step 4: UI + wire play page**

German labels: „Viele Augen (≥25)“, „Wenig Augen (≤10)“, „Kniffel“.

- [ ] **Step 5: Tests + commit**

```bash
bun test
git add -A
git commit -m "feat: add Kniffel with custom score categories"
```

---

### Task 7: Ludo (Mensch ärgere dich nicht) engine + tests + AI + UI

**Files:**
- Create: `app/features/games/ludo/board.ts`, `engine.ts`, `ai.ts`, `LudoBoard.vue`
- Create: `test/unit/ludo-engine.test.ts`

**Board model (keep simple):**
- 40 ring fields (0–39), 4 start indexes (0,10,20,30), 4 home yards per color (4 pieces)
- Enter ring only on roll **6** from yard
- Capture: land on opponent → send to yard (`hit` sound)
- Extra turn on 6
- Win: all 4 pieces in home stretch complete

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { createLudoGame } from '../../app/features/games/ludo/engine'

describe('ludo engine', () => {
  it('cannot enter without rolling 6', () => {
    const game = createLudoGame({ playerCount: 2, seed: 1 })
    game.applyAction({ type: 'roll', forcedValue: 5 })
    const moves = game.getValidActions().filter((a) => a.type === 'move')
    expect(moves.every((m) => m.from !== 'yard')).toBe(true)
  })

  it('enters on 6', () => {
    const game = createLudoGame({ playerCount: 2, seed: 1 })
    game.applyAction({ type: 'roll', forcedValue: 6 })
    const enter = game.getValidActions().find((a) => a.type === 'move' && a.from === 'yard')
    expect(enter).toBeTruthy()
  })

  it('captures opponent on same field', () => {
    // construct state via test helper setPiecePositions
    // expect opponent piece back in yard after move
  })
})
```

Implement `setPiecePositions` **only in test helper** exported as `__testing` or `createLudoGameFromState` for tests — do not expose in UI.

- [ ] **Step 2: Implement board + engine + AI**

AI priority: capture → move into home → enter from yard → advance farthest piece.

- [ ] **Step 3: UI**

Colorful board SVG/CSS grid; animate step; TurnBanner; dice button.

- [ ] **Step 4: Tests + commit**

```bash
bun test
git add -A
git commit -m "feat: add Mensch aerger dich nicht with AI"
```

---

### Task 8: Play router, win screen, polish, README

**Files:**
- Modify: `app/pages/play/[game].vue` — switch Memory/Kniffel/Ludo
- Create: `app/components/ui/WinScreen.vue`, `TurnBanner.vue`
- Create/Modify: `README.md` (Bun on elementaryOS)
- Update: `PROJECT_INFO.md` with run commands

**Interfaces:**
- On terminal: show WinScreen → `recordWin` for human winners with `profileId` → Hub
- Quit: `AppDialog` „Wirklich abbrechen?“

- [ ] **Step 1: Wire win/quit + favoriteGameId updates**
- [ ] **Step 2: README**

```md
# Spielesammlung
## Voraussetzungen
- Bun
- Browser (Firefox/Chrome)
## Start
bun install
bun run dev
```

- [ ] **Step 3: Manual checklist**
  - [ ] 2 humans Memory complete
  - [ ] Kniffel custom scores visible + 60 for Kniffel
  - [ ] Ludo AI game completes
  - [ ] Mute works
  - [ ] Profiles survive reload
  - [ ] UI scale large/compact

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: polish play flow, win screen, and README"
```

---

## Final Phase: Verification

- [ ] **V1:** `rg "scoreCategory\\('kniffel'" -n` / read scoring — Kniffel returns 60
- [ ] **V2:** `rg "npm " package.json` — no npm scripts required; packageManager bun
- [ ] **V3:** `bun test` — all unit tests green
- [ ] **V4:** `bun run build` — production build succeeds
- [ ] **V5:** Spec coverage check vs `docs/superpowers/specs/2026-08-03-kinder-spielesammlung-design.md` (all MVP bullets)

### Spec coverage map

| Spec item | Task |
|-----------|------|
| Hub / Lobby / Play / Profiles routes | 3, 4, 8 |
| Profiles + wins + favorite | 2, 8 |
| Settings sound + uiScale | 2, 3 |
| Memory | 5 |
| Kniffel custom scores | 6 |
| Ludo | 7 |
| Hot-seat + AI | 4–7 |
| local only / Bun | 1, 8 |
| No backend | all |

---

## Self-review notes (author)

- Placeholders removed: capture test in Task 7 must be completed by implementer using `createLudoGameFromState` — define that helper in Step 2 of Task 7 before writing the capture assertion.
- Types: `GameId`, `KniffelCategory`, `SessionPlayer` consistent across tasks.
- Gap closed: extract `withWin` tested in Task 2.
