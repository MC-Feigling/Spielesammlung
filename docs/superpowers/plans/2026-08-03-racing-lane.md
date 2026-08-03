# Spurrennen (Lane Racing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add realtime lane-racing game `racing` (Spurrennen): 3 lanes, auto-forward, obstacle dodge, finish line; max 2 humans (split keyboard) + max 2 AI; Vue-DOM + pure TS engine.

**Architecture:** Feature module under `app/features/games/racing/` with `createRacingGame` (tick-based, not `GameEngine`). Wire into existing hub/lobby/play/profile patterns. Lobby adds racing-only human/AI caps.

**Tech Stack:** TypeScript, Vue 3 Composition API, Vitest, Bun, Nuxt 4 (existing)

**Spec:** `docs/superpowers/specs/2026-08-03-racing-lane-design.md`

## Global Constraints

- Bun only (`bun run test`, no npm/pnpm/yarn)
- TypeScript strict, no `any`
- German UI labels
- Work on `dev` branch
- Feature commits in English (`feat:`, `test:`, `docs:`)
- No Canvas / Phaser / WebGL
- Do **not** implement `GameEngine.applyAction` for racing — use spec `tick` / `setLaneIntent`
- Board must still `emit('complete', winnerSeatIndexes: number[])` like other boards

---

## Phase 0: Documentation Discovery (complete)

### Allowed APIs / patterns (cite repo sources)

| Area | Use | Source |
|------|-----|--------|
| Game registry | Extend `GameId`, `GAMES`, `isGameId` | `app/types/game.ts:1`, `app/constants/games.ts:3-11` |
| Hub | `GAMES` loop auto-lists; add `GAME_ICONS.racing` | `app/pages/index.vue`, `app/components/hub/GameCard.vue:20-24` |
| Play mount | `<RacingBoard :players @complete="completeGame" />` | `app/pages/play/[game].vue:66-74` |
| Board contract | `props: players`, `emit complete: number[]` | `MemoryBoard.vue` / `LudoBoard.vue` headers |
| Wins | `profiles.recordWin(profileId, gameId)` via play `completeGame` | `app/stores/profiles.ts:78-83`, `play/[game].vue` |
| Sound | `useSound().play(name)`; extend `SoundName` + `/public/sounds/*.wav` | `app/composables/useSound.ts:3-16` |
| Keyboard lifecycle | `document.addEventListener('keydown'…)` + unmount cleanup | `app/components/ui/AppDialog.vue:28-37` (only existing keydown) |
| AI style | Pure `chooseX(state)` function (prefer Ludo style) | `app/features/games/ludo/ai.ts` |
| Unit tests | Vitest `describe/it/expect`; import from `../../app/features/...` | `test/unit/memory-engine.test.ts`, `ludo-engine.test.ts` |
| Components auto-import | `~/features` path, no manual import of boards | `nuxt.config.ts` components config |
| Racing contract | `createRacingGame` → `{ state, tick, setLaneIntent, getWinnerSeatIndex }` | Spec § Engine contract |

### Anti-patterns

- Do **not** force racing into `GameEngine` / `applyAction` / `getValidActions`
- Do **not** use TurnBanner for racing (realtime)
- Do **not** invent SoundName values without adding wav + union update
- Do **not** assume lobby already enforces human/AI ≤2 (it only checks ≥2 filled seats via `session.canBegin`)
- Do **not** use npm/pnpm/yarn
- Do **not** add online multiplayer, boost, or >3 lanes

### Known gaps closed by this plan

