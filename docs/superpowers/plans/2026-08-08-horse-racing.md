# Pferderennen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add side-view Pferderennen (`horseRacing`): hold to gallop, release to slow, jump hurdles; 2–4 players with 1–2 humans and AI fill.

**Architecture:** New real-time tick engine (same shell pattern as Spurrennen). Do **not** fork `racing/engine.ts`. Register via `GameId` / `GAMES` / lobby / play page. Board owns rAF + keyboard + AI apply.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, TailwindCSS, Vitest (`bun run test`).

**Spec:** `docs/superpowers/specs/2026-08-08-horse-racing-design.md`

## Global Constraints

- German UI copy; English code identifiers
- Work on branch `cursor/horse-racing-game-d316`
- Bun only (`bun run test`, `bun run build`)
- Keyboard only (P1: hold `A` / jump `W`; P2: hold `←` / jump `↑`)
- Roster: length 2–4, humans 1–2, reject 0 humans
- Reuse `useSound` cues `start` | `hit` | `win` (no new assets)
- Do not change Spurrennen behavior
- Preserve existing design tokens / panel look; side-view sky+grass atmosphere OK

## Allowed APIs / copy sources

| Pattern | Copy from |
| --- | --- |
| Tick game factory + mutable state | `app/features/games/racing/engine.ts` (`createRacingGame`, edge-trigger slowdown) |
| Board rAF / keys / AI / sounds | `app/features/games/racing/RacingBoard.vue` |
| AI difficulty options | `app/features/games/racing/ai.ts` + `shared/ai.ts` |
| Lobby validator | `app/features/games/racing/lobby.ts` (adapt human min=1) |
| Registration | `game.ts`, `games.ts`, `GameCard.vue`, `lobby/[game].vue`, `play/[game].vue` |
| Unit test style | `test/unit/racing-*.test.ts` |

## Anti-patterns

- Do **not** implement `GameEngine` from `shared/engine.ts` (turn-based)
- Do **not** reuse lane/obstacle APIs from racing
- Do **not** invent new sound names beyond `start`/`hit`/`win`
- Do **not** allow 0-human or 3+ human rosters

## File map

| File | Responsibility |
| --- | --- |
| `app/features/games/horseRacing/lobby.ts` | `isHorseRacingRosterValid` |
| `app/features/games/horseRacing/engine.ts` | Hold/jump/hurdle physics + tick |
| `app/features/games/horseRacing/ai.ts` | `chooseHorseRacingActions` |
| `app/features/games/horseRacing/HorseRacingBoard.vue` | UI + rAF + input |
| `app/types/game.ts` | Add `'horseRacing'` |
| `app/constants/games.ts` | Catalog + `isGameId` |
| `app/components/hub/GameCard.vue` | Icon 🐴 |
| `app/pages/lobby/[game].vue` | Roster + hint |
| `app/pages/play/[game].vue` | Title + board |
| `PROJECT_INFO.md` | MVP list |
| `test/unit/horse-racing-lobby.test.ts` | Roster |
| `test/unit/horse-racing-engine.test.ts` | Physics |
| `test/unit/horse-racing-ai.test.ts` | AI |

---

### Task 1: Lobby roster validation

**Files:**
- Create: `app/features/games/horseRacing/lobby.ts`
- Test: `test/unit/horse-racing-lobby.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { isHorseRacingRosterValid } from '../../app/features/games/horseRacing/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('horse racing lobby roster', () => {
  it('allows 1 human + 1 AI', () => {
    expect(isHorseRacingRosterValid([p(0, 'human'), p(1, 'ai')])).toBe(true)
  })

  it('allows 1 human + 3 AI', () => {
    expect(isHorseRacingRosterValid([
      p(0, 'human'), p(1, 'ai'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('allows 2 humans + 0 AI', () => {
    expect(isHorseRacingRosterValid([p(0, 'human'), p(1, 'human')])).toBe(true)
  })

  it('allows 2 humans + 2 AI', () => {
    expect(isHorseRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('rejects 0 humans', () => {
    expect(isHorseRacingRosterValid([p(0, 'ai'), p(1, 'ai')])).toBe(false)
  })

  it('rejects 3 humans', () => {
    expect(isHorseRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'human'),
    ])).toBe(false)
  })

  it('rejects fewer than 2 players', () => {
    expect(isHorseRacingRosterValid([p(0, 'human')])).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `bun run test test/unit/horse-racing-lobby.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement lobby**

