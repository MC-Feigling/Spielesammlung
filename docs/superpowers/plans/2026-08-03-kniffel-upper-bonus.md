# Kniffel Upper Bonus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add classic Kniffel upper-section bonus (Summe oben ≥ 63 → +35) to scoring helpers, winner totals, and the score block UI.

**Architecture:** Pure helpers in `scoring.ts` (`upperSum`, `upperBonus`, `totalScore`). Engine winner calculation and `KniffelBoard.vue` both consume these helpers. Bonus is never a scoreable category.

**Tech Stack:** TypeScript, Vue 3, Vitest, Bun

## Global Constraints

- Bun only (`bun run test`, no npm/pnpm/yarn)
- TypeScript strict, no `any`
- German UI labels
- Work on `dev` branch
- Spec: `docs/superpowers/specs/2026-08-03-kniffel-upper-bonus-design.md`
- `UPPER_BONUS_THRESHOLD = 63`, `UPPER_BONUS_POINTS = 35`

## File Structure

| File | Responsibility |
|------|----------------|
| `app/features/games/kniffel/scoring.ts` | Upper helpers + constants |
| `app/features/games/kniffel/engine.ts` | Winner totals via `totalScore` |
| `app/features/games/kniffel/KniffelBoard.vue` | Summe oben / Bonus rows + Gesamt |
| `test/unit/kniffel-scoring.test.ts` | Helper unit tests |
| `test/unit/kniffel-engine.test.ts` | Winner wiring + bonus totals |
| `test/unit/final-review-ui.test.ts` | UI row assertions |

---

### Task 1: Upper bonus scoring helpers

**Files:**
- Modify: `app/features/games/kniffel/scoring.ts`
- Modify: `test/unit/kniffel-scoring.test.ts`

**Interfaces:**
- Consumes: existing `KniffelCategory`, `KNIFFEL_CATEGORIES`
- Produces:
  - `export const UPPER_CATEGORIES: readonly KniffelCategory[]`
  - `export const UPPER_BONUS_THRESHOLD = 63`
  - `export const UPPER_BONUS_POINTS = 35`
  - `export function upperSum(scoreSheet: Partial<Record<KniffelCategory, number>>): number`
  - `export function upperBonus(scoreSheet: Partial<Record<KniffelCategory, number>>): number`
  - `export function totalScore(scoreSheet: Partial<Record<KniffelCategory, number>>): number`

- [ ] **Step 1: Write the failing tests**

Update import and append describe in `test/unit/kniffel-scoring.test.ts`:

```ts
import {
  scoreCategory,
  totalScore,
  upperBonus,
  upperSum,
} from '../../app/features/games/kniffel/scoring'

describe('kniffel upper bonus', () => {
  it('sums only upper categories', () => {
    expect(upperSum({
      ones: 3,
      twos: 6,
      threes: 9,
      chance: 20,
    })).toBe(18)
  })

  it('returns zero bonus below 63', () => {
    const sheet = {
      ones: 5,
      twos: 10,
      threes: 15,
      fours: 16,
      fives: 10,
      sixes: 6,
    }
    expect(upperSum(sheet)).toBe(62)
    expect(upperBonus(sheet)).toBe(0)
  })

  it('returns 35 bonus at or above 63', () => {
    const sheet = {
      ones: 5,
      twos: 10,
      threes: 15,
      fours: 16,
      fives: 15,
      sixes: 6,
    }
    expect(upperSum(sheet)).toBe(67)
    expect(upperBonus(sheet)).toBe(35)
  })

  it('includes bonus in totalScore', () => {
    const sheet = {
      ones: 5,
      twos: 10,
      threes: 15,
      fours: 16,
      fives: 15,
      sixes: 6,
      kniffel: 60,
    }
    expect(totalScore(sheet)).toBe(67 + 35 + 60)
  })

  it('totalScore without bonus equals category sum', () => {
    expect(totalScore({ ones: 3, chance: 12 })).toBe(15)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test test/unit/kniffel-scoring.test.ts`

Expected: FAIL — `upperSum` / `upperBonus` / `totalScore` not exported

- [ ] **Step 3: Implement helpers in scoring.ts**

Add after `KNIFFEL_CATEGORY_LABELS`:

