# Kniffel Score Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offene Kniffel-Kategorien zeigen nach dem Würfeln die eintragbaren Punkte; Kategorien mit Preview `0` zeigen einen roten „Streichen“-Button. Beide Aktionen bleiben `{ type: 'score', category }`.

**Architecture:** Reuse `scoreCategory` from `scoring.ts` for preview. Optional thin helper `previewCategoryScore`. UI in `KniffelBoard.vue` switches label/variant. Add `danger` variant to `AppButton`. No engine/AI changes.

**Tech Stack:** TypeScript, Vue 3, Vitest, Bun

## Phase 0: Documentation Discovery (complete)

### Sources

| Source | Finding |
|--------|---------|
| `app/features/games/kniffel/scoring.ts:110` | `scoreCategory(category, dice): number` — sole scoring API |
| `app/features/games/kniffel/engine.ts:72–85,125–128` | All open categories valid after roll; scoring writes `scoreCategory` result (incl. 0) |
| `app/features/games/kniffel/KniffelBoard.vue:157–165,184–192` | Ghost „Eintragen“ buttons; no preview |
| `app/features/games/kniffel/ai.ts:11–27,34–51` | AI strike heuristic private; not for UI |
| `app/components/ui/AppButton.vue` | Variants: `primary` \| `secondary` \| `ghost` only |
| `app/assets/css/tokens.css:8` | `--color-accent: #d45d3a` for danger |
| Specs | Upper-bonus only; **no** prior score-preview UX → new design spec |

### Allowed APIs

- `scoreCategory(category: KniffelCategory, dice: readonly number[]): number`
- `KNIFFEL_CATEGORIES`, `KNIFFEL_CATEGORY_LABELS`, `UPPER_CATEGORIES`
- `KniffelAction` score: `{ type: 'score', category: KniffelCategory }`
- Existing `validCategories` computed in `KniffelBoard.vue`

### Anti-patterns

- Do **not** add `{ type: 'strike' }` engine action
- Do **not** call `scoreCategory` when `dice.length !== 5`
- Do **not** disable zero-score categories (kids must strike)
- Do **not** make Summe oben / Bonus clickable
- Do **not** export/reuse `STRIKE_PRIORITY` for UI ordering
- Do **not** invent `previewScores` API names without implementing them as thin wrappers over `scoreCategory`

### Design Spec

`docs/superpowers/specs/2026-08-03-kniffel-score-preview-design.md`

---

## Global Constraints

- Bun only (`bun run test`, no npm/pnpm/yarn)
- TypeScript strict, no `any`
- German UI labels
- Work on `dev` branch
- Spec: `docs/superpowers/specs/2026-08-03-kniffel-score-preview-design.md`

## File Structure

| File | Responsibility |
|------|----------------|
| `docs/superpowers/specs/2026-08-03-kniffel-score-preview-design.md` | UX rules (already written) |
| `app/features/games/kniffel/scoring.ts` | Optional `previewCategoryScore` helper |
| `app/components/ui/AppButton.vue` | Add `danger` variant |
| `app/features/games/kniffel/KniffelBoard.vue` | Preview labels + danger Streichen |
| `test/unit/kniffel-scoring.test.ts` | Helper tests (if helper added) |
| `test/unit/final-review-ui.test.ts` | Source assertions for Streichen / danger / preview |

---

### Task 1: Preview helper (thin wrapper)

**Files:**
- Modify: `app/features/games/kniffel/scoring.ts`
- Modify: `test/unit/kniffel-scoring.test.ts`

**What to implement:** Copy `scoreCategory` call pattern; export a named helper so UI does not invent scoring logic.

**Interfaces:**
- Consumes: `scoreCategory`, `KniffelCategory`
- Produces:
  ```ts
  export function previewCategoryScore(
    category: KniffelCategory,
    dice: readonly number[],
  ): number {
    return scoreCategory(category, dice)
  }
  ```

**Documentation references:**
- `scoring.ts:110–141` — `scoreCategory` implementation to wrap
- Design spec Rules section — preview uses `scoreCategory`

- [ ] **Step 1: Write the failing tests**

Append to `test/unit/kniffel-scoring.test.ts`:

