# UNO Singleplayer vs AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hot-seat UNO (`uno`): classic simplified rules, 2–4 seats (1 human + up to 3 AI), pure TS `GameEngine` + Vue board.

**Architecture:** Feature module `app/features/games/uno/` with `createUnoGame` implementing `GameEngine`. Wire hub/lobby/play like Kniffel/Ludo. AI via `chooseUnoAction` + Board `scheduleAiAction`.

**Tech Stack:** TypeScript, Vue 3 Composition API, Vitest, Bun, Nuxt 4 (existing)

**Spec:** `docs/superpowers/specs/2026-08-03-uno-singleplayer-design.md`

## Global Constraints

- Bun only (`bun run test`, no npm/pnpm/yarn)
- TypeScript strict, no `any`
- German UI labels
- Work on `dev` branch
- Feature commits in English (`feat:`, `test:`, `docs:`)
- Use shared `GameEngine` — **not** racing tick API
- Board `emit('complete', winnerSeatIndexes: number[])`
- No Mattel assets; CSS/SVG cards only
- No online, no +4 challenge, no manual UNO call
- **Do** implement +2/+4 stacking per Spec

---

## Phase 0: Documentation Discovery (complete)

### Sources consulted

| Source | Finding |
|--------|---------|
| `PROJECT_INFO.md` | MVP list has no UNO yet; Bun; branch `dev` |
| `docs/superpowers/specs/2026-08-03-kinder-spielesammlung-design.md` | Hot-seat + AI; ages 4–10; engine-per-game; German UI |
| `docs/superpowers/specs/2026-08-03-racing-lane-design.md` | Spec skeleton template |
| `docs/superpowers/plans/2026-08-03-racing-lane.md` | Plan skeleton / phase style |
| `app/features/games/shared/engine.ts` | `GameEngine` / `EngineResult` |
| `app/features/games/shared/ai.ts` | `AiDifficulty`, blunder rates |
| `app/features/games/{kniffel,ludo,memory}/*` | Board AI watch + delay pattern |
| `app/constants/games.ts`, `app/types/game.ts` | Catalog registration |
| Grep `uno` | **No existing UNO code** |
| Claude-mem search | No prior UNO sessions |

### Allowed APIs / patterns (cite repo sources)

| Area | Use | Source |
|------|-----|--------|
| Engine contract | `GameEngine<TState, TAction>`, `EngineResult` | `app/features/games/shared/engine.ts` |
| AI difficulty | `AiDifficulty`, `DEFAULT_AI_DIFFICULTY` | `app/features/games/shared/ai.ts` |
| AI chooser shape | `chooseLudoAction(state, actions, options?)` | `app/features/games/ludo/ai.ts` |
| Board AI loop | `isAiTurn` + `setTimeout` + `watch` + clear on unmount | `KniffelBoard.vue` (~650ms), `LudoBoard.vue` (~700ms) |
| Board props/emit | `players: SessionPlayer[]`, `complete: [number[]]` | Any `*Board.vue` header |
| Turn UX | `TurnBanner` | `app/components/ui/TurnBanner.vue` |
| Game registry | Extend `GameId`, `GAMES`, `isGameId` | `app/types/game.ts`, `app/constants/games.ts` |
| Hub icon | `GAME_ICONS` | `app/components/hub/GameCard.vue` |
| Play mount | `v-else-if` Board switch | `app/pages/play/[game].vue` |
| Lobby seats | 2–4, human/AI — **no** racing roster gate | `session.ts`, `PlayerSeat.vue` |
| Wins | `completeGame` → profiles | `play/[game].vue` |
| Sound | `useSound().play(...)` existing names first | `app/composables/useSound.ts` |
| Unit tests | Vitest under `test/unit/` | `test/unit/ludo-engine.test.ts`, `kniffel-ai.test.ts` |

### Anti-patterns

- Do **not** invent Online/WebSocket APIs
- Do **not** use racing `tick` / `setLaneIntent` for UNO
- Do **not** add lobby difficulty UI (API only, default easy)
- Do **not** add Racing-style human/AI caps
- Do **not** implement +4 challenge in v1
- Do **not** allow +2 on top of a +4-pending stack (no downgrade)
- Do **not** require manual “UNO” shout
- Do **not** use `any` or npm
- Do **not** put game rules in Vue template

### Known gaps closed by this plan