```ts
export const UPPER_CATEGORIES: readonly KniffelCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
]

export const UPPER_BONUS_THRESHOLD = 63
export const UPPER_BONUS_POINTS = 35

export function upperSum(scoreSheet: Partial<Record<KniffelCategory, number>>): number {
  return UPPER_CATEGORIES.reduce((sum, category) => sum + (scoreSheet[category] ?? 0), 0)
}

export function upperBonus(scoreSheet: Partial<Record<KniffelCategory, number>>): number {
  return upperSum(scoreSheet) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0
}

export function totalScore(scoreSheet: Partial<Record<KniffelCategory, number>>): number {
  const categoryTotal = Object.values(scoreSheet).reduce((sum, score) => sum + (score ?? 0), 0)
  return categoryTotal + upperBonus(scoreSheet)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test test/unit/kniffel-scoring.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/features/games/kniffel/scoring.ts test/unit/kniffel-scoring.test.ts
git commit -m "feat: add Kniffel upper bonus scoring helpers"
```

---

### Task 2: Engine winner totals include bonus

**Files:**
- Modify: `app/features/games/kniffel/engine.ts`
- Modify: `test/unit/kniffel-engine.test.ts`

**Interfaces:**
- Consumes: `totalScore` from `./scoring`
- Produces: `winnerSeatIndexes()` uses `totalScore(scoreSheet)`

- [ ] **Step 1: Write the failing tests**

Append to `test/unit/kniffel-engine.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { totalScore } from '../../app/features/games/kniffel/scoring'

it('includes upper bonus when comparing player totals', () => {
  const withBonus = { ones: 5, twos: 10, threes: 15, fours: 16, fives: 15, sixes: 6 }
  const withoutBonus = { ones: 5, twos: 10, threes: 15, fours: 16, fives: 10, sixes: 6, chance: 35 }
  expect(totalScore(withBonus)).toBe(102)
  expect(totalScore(withoutBonus)).toBe(97)
})

it('wires winnerSeatIndexes through totalScore', () => {
  const source = readFileSync(resolve('app/features/games/kniffel/engine.ts'), 'utf8')
  expect(source).toMatch(/totalScore\(/)
  expect(source).not.toMatch(/Object\.values\(scoreSheet\)\.reduce/)
})
```

- [ ] **Step 2: Run tests to verify wiring assertion fails**

Run: `bun run test test/unit/kniffel-engine.test.ts`

Expected: FAIL on `wires winnerSeatIndexes through totalScore`

- [ ] **Step 3: Update engine.ts**

Change import:

```ts
import { KNIFFEL_CATEGORIES, type KniffelCategory, scoreCategory, totalScore } from './scoring'
```

Replace `winnerSeatIndexes` body:

```ts
function winnerSeatIndexes() {
  if (!isTerminal()) return []

  const totals = state.scoreSheets.map((scoreSheet) => totalScore(scoreSheet))
  const highestTotal = Math.max(...totals)
  return totals.flatMap((total, index) => total === highestTotal ? [index] : [])
}
```

- [ ] **Step 4: Run tests**

Run: `bun run test test/unit/kniffel-engine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/features/games/kniffel/engine.ts test/unit/kniffel-engine.test.ts
git commit -m "feat: count Kniffel upper bonus in winners"
```

---

### Task 3: Score block UI — Summe oben + Bonus

**Files:**
- Modify: `app/features/games/kniffel/KniffelBoard.vue`
- Modify: `test/unit/final-review-ui.test.ts`

**Interfaces:**
- Consumes: `UPPER_CATEGORIES`, `upperSum`, `upperBonus`, `totalScore` from `./scoring`
- Produces: table order = upper categories → Summe oben → Bonus → lower categories → Gesamt

- [ ] **Step 1: Write failing UI source tests**

In `test/unit/final-review-ui.test.ts`, add:

```ts
it('shows Kniffel Summe oben and Bonus rows', () => {
  const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
  expect(kniffelBoard).toContain('Summe oben')
  expect(kniffelBoard).toContain('Bonus (+35 ab 63)')
  expect(kniffelBoard).toContain('upperSum')
  expect(kniffelBoard).toContain('upperBonus')
  expect(kniffelBoard).toContain('totalScore')
})
```

- [ ] **Step 2: Run to verify fail**

Run: `bun run test test/unit/final-review-ui.test.ts`

Expected: FAIL — missing strings

- [ ] **Step 3: Update KniffelBoard.vue**

Update imports:

