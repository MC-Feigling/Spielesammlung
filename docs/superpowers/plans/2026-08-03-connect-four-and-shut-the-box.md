# Vier gewinnt + Shut the Box — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two hot-seat games: `connectFour` (Vier gewinnt, exactly 2 players) and `shutTheBox` (2–4 players, dice + tile closes). Pure TS `GameEngine` + Vue boards; wire hub/lobby/play/profiles.

**Architecture:** Feature modules under `app/features/games/{connectFour,shutTheBox}/`. Shared `GameEngine` contract. Connect Four gets `lobby.ts` roster gate (exactly 2). Shut the Box uses Kniffel-style dice + pure `combos.ts`.

**Tech Stack:** TypeScript, Vue 3 Composition API, Vitest, Bun, Nuxt 4 (existing)

**Specs:**
- `docs/superpowers/specs/2026-08-03-connect-four-design.md`
- `docs/superpowers/specs/2026-08-03-shut-the-box-design.md`

## Global Constraints

- Bun only (`bun run test`, no npm/pnpm/yarn)
- TypeScript strict, no `any`
- German UI labels
- Work on `dev` branch
- Feature commits in English (`feat:`, `test:`, `docs:`)
- Use shared `GameEngine` — **not** racing `tick` API
- Board `emit('complete', winnerSeatIndexes: number[])`
- No Canvas / Phaser / WebGL
- No online multiplayer
- No lobby AI-difficulty UI (API default `easy` only)
- Do **not** invent new `SoundName` values unless wav + union updated (prefer existing `dice` / `win` / `match`)

---

## Phase 0: Documentation Discovery (complete)

### Sources consulted

| Source | Finding |
|--------|---------|
| `PROJECT_INFO.md` | MVP: Memory, Kniffel, Ludo, Spurrennen, UNO; Bun; branch `dev` |
| `docs/superpowers/specs/2026-08-03-kinder-spielesammlung-design.md` | Hot-seat + AI; ages 4–10; engine-per-game; German UI |
| `docs/superpowers/specs/2026-08-03-uno-singleplayer-design.md` | Spec template + lobby roster pattern |
| `docs/superpowers/specs/2026-08-03-racing-lane-design.md` | Spec/integration touchpoints template |
| `docs/superpowers/plans/2026-08-03-uno-singleplayer.md` | Plan phase style for `GameEngine` games |
| `docs/superpowers/plans/2026-08-03-racing-lane.md` | Task/TDD + Final Verification template |
| `app/features/games/shared/engine.ts` | `GameEngine` / `EngineResult` |
| `app/features/games/shared/ai.ts` | `AiDifficulty`, blunder rates |
| `app/features/games/memory/*` | Simplest turn board template |
| `app/features/games/kniffel/*` | Dice `random`, scoring module split, AI choose |
| `app/features/games/uno/lobby.ts` | Roster validator pattern |
| `app/types/game.ts`, `app/constants/games.ts` | `GameId` + catalog + `isGameId` dual touchpoint |
| `app/pages/play/[game].vue` | Board switch + `completeGame` / WinScreen |
| `app/components/hub/GameCard.vue` | `GAME_ICONS: Record<GameId, string>` |
| `app/components/ui/WinScreen.vue` | Multi-winner → „A und B gewinnen!“ (draw/tie OK) |
| `test/unit/kniffel-engine.test.ts`, `uno-lobby.test.ts` | Vitest patterns |
| Grep new ids | **No** `connectFour` / `shutTheBox` code yet |

### Allowed APIs / patterns (cite repo sources)