```ts
export function isHorseRacingRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  if (players.length < 2 || players.length > 4) return false
  const humans = players.filter((p) => p.type === 'human').length
  return humans >= 1 && humans <= 2
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `bun run test test/unit/horse-racing-lobby.test.ts`  
Expected: PASS

---

### Task 2: Engine physics

**Files:**
- Create: `app/features/games/horseRacing/engine.ts`
- Test: `test/unit/horse-racing-engine.test.ts`

**Constants (exact values for v1):**

```ts
export const TARGET_RACE_MS = 150_000 // ~2.5 min clean run
export const BASE_SPEED = 0.015
export const SPEED_RAMP = 0.5
export const MEAN_SPEED_MULT = 1 + SPEED_RAMP / 2
export const TRACK_LENGTH = BASE_SPEED * TARGET_RACE_MS * MEAN_SPEED_MULT
export const COUNTDOWN_MS = 3000
export const ACCEL_PER_MS = 0.00008
export const DECEL_PER_MS = 0.00005
export const COAST_SPEED_FACTOR = 0.25 // floor while not holding
export const JUMP_AIR_MS = 420
export const HURDLE_HITBOX = 1.6
export const HORSE_HITBOX = 1.2
export const SLOWDOWN_MS = 400
export const SLOWDOWN_FACTOR = 0.7
export const HURDLE_SPAWN_AHEAD = 28
export const SPAWN_INTERVAL_START_MS = 2200
export const SPAWN_INTERVAL_END_MS = 1100
export const VIEW_AHEAD = 36
export const VIEW_BEHIND = 10
```

**API:** match spec (`createHorseRacingGame`, `setHold`, `jump`, `tick`, `getWinnerSeatIndex`).

- [ ] **Step 1: Write failing tests** covering:
  - `TRACK_LENGTH` formula / `TARGET_RACE_MS`
  - Hold accelerates speed above coast within ~500ms of racing ticks
  - Release decelerates toward coast
  - Jump sets `airMs > 0`; airborne overlap with hurdle does **not** set slowdown
  - Ground overlap with hurdle edge-triggers `slowdownUntil` once
  - `jump` / `setHold` ignored during countdown
  - First horse reaching `TRACK_LENGTH` finishes with winner seat

Mirror structure of `test/unit/racing-engine.test.ts` (force `phase = 'racing'`, call `tick`).

- [ ] **Step 2: Run test — expect FAIL**

Run: `bun run test test/unit/horse-racing-engine.test.ts`

- [ ] **Step 3: Implement engine**

Behavior notes from spec:
- Each racing tick: update `airMs` countdown; refresh speed from hold/accel/decel + slowdown + progress ramp; advance `progress`; spawn hurdles from leader; resolve collisions edge-triggered; prune; check finish.
- `setHold(seat, held)` sets `horse.hold` only when `phase === 'racing'`.
- `jump(seat)` only when `phase === 'racing'` and `airMs === 0`.

- [ ] **Step 4: Run test — expect PASS**

Run: `bun run test test/unit/horse-racing-engine.test.ts`

---

### Task 3: AI

**Files:**
- Create: `app/features/games/horseRacing/ai.ts`
- Test: `test/unit/horse-racing-ai.test.ts`

```ts
export interface HorseRacingAiActions {
  hold: boolean
  jump: boolean
}