1. Lobby racing caps (humans ≤2, ais ≤2) — new helper + gate
2. SFX `start` — extend `SoundName` + placeholder wav
3. Keyboard lane input — new in `RacingBoard.vue` (edge-trigger)
4. `final-review-ui` / hub grid may need light updates for 4th game

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/features/games/racing/engine.ts` | Constants, state, `createRacingGame`, collide, spawn, finish |
| `app/features/games/racing/ai.ts` | `chooseRacingLaneDelta(state, seatIndex)` |
| `app/features/games/racing/lobby.ts` | `isRacingRosterValid(players)` — human/AI caps |
| `app/features/games/racing/RacingBoard.vue` | rAF loop, keyboard, DOM track, emit complete |
| `app/types/game.ts` | `GameId` + `'racing'` |
| `app/constants/games.ts` | Catalog + `isGameId` |
| `app/components/hub/GameCard.vue` | `GAME_ICONS.racing` |
| `app/pages/play/[game].vue` | Title + `<RacingBoard>` |
| `app/pages/lobby/[game].vue` | Racing start gate using `isRacingRosterValid` |
| `app/composables/useSound.ts` | Add `'start'` |
| `public/sounds/start.wav` | Placeholder SFX (copy/short silence OK if needed) |
| `PROJECT_INFO.md` | MVP list includes Spurrennen |
| `test/unit/racing-engine.test.ts` | Engine rules |
| `test/unit/racing-ai.test.ts` | AI dodge |
| `test/unit/racing-lobby.test.ts` | Roster caps |

### Suggested constants (engine.ts)

```ts
export const LANE_COUNT = 3
export const BASE_SPEED = 0.02 // progress units per ms
export const TARGET_RACE_MS = 180_000
export const MEAN_SPEED_MULT = 1.25
export const TRACK_LENGTH = BASE_SPEED * TARGET_RACE_MS * MEAN_SPEED_MULT
export const SPEED_RAMP = 0.5
export const SLOWDOWN_MS = 400
export const SLOWDOWN_FACTOR = 0.7
export const COUNTDOWN_MS = 3000
export const CAR_HITBOX = 2 // progress half-extent
export const OBSTACLE_HITBOX = 1.5
export const OBSTACLE_SPAWN_AHEAD = 40
export const OBSTACLE_SPAWN_INTERVAL_MS = 900
```

`TRACK_LENGTH` accounts for the linear ramp's mean speed multiplier of `1.25`, targeting a ~3-minute clean run. Tune only if playfeel fails tests stay green.

---

### Task 1: Racing engine (TDD)

**Files:**
- Create: `app/features/games/racing/engine.ts`
- Create: `test/unit/racing-engine.test.ts`

**Interfaces:**
- Consumes: nothing from other games
- Produces: types + `createRacingGame` matching spec

**Documentation references:** Spec § Engine contract, § Rules; copy test style from `test/unit/ludo-engine.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  LANE_COUNT,
  TRACK_LENGTH,
  createRacingGame,
} from '../../app/features/games/racing/engine'