| Area | Use | Source |
|------|-----|--------|
| Engine contract | `GameEngine<TState, TAction>`, `EngineResult` | `app/features/games/shared/engine.ts` |
| AI difficulty | `AiDifficulty`, `DEFAULT_AI_DIFFICULTY` | `app/features/games/shared/ai.ts` |
| AI chooser | `chooseLudoAction(state, actions, options?)` style | `app/features/games/ludo/ai.ts` |
| Board AI loop | `watch` + `setTimeout` ~650–700ms + clear on unmount | `KniffelBoard.vue`, `LudoBoard.vue` |
| Board props/emit | `players: SessionPlayer[]`, `complete: [number[]]` | Any `*Board.vue` |
| Turn UX | `TurnBanner` | `app/components/ui/TurnBanner.vue` |
| Dice RNG | Injectable `random?: () => number` | `kniffel/engine.ts` |
| Pure helpers | Separate module from engine | `kniffel/scoring.ts` |
| Lobby roster gate | Pure `isXRosterValid` + lobby page gate | `uno/lobby.ts`, `racing/lobby.ts`, `lobby/[game].vue` |
| Registry | Extend `GameId`, `GAMES`, `isGameId` | `types/game.ts`, `constants/games.ts` |
| Hub icon | `GAME_ICONS` | `GameCard.vue` |
| Play mount | `v-else-if` + title if-chain | `play/[game].vue` |
| Wins | `completeGame` → `profiles.recordWin` | `play/[game].vue`, `stores/profiles.ts` |
| Sound | `useSound().play('dice' \| 'win' \| 'match')` | `composables/useSound.ts` |
| Unit tests | Vitest under `test/unit/` | `test/unit/*-engine.test.ts` |
| Auto-import boards | `~/features` components | `nuxt.config.ts` |

### Anti-patterns

- Do **not** use racing `tick` / `setLaneIntent` for these games
- Do **not** forget dual registry: `GameId` union **and** `isGameId` string checks (not derived from `GAMES`)
- Do **not** forget play-page **title** if-chain (separate from catalog)
- Do **not** put rules in Vue templates
- Do **not** add Connect Four with 3–4 players
- Do **not** implement Shut-the-Box 1-die mode or 1–12 tiles in v1
- Do **not** invent SoundNames without wav + union
- Do **not** use `any` or npm/pnpm/yarn
- Do **not** skip lobby gate for Connect Four (catalog maxPlayers alone is insufficient)

### Known gaps closed by this plan

1. New `GameId`s `connectFour` + `shutTheBox` + catalog + icons + play wiring
2. Connect Four lobby exactly-2 validator
3. Connect Four win/draw detection engine + AI
4. Shut the Box combo helper + dice turn engine + AI
5. `PROJECT_INFO.md` MVP list update
6. Blunder constants in `shared/ai.ts`

---

## File Structure

### Connect Four

| File | Responsibility |
|------|----------------|
| `app/features/games/connectFour/engine.ts` | 7×6 board, drop, win/draw, `createConnectFourGame` |
| `app/features/games/connectFour/ai.ts` | `chooseConnectFourAction` |
| `app/features/games/connectFour/lobby.ts` | `isConnectFourRosterValid` |
| `app/features/games/connectFour/ConnectFourBoard.vue` | Grid UI, TurnBanner, AI loop, emit complete |
| `test/unit/connect-four-engine.test.ts` | Engine rules |
| `test/unit/connect-four-ai.test.ts` | AI tactics |
| `test/unit/connect-four-lobby.test.ts` | Roster |

### Shut the Box

| File | Responsibility |
|------|----------------|
| `app/features/games/shutTheBox/combos.ts` | `openNumbers`, `remainingSum`, `legalCloses` |
| `app/features/games/shutTheBox/engine.ts` | `createShutTheBoxGame` |
| `app/features/games/shutTheBox/ai.ts` | `chooseShutTheBoxAction` |
| `app/features/games/shutTheBox/ShutTheBoxBoard.vue` | Tiles, dice, TurnBanner, AI loop |
| `test/unit/shut-the-box-combos.test.ts` | Pure combos |
| `test/unit/shut-the-box-engine.test.ts` | Engine rules |
| `test/unit/shut-the-box-ai.test.ts` | AI |

### Shared wiring (both games)