```ts
describe('previewCategoryScore', () => {
  it('returns positive points for matching combinations', () => {
    expect(previewCategoryScore('fullHouse', [2, 2, 3, 3, 3])).toBe(25)
    expect(previewCategoryScore('kniffel', [6, 6, 6, 6, 6])).toBe(60)
    expect(previewCategoryScore('ones', [1, 1, 2, 3, 4])).toBe(2)
  })

  it('returns zero when the combination does not match', () => {
    expect(previewCategoryScore('fullHouse', [1, 2, 3, 4, 5])).toBe(0)
    expect(previewCategoryScore('kniffel', [1, 1, 1, 1, 2])).toBe(0)
    expect(previewCategoryScore('ones', [2, 3, 4, 5, 6])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test test/unit/kniffel-scoring.test.ts
```

Expect: `previewCategoryScore` is not exported / not defined.

- [ ] **Step 3: Implement helper**

In `scoring.ts`, after `scoreCategory`:

```ts
export function previewCategoryScore(
  category: KniffelCategory,
  dice: readonly number[],
): number {
  return scoreCategory(category, dice)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test test/unit/kniffel-scoring.test.ts
```

**Verification checklist:**
- [ ] Helper exported and reuses `scoreCategory` (no duplicated switch)
- [ ] Positive and zero cases pass

**Anti-pattern guards:**
- Do not reimplement category rules inside the helper
- Do not change `scoreCategory` behavior

---

### Task 2: AppButton `danger` variant

**Files:**
- Modify: `app/components/ui/AppButton.vue`

**What to implement:** Extend variant union with `danger`, styled from accent red token (copy primary structure, use accent colors).

**Documentation references:**
- `AppButton.vue:1–27` — existing variant pattern to copy
- `tokens.css:8` — `--color-accent: #d45d3a`
- Design spec UI table — Streichen uses `danger`

- [ ] **Step 1: Extend type and class map**

```ts
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
```

Add class map entry (mirror `primary`, keep accent red):

```ts
danger: 'border-[#9e3b24] bg-[var(--color-accent)] text-white shadow-[0_4px_0_#9e3b24] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#9e3b24] active:translate-y-0 active:shadow-[0_2px_0_#9e3b24]',
```

Note: `primary` already uses accent. If primary and danger look identical, differentiate danger with a slightly stronger border/shadow toward `#9e3b24` / darker red, or keep identical red fill — design goal is clearly red “Streichen”. Prefer distinct danger if primary remains orange-accent; current primary **is** accent red, so danger may match primary visually — that is acceptable for kids UX as long as label says `Streichen`.

- [ ] **Step 2: Smoke-check TypeScript**

```bash
bun run test test/unit/final-review-ui.test.ts
```

(Existing tests should still pass; new assertions come in Task 4.)

**Verification checklist:**
- [ ] `variant="danger"` type-checks
- [ ] No regression on existing variants

**Anti-pattern guards:**
- Do not add arbitrary new variants beyond `danger`
- Do not hardcode unrelated purple/indigo colors

---

### Task 3: KniffelBoard preview UI

**Files:**
- Modify: `app/features/games/kniffel/KniffelBoard.vue`

**What to implement:** Replace static „Eintragen“ with preview points or „Streichen“; switch variant; extract shared cell helper to avoid duplicating upper/lower templates.

**Documentation references:**
- Design spec UI table
- `KniffelBoard.vue:38–42` — `validCategories`
- `KniffelBoard.vue:71–74` — `score(category)` unchanged
- `KniffelBoard.vue:157–165` and `184–192` — buttons to update
- Copy pattern: upper/lower split at `46–48`, `154–195`

- [ ] **Step 1: Import preview helper**

```ts
import {
  KNIFFEL_CATEGORIES,
  KNIFFEL_CATEGORY_LABELS,
  UPPER_CATEGORIES,
  type KniffelCategory,
  previewCategoryScore,
  totalScore,
  upperBonus,
  upperSum,
} from './scoring'
```

- [ ] **Step 2: Add preview helpers in script**

```ts
function canPreviewScores(): boolean {
  return state.value.dice.length === 5 && state.value.rollsUsed > 0
}

function categoryPreview(category: KniffelCategory): number | null {
  if (!canPreviewScores() || !validCategories.value.has(category)) return null
  return previewCategoryScore(category, state.value.dice)
}

function categoryButtonLabel(category: KniffelCategory): string {
  const preview = categoryPreview(category)
  if (preview === null) return 'Eintragen'
  if (preview === 0) return 'Streichen'
  return String(preview)
}

function categoryButtonVariant(category: KniffelCategory): 'primary' | 'ghost' | 'danger' {
  const preview = categoryPreview(category)
  if (preview === null) return 'ghost'
  if (preview === 0) return 'danger'
  return 'primary'
}
```