1. New `GameId: 'uno'` + catalog + play wiring
2. Card engine (no prior card-hand game; Memory is flip-pairs only)
3. Wild color choice as engine action + UI
4. AI blunder constant `UNO_EASY_BLUNDER_RATE` in `shared/ai.ts`
5. `pendingDrawCount` + stack legal moves / accept-draw

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/features/games/uno/engine.ts` | Types, deck, `createUnoGame`, rules |
| `app/features/games/uno/ai.ts` | `chooseUnoAction` |
| `app/features/games/uno/UnoBoard.vue` | UI + AI scheduling + emit complete |
| `app/features/games/shared/ai.ts` | Add `UNO_EASY_BLUNDER_RATE` |
| `app/types/game.ts` | `'uno'` in `GameId` |
| `app/constants/games.ts` | Catalog + `isGameId` |
| `app/components/hub/GameCard.vue` | `GAME_ICONS.uno` |
| `app/pages/play/[game].vue` | Title + `<UnoBoard>` |
| `PROJECT_INFO.md` | Mention UNO (optional after ship) |
| `test/unit/uno-engine.test.ts` | Rules |
| `test/unit/uno-ai.test.ts` | AI |

---

## Phase 1: Engine types + deck + deal

**What to implement**

- Copy `GameEngine` interface usage from `createLudoGame` / `createKniffelGame` factories.
- Define card/state/action types per Spec § Rules.
- Build 108-card deck, shuffle (`seed` optional), deal 7, start discard = first **number** card.

**Documentation references**

- Spec: `docs/superpowers/specs/2026-08-03-uno-singleplayer-design.md` § Rules / Deal
- Engine: `app/features/games/shared/engine.ts`
- Seeded RNG pattern: `ludo/engine.ts` or `memory/engine.ts` (if present)

**Suggested types (implement exactly in engine.ts)**

```ts
export type UnoColor = 'red' | 'yellow' | 'green' | 'blue'
export type UnoRank =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'drawTwo' | 'wild' | 'wildDrawFour'

export interface UnoCard {
  id: string
  color: UnoColor | 'wild'
  rank: UnoRank
}

export type UnoAction =
  | { type: 'play'; cardId: string; chosenColor?: UnoColor }
  | { type: 'draw' }

// state: hands[], drawPile, discardPile, currentColor, currentPlayerIndex,
// direction: 1 | -1, pendingDrawCount: number (0 = no stack)
```

**Tasks**

- [ ] Add `createUnoGame(options: { playerCount: number; seed?: number }): GameEngine<UnoGameState, UnoAction>`
- [ ] Implement `buildDeck`, `shuffle`, `deal`
- [ ] `getState` / `isTerminal` (false until empty hand)
- [ ] Init `pendingDrawCount: 0`

**Verification**

- [ ] `bun run test` — new `uno-engine` tests: deck size 108; each player 7 cards; discard top is number; `playerCount` 2–4

**Anti-pattern guards**

- No Vue imports in `engine.ts`
- No challenge fields

---

## Phase 2: Legal moves + apply effects

**What to implement**

- `getValidActions`: all legal `play` for current hand + `draw` when no legal play (or always allow draw? — Spec: must play if able → `draw` only when no legal play; after forced draw of playable card, only that play is valid — model as: `draw` action may auto-play in `applyAction` per Spec § Draw)
- Prefer clearest model matching Spec:

```
draw apply:
  take 1 card
  if legal → auto-play it (and run effects / color for wild: AI/human must still choose — for auto-play wild after draw, choose via required follow-up OR refuse auto-play of wild without color)

Recommendation for v1 simplicity:
  - After draw, if card is non-wild and legal → auto-play
  - If wild → stay in hand, turn ends (no force wild without color) OR require `play` next — Spec says "gezogene Karte sofort spielbar wenn legal"; wild is legal always → need color. Implement: drawn wild/wild+4 becomes immediate play requiring `chosenColor` only when human/AI supplies it in same action path: `applyAction({type:'draw'})` returns state with `awaitingColorForCardId` OR split: draw ends turn if wild (exception). 

