# Handwerker (Baustellen-Auftrag-Rennen)

## Goal

Add a turn-based handyman job race for ages ~6–8: players complete repair jobs by picking the matching tool and part. Highest job count after a fixed number of rounds wins. Primary mode is 1 human vs AI. Fits the existing hub → lobby → play shell.

## Decisions

| Topic | Choice |
| --- | --- |
| Core loop | Reveal job → choose tool → choose part → success = +1 job |
| Wrong pick | Turn ends immediately; no point; no further penalty |
| Rounds | Fixed **5 rounds**; every seat acts once per round |
| Win | Most completed jobs; ties → all tied seats win (same as other multi-winner games) |
| Players | Exactly **1 human + 1–3 AI** (same roster rule as UNO / Puzzle-Rennen) |
| Default lobby | 2 seats: human + 1 AI |
| Difficulty | Existing session `aiDifficulty` (`easy` / `medium` / `hard`) |
| Content | Built-in German job/tool/part catalog (SVG icons or emoji-free CSS illustrations) |
| Architecture | New feature folder; turn-based engine (own API, not `shared/engine.ts` required if pattern matches Shut-the-Box style `GameEngine`) |
| Language | UI copy German; code identifiers English |

## Out of scope

- Online multiplayer
- Two or more human seats
- Free-form drawing / drag physics
- Custom job upload
- New audio asset files (reuse `useSound` cues already in the app)
- Changing other games
- Parental / profile system changes

## Catalog

| Field | Value |
| --- | --- |
| `GameId` | `handyman` |
| Title | Handwerker |
| Blurb | Aufträge erledigen — Werkzeug und Teil wählen! |
| Players | min 2, max 4 |
| Hub icon | 🔧 |

## Architecture

Follow registration pattern from Puzzle-Rennen / UNO / Drachenkampf.

### Files

| Path | Role |
| --- | --- |
| `app/features/games/handyman/engine.ts` | Jobs deal, tool/part picks, rounds, scores, winner |
| `app/features/games/handyman/ai.ts` | AI tool/part chooser by difficulty |
| `app/features/games/handyman/lobby.ts` | Roster validation (1 human + 1–3 AI) |
| `app/features/games/handyman/catalog.ts` | Jobs, tools, parts + correct pairings |
| `app/features/games/handyman/HandymanBoard.vue` | Job card, choice tiles, scores, turn banner |
| `test/unit/handyman-engine.test.ts` | Engine unit tests |
| `test/unit/handyman-ai.test.ts` | AI unit tests |
| `test/unit/handyman-lobby.test.ts` | Lobby unit tests |

### Registration touchpoints

1. `app/types/game.ts` — add `'handyman'` to `GameId`
2. `app/constants/games.ts` — `GAMES` entry + `isGameId`
3. `app/components/hub/GameCard.vue` — `GAME_ICONS.handyman`
4. `app/pages/lobby/[game].vue` — roster validation + hint (reuse AI difficulty control)
5. `app/pages/play/[game].vue` — title + `HandymanBoard`
6. `PROJECT_INFO.md` — list under MVP-Spiele
7. Extend source-sniff / UI tests that enumerate `GameId`s if they would fail

No new session store fields required for MVP (fixed 5 rounds; catalog built-in).

### Catalog model

```ts
type ToolId = 'hammer' | 'screwdriver' | 'wrench' | 'pliers' | 'paintbrush' | 'tape'
type PartId = 'nail' | 'screw' | 'pipe' | 'wire' | 'paint' | 'hinge'

interface HandymanJob {
  id: string
  title: string // short German label, e.g. "Lampe reparieren"
  toolId: ToolId
  partId: PartId
}

interface HandymanChoiceSet {
  tools: ToolId[] // length 3: 1 correct + 2 distractors
  parts: PartId[] // length 3: 1 correct + 2 distractors
}
```

MVP catalog size: **8 jobs** minimum (enough variety for 5 rounds × up to 4 players without immediate repeats when possible).

Jobs (initial set):

| id | title | tool | part |
| --- | --- | --- | --- |
| `lamp` | Lampe reparieren | screwdriver | wire |
| `faucet` | Wasserhahn dicht machen | wrench | pipe |
| `picture` | Bild aufhängen | hammer | nail |
| `shelf` | Regal festschrauben | screwdriver | screw |
| `door` | Tür einhängen | screwdriver | hinge |
| `bike` | Fahrrad festziehen | wrench | screw |
| `cable` | Kabel greifen | pliers | wire |
| `fence` | Zaun streichen | paintbrush | paint |

Distractors: random other tools/parts from the catalog, excluding the correct id; seeded RNG for tests.

### Engine API