export function chooseHorseRacingActions(
  state: HorseRacingState,
  seatIndex: number,
  options?: { difficulty?: AiDifficulty; random?: () => number },
): HorseRacingAiActions
```

- [ ] **Step 1: Write failing tests**
  - No hurdle ahead → `{ hold: true, jump: false }`
  - Hurdle in look-ahead window + `difficulty: 'hard'` → `jump: true`
  - `difficulty: 'easy'` with random that forces blunder → `jump: false` even with hurdle ahead

- [ ] **Step 2: FAIL → implement → PASS**

Run: `bun run test test/unit/horse-racing-ai.test.ts`

Look-ahead: hurdle with `progress` in `(horse.progress, horse.progress + JUMP_LOOKAHEAD]` where `JUMP_LOOKAHEAD` ≈ 8–12 progress units (export constant). Easy blunder prob ~0.45; medium ~0.2; hard 0.

---

### Task 4: Registration wiring

**Files:**
- Modify: `app/types/game.ts`
- Modify: `app/constants/games.ts`
- Modify: `app/components/hub/GameCard.vue`
- Modify: `app/pages/lobby/[game].vue`
- Modify: `app/pages/play/[game].vue` (title only in this task; board mount in Task 5 if preferred together)
- Modify: `PROJECT_INFO.md`

- [ ] **Step 1: Extend `GameId`**

```ts
export type GameId = 'memory' | 'kniffel' | 'ludo' | 'racing' | 'uno' | 'connectFour' | 'shutTheBox' | 'muehle' | 'horseRacing'
```

- [ ] **Step 2: Catalog + `isGameId`**

Add:
```ts
{ id: 'horseRacing', title: 'Pferderennen', blurb: 'Halten, springen, zuerst ins Ziel!', minPlayers: 2, maxPlayers: 4 },
```
Include `value === 'horseRacing'` in `isGameId`.

- [ ] **Step 3: Icon**

```ts
horseRacing: '🐴',
```

- [ ] **Step 4: Lobby**

Import `isHorseRacingRosterValid`. In `canStart` / `lobbyHint`:
- Branch `routeGame === 'horseRacing'`
- Hint: `'1–2 Menschen, Rest KI.'`

- [ ] **Step 5: Play title**

```ts
if (routeGame === 'horseRacing') return 'Pferderennen'
```

- [ ] **Step 6: PROJECT_INFO MVP line**

Append `, Pferderennen` to MVP-Spiele list.

- [ ] **Step 7: Typecheck sanity**

Run: `bun run test` (existing suites must stay green; board not required yet if play page not mounting missing component — prefer adding stub board or wait for Task 5 before referencing `HorseRacingBoard` in template).

**Guard:** Do not reference `HorseRacingBoard` in `play/[game].vue` until Task 5 creates the file.

---

### Task 5: Board UI

**Files:**
- Create: `app/features/games/horseRacing/HorseRacingBoard.vue`
- Modify: `app/pages/play/[game].vue`

Copy structure from `RacingBoard.vue`, adapt:

| Racing | Horse |
| --- | --- |
| `setLaneIntent` | `setHold` / `jump` |
| vertical road, lanes | horizontal side-scroll (progress → left %) |
| cars | horses (colored body + legs; lift when `airMs > 0`) |
| cones | hurdle bars |
| A/D hints | A hold + W jump; ← hold + ↑ jump |

- [ ] **Step 1: Implement board**
  - Props: `players: SessionPlayer[]`
  - Emit: `complete: [winnerSeatIndexes: number[]]`
  - rAF loop: `tick` → AI `chooseHorseRacingActions` → `setHold`/`jump` → sync → winner emit once
  - Sounds: `start` on countdown→racing; `hit` on slowdown edge; `win` on finish
  - Clear all holds on `blur` / unmount
  - Progress bar label: `Strecke · ca. 2–3 Min`
  - aria-label: `Pferderennen Bahn`

- [ ] **Step 2: Mount in play page**

```vue
    <HorseRacingBoard
      v-else-if="routeGame === 'horseRacing'"
      :players="players"
      @complete="completeGame"
    />
```

- [ ] **Step 3: Manual smoke (if browser available)**
  - Hub → Pferderennen → 1 human + 1 AI → start → hold/jump works → finish → WinScreen

---

### Task 6: Verification

- [ ] **Step 1: Unit tests**

Run: `bun run test`  
Expected: all green, including new `horse-racing-*.test.ts`

- [ ] **Step 2: Build**

Run: `bun run build`  
Expected: success

- [ ] **Step 3: Grep guards**

```bash
rg "horseRacing" app/types/game.ts app/constants/games.ts app/components/hub/GameCard.vue app/pages/lobby/\[game\].vue app/pages/play/\[game\].vue
rg "createHorseRacingGame|setHold|chooseHorseRacingActions|isHorseRacingRosterValid" app/features/games/horseRacing
```

Expected: all registration + feature symbols present.

- [ ] **Step 4: Commit + push**

```bash
git add -A
git commit -m "feat: add Pferderennen side-view horse race"
git push -u origin cursor/horse-racing-game-d316
```

---

## Execution handoff

After this plan is approved, implement tasks 1→6 in order on `cursor/horse-racing-game-d316`. Prefer TDD for Tasks 1–3. Update PR #15 body when implementation lands.