- [ ] **Step 3: Update upper and lower open-cell buttons**

Replace both AppButton blocks (upper + lower) with:

```vue
<AppButton
  v-if="playerIndex === state.currentPlayerIndex && state.scoreSheets[playerIndex][category] === undefined"
  :variant="categoryButtonVariant(category)"
  class="min-h-9 px-2 py-1 text-xs"
  :disabled="isAiTurn || !validCategories.has(category)"
  @click="score(category)"
>
  {{ categoryButtonLabel(category) }}
</AppButton>
```

Keep `score(category)` and `validCategories` gating unchanged.

- [ ] **Step 4: Manual sanity (optional during implementation)**

```bash
bun run dev
```

Check: after roll with Full House dice → Full House button `25`, Kniffel button `Streichen` (red). Click Streichen → sheet shows `0`.

**Verification checklist:**
- [ ] Positive preview shows number
- [ ] Zero preview shows `Streichen` with `danger`
- [ ] Before first roll: disabled ghost „Eintragen“ (or equivalent), no crash
- [ ] Summe oben / Bonus still read-only
- [ ] Same behavior upper + lower

**Anti-pattern guards:**
- Do not call `previewCategoryScore` / `scoreCategory` when dice length ≠ 5
- Do not change `applyAction` / engine
- Do not hide zero categories
- Do not put scoring switch logic in the template

---

### Task 4: UI source tests

**Files:**
- Modify: `test/unit/final-review-ui.test.ts`

**What to implement:** Assert board uses preview + Streichen + danger (copy style of existing Summe oben test).

**Documentation references:**
- `final-review-ui.test.ts:61–68` — copy assertion style
- Design spec Testing section

- [ ] **Step 1: Add test**

```ts
it('shows Kniffel score preview and Streichen buttons', () => {
  const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
  expect(kniffelBoard).toContain('previewCategoryScore')
  expect(kniffelBoard).toContain('Streichen')
  expect(kniffelBoard).toContain('categoryButtonVariant')
  expect(kniffelBoard).toContain('danger')
  expect(kniffelBoard).not.toMatch(/Eintragen(?![\s\S]*categoryButtonLabel)/)
})
```

Prefer simpler, stable assertions if the negative regex is brittle:

```ts
it('shows Kniffel score preview and Streichen buttons', () => {
  const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
  expect(kniffelBoard).toContain('previewCategoryScore')
  expect(kniffelBoard).toContain('Streichen')
  expect(kniffelBoard).toContain('categoryButtonLabel')
  expect(kniffelBoard).toContain('categoryButtonVariant')
  expect(kniffelBoard).toContain("'danger'")
})
```

Also assert AppButton supports danger:

```ts
it('supports AppButton danger variant', () => {
  const button = readSource('app/components/ui/AppButton.vue')
  expect(button).toContain("'danger'")
  expect(button).toMatch(/type ButtonVariant = .*danger/)
})
```

- [ ] **Step 2: Run tests**

```bash
bun run test test/unit/final-review-ui.test.ts test/unit/kniffel-scoring.test.ts
```

**Verification checklist:**
- [ ] New UI tests pass
- [ ] Existing Kniffel UI tests (Summe oben / Bonus / validActions) still pass

**Anti-pattern guards:**
- Do not assert AI `STRIKE_PRIORITY`
- Do not require removing the fallback string `Eintragen` for pre-roll disabled state

---

### Task 5: Full verification

- [ ] **Step 1: Run full unit suite**

```bash
bun run test
```

- [ ] **Step 2: Anti-pattern grep**

```bash
rg "type: 'strike'" app/features/games/kniffel || true
rg "Streichen" app/features/games/kniffel/KniffelBoard.vue
rg "previewCategoryScore" app/features/games/kniffel
rg "danger" app/components/ui/AppButton.vue
```

Expect: no strike action; Streichen + preview present; danger variant present.

- [ ] **Step 3: Confirm engine untouched**

```bash
git diff -- app/features/games/kniffel/engine.ts app/features/games/kniffel/ai.ts
```

Expect: empty diff (or no intentional changes).

**Verification checklist:**
- [ ] All tests green
- [ ] Spec rules matched (preview >0 number, =0 Streichen danger, same score action)
- [ ] No invented engine APIs
- [ ] Upper bonus rows still intact

---

## Execution Notes

- Prefer implementing tasks in order 1 → 5
- Feature commit message example: `feat: show kniffel score preview and strike buttons`
- Fixes: ask „fix ok?“ before commit (user rule)