```ts
import {
  KNIFFEL_CATEGORIES,
  KNIFFEL_CATEGORY_LABELS,
  UPPER_CATEGORIES,
  type KniffelCategory,
  totalScore,
  upperBonus,
  upperSum,
} from './scoring'
```

Replace totals and add helpers:

```ts
const playerTotals = computed(() => state.value.scoreSheets.map((scoreSheet) => totalScore(scoreSheet)))
const playerUpperSums = computed(() => state.value.scoreSheets.map((scoreSheet) => upperSum(scoreSheet)))
const playerUpperBonuses = computed(() => state.value.scoreSheets.map((scoreSheet) => upperBonus(scoreSheet)))
const lowerCategories = computed(() =>
  KNIFFEL_CATEGORIES.filter((category) => !UPPER_CATEGORIES.includes(category)),
)
```

Replace tbody:

```vue
<tbody>
  <tr v-for="category in UPPER_CATEGORIES" :key="category" class="border-t border-[#dfbd8c]">
    <th scope="row" class="px-4 py-2 text-sm font-bold">{{ KNIFFEL_CATEGORY_LABELS[category] }}</th>
    <td v-for="(player, playerIndex) in players" :key="player.seatIndex" class="px-3 py-2 text-center">
      <AppButton
        v-if="playerIndex === state.currentPlayerIndex && state.scoreSheets[playerIndex][category] === undefined"
        variant="ghost"
        class="min-h-9 px-2 py-1 text-xs"
        :disabled="isAiTurn || !validCategories.has(category)"
        @click="score(category)"
      >
        Eintragen
      </AppButton>
      <span v-else>{{ state.scoreSheets[playerIndex][category] ?? '–' }}</span>
    </td>
  </tr>
  <tr class="border-t-2 border-[#c48a4a] bg-[#fffaf0] font-bold">
    <th scope="row" class="px-4 py-2 text-sm">Summe oben</th>
    <td v-for="(player, playerIndex) in players" :key="`upper-${player.seatIndex}`" class="px-3 py-2 text-center">
      {{ playerUpperSums[playerIndex] }}
    </td>
  </tr>
  <tr class="border-t border-[#dfbd8c] bg-[#fffaf0] font-bold">
    <th scope="row" class="px-4 py-2 text-sm">Bonus (+35 ab 63)</th>
    <td v-for="(player, playerIndex) in players" :key="`bonus-${player.seatIndex}`" class="px-3 py-2 text-center">
      {{ playerUpperBonuses[playerIndex] }}
    </td>
  </tr>
  <tr v-for="category in lowerCategories" :key="category" class="border-t border-[#dfbd8c]">
    <th scope="row" class="px-4 py-2 text-sm font-bold">{{ KNIFFEL_CATEGORY_LABELS[category] }}</th>
    <td v-for="(player, playerIndex) in players" :key="player.seatIndex" class="px-3 py-2 text-center">
      <AppButton
        v-if="playerIndex === state.currentPlayerIndex && state.scoreSheets[playerIndex][category] === undefined"
        variant="ghost"
        class="min-h-9 px-2 py-1 text-xs"
        :disabled="isAiTurn || !validCategories.has(category)"
        @click="score(category)"
      >
        Eintragen
      </AppButton>
      <span v-else>{{ state.scoreSheets[playerIndex][category] ?? '–' }}</span>
    </td>
  </tr>
</tbody>
```

- [ ] **Step 4: Run tests**

Run: `bun run test test/unit/final-review-ui.test.ts test/unit/kniffel-scoring.test.ts test/unit/kniffel-engine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/features/games/kniffel/KniffelBoard.vue test/unit/final-review-ui.test.ts
git commit -m "feat: show Kniffel Summe oben and Bonus on score block"
```

---

### Task 4: Full verification

**Files:** none new

- [ ] **Step 1: Run full unit suite**

Run: `bun run test`

Expected: all PASS

- [ ] **Step 2: Fix anything that failed, then re-run**

If fixes needed: commit with `fix: …`

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| upperSum / upperBonus / totalScore helpers | Task 1 |
| Constants 63 / 35 | Task 1 |
| Engine winners use totalScore | Task 2 |
| UI Summe oben + Bonus rows | Task 3 |
| Gesamt uses totalScore | Task 3 |
| Unit tests | Tasks 1–3 |
| Out of scope (AI, joker) | skipped |