| File | Responsibility |
|------|----------------|
| `app/types/game.ts` | `GameId` union |
| `app/constants/games.ts` | `GAMES` + `isGameId` |
| `app/components/hub/GameCard.vue` | Icons |
| `app/pages/play/[game].vue` | Titles + boards |
| `app/pages/lobby/[game].vue` | Connect Four start gate + hint |
| `app/features/games/shared/ai.ts` | Blunder rates |
| `PROJECT_INFO.md` | MVP list |

---

## Phase 1: Connect Four engine (TDD)

**Spec refs:** `2026-08-03-connect-four-design.md` § Rules, § Engine contract  
**Copy test style from:** `test/unit/ludo-engine.test.ts` / `memory-engine.test.ts`  
**Files:** Create `engine.ts` + `test/unit/connect-four-engine.test.ts`

- [ ] **Step 1: Write failing tests** covering:
  - Empty board; seat 0 to move
  - Drop lands on lowest row
  - Stacking in same column
  - Reject drop into full column (German throw)
  - Horizontal / vertical / diagonal win → single winner
  - Full board no win → `[0, 1]`
  - Turn advances after non-terminal drop
  - `getValidActions` lists only non-full columns

```ts
import { describe, expect, it } from 'vitest'
import { createConnectFourGame } from '../../app/features/games/connectFour/engine'

describe('connect four engine', () => {
  it('drops into the lowest empty row', () => {
    const game = createConnectFourGame()
    const result = game.applyAction({ type: 'drop', column: 3 })
    expect(result.state.cells[3][0]).toBe(0)
    expect(result.state.currentPlayerIndex).toBe(1)
  })

  // … win H/V/diag, draw, full column …
})
```

- [ ] **Step 2:** `bun run test test/unit/connect-four-engine.test.ts` → FAIL
- [ ] **Step 3: Implement** `createConnectFourGame` per Spec (clone state; gravity; win scan from `lastMove`)
- [ ] **Step 4:** Tests PASS
- [ ] **Step 5: Commit** `test: add connect four engine coverage` / `feat: add connect four engine`

### Verification checklist

- [ ] `getState` deep-clone (mutating returned cells does not affect engine)
- [ ] Win detection all 4 directions
- [ ] Draw emits both seats

### Anti-pattern guards

- Do not store row-major as primary if Spec says column-major `cells[col][row]`
- Do not skip German error messages on invalid actions

---

## Phase 2: Connect Four AI + lobby (TDD)

**Spec refs:** § AI, § Lobby  
**Copy from:** `app/features/games/ludo/ai.ts`, `app/features/games/uno/lobby.ts`, `test/unit/uno-lobby.test.ts`  
**Files:** `ai.ts`, `lobby.ts`, `test/unit/connect-four-ai.test.ts`, `test/unit/connect-four-lobby.test.ts`, extend `shared/ai.ts`

- [ ] **Step 1:** Add `CONNECT_FOUR_EASY_BLUNDER_RATE` to `shared/ai.ts` (copy pattern of `KNIFFEL_EASY_BLUNDER_RATE`)
- [ ] **Step 2: Failing AI tests**
  - Hard: with winning drop available → chooses it
  - Hard: blocks opponent immediate win
  - Easy: with `Math.random` forced high blunder → can pick non-optimal (inject random if needed; or test hard path primarily + blunder branch with stub)
- [ ] **Step 3: Failing lobby tests**
  - 2 players → true
  - 1 or 3+ → false
- [ ] **Step 4:** Implement AI + `isConnectFourRosterValid`
- [ ] **Step 5:** PASS + commit `feat: add connect four ai and lobby gate`

### Verification checklist

- [ ] `chooseConnectFourAction` returns `null` only when `actions` empty
- [ ] Lobby helper matches UNO/racing input shape used by `lobby/[game].vue`

### Anti-pattern guards

- Do not add difficulty UI
- Do not require deep minimax — Spec allows heuristic

---