describe('racing engine', () => {
  it('clamps lane changes to 0..LANE_COUNT-1', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    // skip countdown
    game.state.phase = 'racing'
    game.state.countdownMs = 0
    const car = game.state.cars[0]!
    car.lane = 0
    game.setLaneIntent(0, -1)
    expect(car.lane).toBe(0)
    car.lane = LANE_COUNT - 1
    game.setLaneIntent(0, 1)
    expect(car.lane).toBe(LANE_COUNT - 1)
  })

  it('applies slowdown on same-lane obstacle overlap', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const car = game.state.cars[0]!
    car.lane = 1
    car.progress = 10
    game.state.obstacles = [{ id: 1, lane: 1, progress: 10 }]
    game.tick(16)
    expect(car.slowdownUntil).toBeGreaterThan(0)
    expect(car.speed).toBeLessThan(BASE_SPEED)
  })

  it('declares winner when progress reaches TRACK_LENGTH', () => {
    const game = createRacingGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'racing'
    game.state.cars[0]!.progress = TRACK_LENGTH
    game.tick(16)
    expect(game.state.phase).toBe('finished')
    expect(game.getWinnerSeatIndex()).toBe(0)
  })

  it('ignores lane intent during countdown', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    expect(game.state.phase).toBe('countdown')
    const lane = game.state.cars[0]!.lane
    game.setLaneIntent(0, 1)
    expect(game.state.cars[0]!.lane).toBe(lane)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test test/unit/racing-engine.test.ts
```

Expected: FAIL (module missing)

- [ ] **Test expectations**

- Speed ramp uses each car's own `progress`: `speedMult = 1 + SPEED_RAMP * (progress / TRACK_LENGTH)`.
- A clean car starts at `BASE_SPEED` and reaches `BASE_SPEED * 1.5` at `TRACK_LENGTH`.
- A colliding car receives the mild slowdown for `SLOWDOWN_MS` (`400`) and moves at `BASE_SPEED * speedMult * SLOWDOWN_FACTOR` (`0.7`) until expiry.

- [ ] **Step 3: Implement `engine.ts`**

Implement per spec:

- `createRacingGame({ players })` initializes cars (spread starting lanes), empty obstacles, `phase: 'countdown'`, `countdownMs: COUNTDOWN_MS`, `trackLength: TRACK_LENGTH`
- `tick(dtMs)`: countdown → racing; while racing derive each car's `speedMult = 1 + SPEED_RAMP * (progress / TRACK_LENGTH)`, move by `speed * dt`, spawn obstacles ahead of camera (`max progress`), resolve collisions, check finish
- `setLaneIntent(seatIndex, -1|1)`: only in `racing`; clamp lane
- Collision: same lane + `|car.progress - obstacle.progress| < CAR_HITBOX + OBSTACLE_HITBOX` → set `slowdownUntil = now + 400`; while active apply the mild `0.7` factor to the ramped speed
- First car with `progress >= TRACK_LENGTH` → `phase: 'finished'`, store winner seat
- Do **not** implement `GameEngine` interface

- [ ] **Step 4: Run tests**

```bash
bun run test test/unit/racing-engine.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/features/games/racing/engine.ts test/unit/racing-engine.test.ts
git commit -m "$(cat <<'EOF'
feat: add racing engine with lanes, collide, finish

EOF
)"
```

**Verification checklist:**
- [ ] `createRacingGame`, `tick`, `setLaneIntent`, `getWinnerSeatIndex` exported
- [ ] Tests cover clamp, slowdown, winner, countdown lock

**Anti-pattern guards:**
- No `applyAction` / `getValidActions`
- No DOM / Vue imports in `engine.ts`

---

### Task 2: Racing AI (TDD)

**Files:**
- Create: `app/features/games/racing/ai.ts`
- Create: `test/unit/racing-ai.test.ts`

**Documentation references:** Spec § AI; copy pure-function style from `app/features/games/ludo/ai.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { chooseRacingLaneDelta } from '../../app/features/games/racing/ai'
import { createRacingGame } from '../../app/features/games/racing/engine'