```ts
type HandymanPhase = 'pickTool' | 'pickPart' | 'feedback' | 'finished'

interface HandymanPlayerState {
  seatIndex: number
  jobsCompleted: number
}

interface HandymanState {
  phase: HandymanPhase
  roundIndex: number // 0..TOTAL_ROUNDS-1
  totalRounds: number // 5
  currentSeatIndex: number
  players: HandymanPlayerState[]
  currentJobId: string | null
  choices: HandymanChoiceSet | null
  selectedToolId: ToolId | null
  lastFeedback: 'correct' | 'wrongTool' | 'wrongPart' | null
  winnerSeatIndexes: number[]
}

interface HandymanGame {
  getState: () => HandymanState
  pickTool: (seatIndex: number, toolId: ToolId) => void
  pickPart: (seatIndex: number, partId: PartId) => void
  acknowledgeFeedback: () => void // advances after short feedback; AI auto-acks via board timer
  getWinnerSeatIndexes: () => number[]
}

function createHandymanGame(config: {
  players: Array<{ seatIndex: number; type: 'human' | 'ai' }>
  seed?: number
  totalRounds?: number // default 5
}): HandymanGame
```

Rules:

- Start: `roundIndex = 0`, `currentSeatIndex =` first seat, deal a job + choice set, `phase = 'pickTool'`.
- Only `currentSeatIndex` may call `pickTool` / `pickPart`; others ignored.
- `pickTool`: if wrong → `lastFeedback = 'wrongTool'`, `phase = 'feedback'`, no score. If right → store `selectedToolId`, `phase = 'pickPart'`.
- `pickPart`: if wrong → `lastFeedback = 'wrongPart'`, `phase = 'feedback'`. If right → `jobsCompleted += 1`, `lastFeedback = 'correct'`, `phase = 'feedback'`.
- `acknowledgeFeedback`: advance to next seat; if all seats acted this round → `roundIndex += 1`. If `roundIndex === totalRounds` → compute winners, `phase = 'finished'`. Else deal new job for next seat, `phase = 'pickTool'`.
- Job deal: prefer unused job ids in the match; if exhausted, reshuffle and allow repeats.
- Winners: max `jobsCompleted`; all seats with that max (if > 0 or including 0-all-tie) win — use same tie rule as other score games: all tied max scores win even if 0.

Constants in `engine.ts`: `TOTAL_ROUNDS_DEFAULT = 5`, `CHOICE_COUNT = 3`.

### Lobby

```ts
function isHandymanRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean
```

Rules: length 2–4; exactly 1 human; 1–3 AI; all seats human or AI.

Hint when invalid but seats filled: `Genau 1 Mensch und 1–3 KI.`

Lobby UI: reuse existing AI difficulty select when any AI seat. No extra options for MVP.

### AI

```ts
function chooseHandymanTool(
  job: HandymanJob,
  tools: ToolId[],
  options?: { difficulty?: AiDifficulty; random?: () => number },
): ToolId

function chooseHandymanPart(
  job: HandymanJob,
  parts: PartId[],
  options?: { difficulty?: AiDifficulty; random?: () => number },
): PartId
```

Blunder = pick a random **incorrect** option when available; else pick correct.

| Difficulty | Blunder rate |
| --- | --- |
| easy | 0.40 |
| medium | 0.20 |
| hard | 0.05 |

Board drives AI: when current seat is AI and phase is `pickTool` / `pickPart`, wait ~600–900 ms then call chooser; on `feedback`, wait ~700 ms then `acknowledgeFeedback`. Human feedback shows a “Weiter”-button and also auto-advances after 1.2 s (whichever comes first).

## Behavior

### Phases

1. **pickTool** — show job + 3 tool tiles
2. **pickPart** — show job + selected tool highlight + 3 part tiles
3. **feedback** — correct / wrong message; then next turn
4. **finished** — emit `complete` once with `winnerSeatIndexes`

### Human input

- Large tap targets for tools/parts only on human’s turn.
- No multi-select; one pick per phase.
- Ignore input during AI turns and `finished`.

### UI (`HandymanBoard.vue`)

- Top: round `Runde X / 5` + `TurnBanner` (whose turn)
- Score row: each seat avatar/name + jobs completed
- Center: job title + simple illustration (CSS/SVG, no photo dependency)
- Choice row: 3 large tiles (icon + short German label)
- Feedback overlay/banner: “Super!” / “Nicht passend”
- Visual direction: bright workshop (wood/metal accents); large type; no dark mode; no purple glow
- On finish: `emit('complete', winnerSeatIndexes)` once

### Wins / parental / profiles

Unchanged: `play/[game].vue` `completeGame` records wins for human winners; playtime guard remains global.

## Testing

| Suite | Must cover |
| --- | --- |
| Engine | Deal job; correct tool→part→score; wrong tool ends turn; wrong part ends turn; 5 rounds → finished; tie winners |
| AI | Hard usually correct; easy can blunder; always returns an offered id |
| Lobby | Allow 1 human + 1–3 AI; reject 0 humans; reject 2+ humans; reject length outside 2–4 |

Also extend source-sniff UI tests that enumerate games if they would fail without the new id.

## Success criteria

- Hub shows Handwerker; lobby enforces 1 human + 1–3 AI; play runs 5-round job race.
- Human completes jobs via tool then part; wrong pick skips scoring for that turn.
- AI turns visibly play; difficulty changes blunder rate.
- Finished shows WinScreen; human win increments profile count.
- `bun run test` green; build succeeds.