## Phase 3: Connect Four Board + registry wire-up

**Spec refs:** § UI, § Integration touchpoints  
**Copy from:** `MemoryBoard.vue` / `KniffelBoard.vue` headers + AI watch; UNO lobby gate in `lobby/[game].vue`

**Files:** `ConnectFourBoard.vue`; modify `types/game.ts`, `constants/games.ts`, `GameCard.vue`, `play/[game].vue`, `lobby/[game].vue`

- [ ] **Step 1: Registry**
  - `GameId` += `'connectFour'`
  - `GAMES` entry: title `Vier gewinnt`, blurb `4 in einer Reihe!`, `minPlayers: 2`, `maxPlayers: 2`
  - `isGameId` += branch
  - `GAME_ICONS.connectFour` (e.g. `🔴` or `4️⃣` — pick one non-emoji-conflict; repo already uses emoji icons)
- [ ] **Step 2: Play page** — title branch + `<ConnectFourBoard :players @complete="completeGame" />`
- [ ] **Step 3: Lobby** — `canStart` / hint when `routeGame === 'connectFour'` using `isConnectFourRosterValid` (copy racing/uno if-structure)
- [ ] **Step 4: Board**
  - `createConnectFourGame()` on setup
  - Human: click column → `applyAction` if seat is human & current
  - AI: watch + delay → `chooseConnectFourAction`
  - Emit `complete` when `winnerSeatIndexes.length > 0`
  - `TurnBanner` + `useSound().play('win')` on complete
- [ ] **Step 5:** Manual smoke (or source-wiring assert in unit test reading play page like `final-review-ui.test.ts` if pattern exists)
- [ ] **Step 6: Commit** `feat: wire connect four into hub lobby and play`

### Verification checklist

- [ ] `rg "connectFour" app/` shows types, constants, icon, play, lobby, feature files
- [ ] Lobby blocks start with ≠2 seats
- [ ] Board auto-imports (no manual import needed in play page — matches existing boards)

### Anti-pattern guards

- Do not mount board without `@complete="completeGame"`
- Do not allow >2 seats to start

---

## Phase 4: Shut the Box combos + engine (TDD)

**Spec refs:** `2026-08-03-shut-the-box-design.md` § Rules, § Pure helpers, § Engine  
**Copy from:** `kniffel/scoring.ts` + `kniffel/engine.ts` + `test/unit/kniffel-engine.test.ts`

**Files:** `combos.ts`, `engine.ts`, `test/unit/shut-the-box-combos.test.ts`, `test/unit/shut-the-box-engine.test.ts`

- [ ] **Step 1: Failing combo tests**
  - `legalCloses` for target 6 with all open includes `[6]`, `[1,5]`, `[2,4]`, `[1,2,3]`, …
  - Empty when no subset
  - Ignores closed tiles
  - `remainingSum` correct
- [ ] **Step 2: Implement `combos.ts`** → PASS
- [ ] **Step 3: Failing engine tests**
  - Start: all open, phase `awaitingRoll`, seat 0
  - `roll` with `random: () => 0` → dice `[1,1]`; phase `awaitingClose`
  - `close` valid subset → tiles shut; back to `awaitingRoll`
  - `roll` with no legal close → score set to remaining sum; next player
  - Perfect shut mid-turn → score 0; advance
  - All players scored → terminal; min score seat(s) win
  - Tie → multiple winners
  - Reject illegal close / roll in wrong phase (German errors)
- [ ] **Step 4: Implement engine** → PASS
- [ ] **Step 5: Commit** `feat: add shut the box combos and engine`

### Verification checklist

- [ ] Always 2 dice (no 1-die path)
- [ ] `playerCount` 2–4 validated at create (throw if invalid)
- [ ] Injectable `random` for tests

### Anti-pattern guards

- Do not put subset search only in Vue
- Do not require explicit `endTurn` action (Spec: auto on impossible roll / perfect shut)

---

## Phase 5: Shut the Box AI (TDD)