describe('racing AI', () => {
  it('returns null when lane is clear ahead', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.cars[0]!.lane = 1
    game.state.cars[0]!.progress = 5
    game.state.obstacles = [{ id: 1, lane: 0, progress: 20 }]
    expect(chooseRacingLaneDelta(game.state, 0)).toBeNull()
  })

  it('changes lane when obstacle is on same lane ahead', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.cars[0]!.lane = 1
    game.state.cars[0]!.progress = 5
    game.state.obstacles = [{ id: 1, lane: 1, progress: 15 }]
    const delta = chooseRacingLaneDelta(game.state, 0)
    expect(delta === -1 || delta === 1).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test test/unit/racing-ai.test.ts
```

- [ ] **Step 3: Implement `chooseRacingLaneDelta`**

- Look ahead distance constant (e.g. 20 progress units)
- If obstacle on same lane with `obstacle.progress > car.progress` within ahead window → pick free neighbor (`-1` or `1`) that has no obstacle in window; prefer lower index if both free
- Else `null`

- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit** `feat: add racing AI lane dodge heuristic`

**Anti-pattern guards:**
- Do not import Vue
- Do not mutate state inside AI — return delta only; board/engine applies via `setLaneIntent`

---

### Task 3: Lobby roster validation (TDD)

**Files:**
- Create: `app/features/games/racing/lobby.ts`
- Create: `test/unit/racing-lobby.test.ts`
- Modify: `app/pages/lobby/[game].vue`

**Documentation references:** Spec § Lobby; existing start button `lobby/[game].vue` (`:disabled="!session.canBegin"`)

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { isRacingRosterValid } from '../../app/features/games/racing/lobby'
import type { SessionPlayer } from '../../app/types/game'

function p(seatIndex: number, type: 'human' | 'ai'): SessionPlayer {
  return {
    seatIndex,
    type,
    displayName: `P${seatIndex}`,
    avatarId: 'bear',
  }
}

describe('racing lobby roster', () => {
  it('allows 2 humans', () => {
    expect(isRacingRosterValid([p(0, 'human'), p(1, 'human')])).toBe(true)
  })

  it('allows 2 humans + 2 AI', () => {
    expect(isRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'ai'), p(3, 'ai'),
    ])).toBe(true)
  })

  it('rejects 3 humans', () => {
    expect(isRacingRosterValid([
      p(0, 'human'), p(1, 'human'), p(2, 'human'),
    ])).toBe(false)
  })

  it('rejects 3 AI', () => {
    expect(isRacingRosterValid([
      p(0, 'ai'), p(1, 'ai'), p(2, 'ai'),
    ])).toBe(false)
  })

  it('rejects fewer than 2 players', () => {
    expect(isRacingRosterValid([p(0, 'human')])).toBe(false)
  })
})
```

- [ ] **Step 2: Implement**

```ts
export function isRacingRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean {
  if (players.length < 2 || players.length > 4) return false
  const humans = players.filter((p) => p.type === 'human').length
  const ais = players.filter((p) => p.type === 'ai').length
  return humans <= 2 && ais <= 2
}
```

- [ ] **Step 3: Wire lobby**

In `app/pages/lobby/[game].vue`:

- Import/use `isRacingRosterValid`
- Computed `canStart`: if `gameId === 'racing'` then `session.canBegin && isRacingRosterValid(session.players)` else `session.canBegin`
- Bind Start button to `canStart`
- Optional German hint when invalid racing roster: „Maximal 2 Menschen und 2 KI.“

Copy seat UI patterns from existing lobby; do not rewrite seat picker.

- [ ] **Step 4: Tests PASS + Commit** `feat: validate racing lobby human and AI caps`

**Anti-pattern guards:**
- Do not change global `MIN_SEAT_COUNT` / `canBeginSession` for all games
- Caps apply only when `gameId === 'racing'`

---

### Task 4: Registry + play wiring

**Files:**
- Modify: `app/types/game.ts`
- Modify: `app/constants/games.ts`
- Modify: `app/components/hub/GameCard.vue`
- Modify: `app/pages/play/[game].vue`
- Modify: `PROJECT_INFO.md`

**Documentation references:** Phase 0 registry table; copy GAMES entry shape from `games.ts:3-7`

- [ ] **Step 1: Extend types/catalog**

```ts
export type GameId = 'memory' | 'kniffel' | 'ludo' | 'racing'
```

```ts
{ id: 'racing', title: 'Spurrennen', blurb: 'Ausweichen und zuerst ins Ziel!', minPlayers: 2, maxPlayers: 4 },
```

```ts
return value === 'memory' || value === 'kniffel' || value === 'ludo' || value === 'racing'
```

- [ ] **Step 2: GameCard icon** — add `racing: '🏎️'` (or non-emoji SVG later; match existing emoji style)

- [ ] **Step 3: play/[game].vue**

- `gameTitle`: `if (routeGame === 'racing') return 'Spurrennen'`
- Board:

```vue
<RacingBoard
  v-else-if="routeGame === 'racing'"
  :players="players"
  @complete="completeGame"
/>
```

- [ ] **Step 4: PROJECT_INFO.md** MVP-Spiele line add Spurrennen

- [ ] **Step 5: Commit** `feat: register Spurrennen in hub lobby and play`

**Verification:**
- [ ] `isGameId('racing') === true`
- [ ] Typecheck: `Record<GameId, string>` in GameCard compiles

**Anti-pattern guards:**
- Do not hardcode racing-only routes outside `[game]` params
- Do not manually import RacingBoard (auto-import via `~/features`)

---

### Task 5: Sound `start` + RacingBoard UI

**Files:**
- Modify: `app/composables/useSound.ts`
- Create/copy: `public/sounds/start.wav`
- Create: `app/features/games/racing/RacingBoard.vue`

**Documentation references:** Spec § UI, § Controls; `useSound.ts`; keydown cleanup from `AppDialog.vue`; complete emit from `LudoBoard.vue`

- [ ] **Step 1: Extend sound**

```ts
export type SoundName = 'dice' | 'match' | 'hit' | 'win' | 'start'
```

Add `public/sounds/start.wav` (copy `hit.wav` or `win.wav` as placeholder if no asset).

- [ ] **Step 2: Implement RacingBoard.vue**

Props/emits (copy contract):

```ts
const props = defineProps<{ players: SessionPlayer[] }>()
const emit = defineEmits<{ complete: [winnerSeatIndexes: number[]] }>()
```

Behavior:

1. `createRacingGame({ players: props.players.map(p => ({ seatIndex: p.seatIndex, type: p.type })) })`
2. `requestAnimationFrame` loop → `game.tick(dt)` → sync reactive snapshot of `game.state` for template
3. On phase enter `racing`: `play('start')` once
4. On collision detected (speed drop / slowdown set): `play('hit')` (debounce per car)
5. When `getWinnerSeatIndex()` non-null: `play('win')`, `emit('complete', [seat])`, stop rAF
6. Keyboard (window/document `keydown` + `keyup` for edge tracking):
   - Map humans in seat order → control slots: first human A/D, second ←/→
   - Edge-trigger: fire `setLaneIntent` only on keydown when key was not already down
7. Each racing tick for AI seats: `const d = chooseRacingLaneDelta(...); if (d) game.setLaneIntent(seat, d)`
8. UI: 3-lane track; cars + obstacles positioned by `(progress - cameraProgress)` where `cameraProgress = max(car.progress)`; cars near bottom third; progress list with names/avatars; control hint during countdown; **no TurnBanner**
9. `onBeforeUnmount`: cancel rAF, remove key listeners

- [ ] **Step 3: Manual smoke** (dev)

```bash
bun run dev
```

Lobby → Spurrennen → 2 humans → start → countdown → race → finish → WinScreen

- [ ] **Step 4: Commit** `feat: add RacingBoard UI keyboard controls and start SFX`

**Anti-pattern guards:**
- Do not use TurnBanner
- Do not put game rules in template — only render state
- Do not forget listener/rAF cleanup

---

### Task 6: Optional UI source assertions

**Files:**
- Modify: `test/unit/final-review-ui.test.ts` (only if useful)

- [ ] Add lightweight asserts that `RacingBoard.vue` exists and emits `complete`, contains control hints (`A`/`D` or `Steuerung`)
- [ ] Commit if changed: `test: assert RacingBoard wiring in final-review-ui`

Skip if Task 5 already covered by engine/lobby tests and timeboxed.

---

## Final Phase: Verification

- [ ] **V1:** Grep anti-patterns

```bash
rg "GameEngine|applyAction" app/features/games/racing
rg "TurnBanner" app/features/games/racing
```

Expected: no matches (or comments only)

- [ ] **V2:** Registry complete

```bash
rg "racing" app/types/game.ts app/constants/games.ts app/pages/play/\[game\].vue app/components/hub/GameCard.vue
```

Expected: hits in all four

- [ ] **V3:** Unit tests

```bash
bun run test test/unit/racing-engine.test.ts test/unit/racing-ai.test.ts test/unit/racing-lobby.test.ts
bun run test
```

Expected: PASS (full suite green)

- [ ] **V4:** Build

```bash
bun run build
```

Expected: success

- [ ] **V5:** Spec coverage map (below) all rows Done

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| 3 lanes, auto speed, finish line | Task 1 |
| Collision → mild slowdown (70 %, 400 ms) | Task 1 |
| Per-car speed ramp (1,0× → 1,5×) | Task 1 |
| Countdown; no input before racing | Task 1 + 5 |
| `createRacingGame` contract | Task 1 |
| AI dodge same-lane obstacle | Task 2 |
| Lobby humans ≤2, ais ≤2, ≥2 players | Task 3 |
| GameId / GAMES / play / hub | Task 4 |
| Shared camera follows max progress | Task 5 |
| Keyboard P1 A/D, P2 arrows, edge-trigger | Task 5 |
| SFX start/hit/win | Task 5 |
| WinScreen via `@complete` | Task 4 + 5 |
| No Canvas / TurnBanner / boost | Final V1 |
| Unit tests listed in spec | Tasks 1–3 |

---

## Execution notes for agents

1. Execute tasks in order 1 → 6; Final Phase last
2. Each task is a new-chat-safe unit: re-read Spec + this plan Task N + cited source files before coding
3. Prefer copying cited patterns over inventing new abstractions
4. If playfeel constants feel wrong, adjust constants only — keep tests asserting relative behavior (slowdown < BASE_SPEED, clamp, winner)