DECIDED for implementers: After draw, if card legal and not wild → auto-play with effects. If wild/wildDrawFour → auto-play with `chosenColor` = currentColor (keeps color) for engine purity; UI never exposes post-draw wild picker. Document in engine comment.
```

- Effects table from Spec (Skip, Reverse, DrawTwo, Wild, WildDrawFour)
- Stacking: Spec § Stacking — `pendingDrawCount`; +2 on +2; +4 on +2 or +4; **not** +2 on +4
- Accept stack: `draw` while `pendingDrawCount > 0` → draw that many, clear pending, end turn
- 2-player reverse = direction flip then advance (effective skip)
- Recycle draw pile when empty
- Win when hand length 0

**Documentation references**

- Spec § Legal play / Effects / Stacking / Draw / Win
- `ludo/engine.ts` `applyAction` + `getValidActions` pattern

**Tasks**

- [ ] `isLegalPlay(card, top, currentColor, pendingDrawCount)`
- [ ] `getValidActions` — stack mode vs normal mode
- [ ] `applyAction` for play + draw + all effects + stack accept
- [ ] Advance turn helper respecting direction + skips (no auto-skip on +2/+4; victim plays or accepts)
- [ ] Track whether pending originated as +2-chain vs +4-only (e.g. `pendingDrawKind: 'drawTwo' | 'wildDrawFour' | null`) so +2-on-+4 is rejected

**Verification**

- [ ] Unit tests: color match, rank match, wild; skip; reverse 2p & 4p
- [ ] Stack: +2 → +2 → accept draws 4; +2 → +4 → accept draws 6; +4 pending rejects +2; chain across seats
- [ ] recycle; win empties hand
- [ ] Grep engine: no `challenge`

**Anti-pattern guards**

- Do not instantly force draw on playing +2/+4 (open stack instead)
- Do not allow +2 while `pendingDrawKind === 'wildDrawFour'`
- Do not leave `currentColor` unset after wild

---

## Phase 3: AI

**What to implement**

- Copy Ludo AI shape: `chooseUnoAction(state, actions, options?)`
- Add `UNO_EASY_BLUNDER_RATE = 0.45` (or similar) to `shared/ai.ts`
- hard heuristic per Spec § AI (prefer stack when `pendingDrawCount > 0`)
- easy: random legal action at blunder rate (often accept stack)

**Documentation references**

- Spec § AI
- `app/features/games/ludo/ai.ts`
- `app/features/games/shared/ai.ts`
- Tests: `test/unit/kniffel-ai.test.ts` / ludo AI section

**Tasks**

- [ ] Implement `chooseUnoAction`
- [ ] Unit tests hard vs easy with injected `random`

**Verification**

- [ ] `bun run test` — `uno-ai.test.ts` passes
- [ ] Boards call without difficulty → default easy via shared default

**Anti-pattern guards**

- Do not call AI from engine
- Do not invent difficulty values beyond `'easy' | 'hard'`

---

## Phase 4: UnoBoard UI + AI loop

**What to implement**

- Copy AI scheduling from `LudoBoard.vue` (`AI_ACTION_DELAY_MS = 700`)
- Props/emit like other boards
- Render: discard, draw pile, human hand (only legal cards interactive on human turn), AI hands as backs + count
- Wild color picker when human plays wild
- Stack UI: show pending count + hint („Ziehe X oder lege +2/+4“)
- `TurnBanner`, win → `emit('complete', …)`
- Block human input on `isAiTurn`

**Documentation references**

- Spec § UI
- `LudoBoard.vue` scheduleAiAction watch
- `TurnBanner.vue`
- `useSound` for play/draw/win if names exist

**Tasks**

- [ ] Create `UnoBoard.vue`
- [ ] Wire AI watch + timeout cleanup
- [ ] German labels (`Ziehen`, `Du bist dran`, Farben)

**Verification**

- [ ] Manual: Lobby 1 human + 3 AI → play starts; AI turns advance; human can win/lose
- [ ] `final-review-ui` / hub tests: update if they assert game list length

**Anti-pattern guards**

- No rules logic in template
- No racing rAF loop
- Do not show AI card faces

---

## Phase 5: Registration + polish

**What to implement**

- Extend `GameId`, `GAMES`, `isGameId`
- `GAME_ICONS.uno`
- `play/[game].vue` branch
- Optional: `PROJECT_INFO.md` MVP bullet
- Optional SFX only if existing names insufficient

**Documentation references**

- Racing plan Phase registration (same touch points without lobby gate)
- `app/constants/games.ts`
- `app/pages/play/[game].vue`

**Tasks**

- [ ] Registry wiring
- [ ] Hub card appears with blurb e.g. `Lege Karten und besiege die Roboter!`
- [ ] `minPlayers: 2`, `maxPlayers: 4`

**Verification**

- [ ] `isGameId('uno') === true`
- [ ] Navigate `/lobby/uno` → seats → `/play/uno`
- [ ] Win increments profile wins for `uno`

**Anti-pattern guards**

- Do not add `isUnoRosterValid` unless product asks
- Do not touch racing lobby caps

---

## Phase 6: Verification (final)

**What to implement**

- Full test run + anti-pattern grep + quick manual checklist

**Tasks**

- [ ] `bun run test`
- [ ] `bun run build` (typecheck/SSR client build OK)
- [ ] Grep guards:

```bash
rg "challenge|mustSayUno" app/features/games/uno
rg "pendingDrawCount" app/features/games/uno
rg "createRacingGame|requestAnimationFrame" app/features/games/uno
rg "'uno'" app/types/game.ts app/constants/games.ts
```

- [ ] Confirm docs: Spec decisions match code (auto UNO, no challenge, stacking on)
- [ ] Confirm stack tests cover +2/+2, +2/+4, reject +2-on-+4
- [ ] Confirm AI delay present; human cannot click on AI turn

**Verification checklist**

- [ ] Engine: 108 cards, effects, stacking, recycle, win
- [ ] AI: easy/hard + stack preference tested
- [ ] UI: 1H+3AI path works; pending-draw hint visible
- [ ] Wins recorded
- [ ] No invented APIs outside Allowed list

**Anti-pattern guards**

- Do not claim done without `bun run test` output
- Do not expand scope to scoring/tournaments / +4 challenge

---

## Execution notes for agents

1. Prefer **one phase per commit** (`feat:`, `test:`).
2. Read Spec before each phase; do not invent house rules.
3. If Spec draft decisions change (user rejects auto-wild-after-draw color), update Spec first, then code.
4. Fallback exploration: code-review-graph MCP if available; else Grep/Read as used in Phase 0.