**Spec refs:** § AI  
**Copy from:** `kniffel/ai.ts`, blunder constants in `shared/ai.ts`

**Files:** `ai.ts`, `test/unit/shut-the-box-ai.test.ts`, `SHUT_THE_BOX_EASY_BLUNDER_RATE` in `shared/ai.ts`

- [ ] **Step 1: Failing tests**
  - `awaitingRoll` → `{ type: 'roll' }`
  - Hard with perfect-shut close available → chooses it
  - Hard prefers higher-number tiles when comparable (define fixture)
- [ ] **Step 2: Implement** → PASS
- [ ] **Step 3: Commit** `feat: add shut the box ai`

### Anti-pattern guards

- Do not call Math.random without respecting difficulty options in tests (inject or control)

---

## Phase 6: Shut the Box Board + registry wire-up

**Spec refs:** § UI, § Integration  
**Copy from:** `KniffelBoard.vue` (dice button + action apply)

**Files:** `ShutTheBoxBoard.vue`; extend registry files (same list as Phase 3)

- [ ] **Step 1: Registry** — `shutTheBox`, title `Shut the Box`, blurb `Zahlen zuklappen!`, min 2 max 4; icon; `isGameId`; play title + board
- [ ] **Step 2: Board**
  - Props `players`; `createShutTheBoxGame({ playerCount: players.length, … })`
  - UI: TurnBanner; Würfeln; 9 tile toggles + confirm close; score list
  - Disable illegal confirms; show running selection sum
  - AI watch loop
  - SFX: `dice` on roll, `match` on close (optional), `win` on complete
- [ ] **Step 3:** No special lobby gate
- [ ] **Step 4: Commit** `feat: wire shut the box into hub and play`

### Verification checklist

- [ ] `rg "shutTheBox" app/` complete
- [ ] Works with 2, 3, 4 players in engine tests already; Board uses `players.length`

### Anti-pattern guards

- Do not add `lobby.ts` for shut the box
- Do not invent 1-die UI

---

## Phase 7: Docs + PROJECT_INFO

- [ ] Update `PROJECT_INFO.md` MVP-Spiele line to include Vier gewinnt + Shut the Box
- [ ] Commit `docs: add connect four and shut the box to mvp list`

---

## Final Phase: Verification

- [ ] `bun run test` — all unit tests green
- [ ] `bun run build` — production build OK
- [ ] Anti-pattern greps:

```bash
rg "connectFour|shutTheBox" app/types/game.ts app/constants/games.ts app/pages/play app/components/hub
rg "isConnectFourRosterValid" app/pages/lobby app/features/games/connectFour
rg "tick\(|setLaneIntent" app/features/games/connectFour app/features/games/shutTheBox || true
rg "type: 'endTurn'" app/features/games/shutTheBox || true
```

Expected: registry hits present; no racing APIs in new games; no `endTurn` action.

### Spec coverage map

| Spec requirement | Phase |
|------------------|-------|
| CF 7×6 gravity + win/draw | 1 |
| CF AI + exactly-2 lobby | 2–3 |
| CF hub/play wire | 3 |
| STB combos + 2-dice engine | 4 |
| STB AI | 5 |
| STB hub/play wire | 6 |
| PROJECT_INFO | 7 |

### Manual acceptance

1. Vier gewinnt: 2 seats (1H+1AI) → play → win + draw paths  
2. Shut the Box: 3 seats mix → full round → lowest score WinScreen  
3. Sound mute respected  
4. Quit dialog still works  

---

## Execution notes for agents

1. Implement **Connect Four fully (Phases 1–3)** before Shut the Box (4–6) so registry churn stays reviewable; Phase 7 last.
2. Prefer small commits per phase (`test:` then `feat:`).
3. If Spec decisions conflict with playfeel, **update Spec first**, then code.
4. Boards own the engine instance — do not put engine state in Pinia.
5. After both games: run Final Verification before claiming done.
