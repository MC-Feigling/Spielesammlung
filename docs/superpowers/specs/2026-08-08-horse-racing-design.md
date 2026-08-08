# Pferderennen (Horse Racing)

## Goal

Add a 2–4 player side-view horse race to the Spielesammlung. Players hold a key to gallop, release to slow down, and jump over hurdles. Same hub/lobby/play shell as Spurrennen, different real-time mechanics.

## Decisions

| Topic | Choice |
| --- | --- |
| Game feel | Side view, not lane-dodge like Spurrennen |
| Drive | Hold key = accelerate toward max speed; release = decelerate |
| Obstacles | Hurdles; jump key clears them; miss applies slowdown |
| Players | 2–4 seats; 1–2 humans; remaining seats AI |
| Controls P1 | Hold `D`, jump `F` (keyboard only) |
| Controls P2 | Hold `J`, jump `K` (keyboard only) |
| Race length | Clean-run target ≈ 2–3 minutes |
| Architecture | New feature folder (tick engine), clone registration pattern from racing |
| Shared turn engine | Not used (`shared/engine.ts` is turn-based) |

## Out of scope

- Lane switching / multi-lane track
- Online multiplayer
- Betting / odds
- Custom horse skins beyond seat colors
- Touch / gamepad controls (keyboard only, like Spurrennen)
- Changing Spurrennen behavior

## Catalog

| Field | Value |
| --- | --- |
| `GameId` | `horseRacing` |
| Title | Pferderennen |
| Blurb | Halten, springen, zuerst ins Ziel! |
| Players | min 2, max 4 |
| Hub icon | 🐴 |

## Architecture

Mirror Spurrennen registration and real-time loop; do not fork `racing/engine.ts`.

### Files

| Path | Role |
| --- | --- |
| `app/features/games/horseRacing/engine.ts` | Simulation: hold, jump, hurdles, finish |
| `app/features/games/horseRacing/ai.ts` | Hold/jump decisions by difficulty |
| `app/features/games/horseRacing/lobby.ts` | Roster validation |
| `app/features/games/horseRacing/HorseRacingBoard.vue` | rAF loop, keyboard, side-view UI |
| `test/unit/horse-racing-engine.test.ts` | Engine unit tests |
| `test/unit/horse-racing-ai.test.ts` | AI unit tests |
| `test/unit/horse-racing-lobby.test.ts` | Lobby unit tests |

### Registration touchpoints (same pattern as racing)

1. `app/types/game.ts` — add `'horseRacing'` to `GameId`
2. `app/constants/games.ts` — `GAMES` entry + `isGameId`
3. `app/components/hub/GameCard.vue` — `GAME_ICONS.horseRacing`
4. `app/pages/lobby/[game].vue` — `isHorseRacingRosterValid` + hint
5. `app/pages/play/[game].vue` — title + `HorseRacingBoard`
6. `PROJECT_INFO.md` — list under MVP-Spiele

### Engine API

```ts
type HorseRacingPhase = 'countdown' | 'racing' | 'finished'

interface HorseRacingHorse {
  seatIndex: number
  progress: number
  speed: number
  hold: boolean
  airMs: number // > 0 while jumping
  slowdownUntil: number
}

interface HorseRacingHurdle {
  id: number
  progress: number
}

interface HorseRacingState {
  phase: HorseRacingPhase
  countdownMs: number
  horses: HorseRacingHorse[]
  hurdles: HorseRacingHurdle[]
  trackLength: number
}

interface HorseRacingGame {
  state: HorseRacingState
  tick: (dtMs: number) => void
  setHold: (seatIndex: number, held: boolean) => void
  jump: (seatIndex: number) => void
  getWinnerSeatIndex: () => number | null
}

function createHorseRacingGame(config: {
  players: Array<{ seatIndex: number; type: 'human' | 'ai' }>
}): HorseRacingGame
```

### Lobby

```ts
function isHorseRacingRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean
```

Rules: length 2–4; humans 1–2; AI = remainder (0–3). Reject 0 humans. Reject >2 humans.

Hint when invalid roster but seats filled: `1–2 Menschen, Rest KI.`

## Behavior

### Phases

1. **countdown** — 3s; holds/jumps ignored; show controls hint
2. **racing** — physics + hurdle spawn; AI acts each tick
3. **finished** — first horse with `progress >= trackLength` wins; emit `complete` with winner seat

### Physics (constants live in `engine.ts`)

- Holding while racing accelerates toward `BASE_SPEED * speedMult(progress)` (gentle ramp over race, similar spirit to Spurrennen’s `SPEED_RAMP`).
- Not holding decelerates toward a low coast speed (not instant stop), so short releases do not fully stall.
- `jump(seat)` only in `racing`, only if `airMs === 0` (no mid-air double jump); sets `airMs = JUMP_AIR_MS`.
- While `airMs > 0`, horse clears hurdle collision vertically (treated as airborne).
- Hurdle collision when not airborne and overlapping progress window: edge-triggered slowdown (`SLOWDOWN_MS`, `SLOWDOWN_FACTOR`), same edge-trigger idea as Spurrennen obstacles.
- Hurdles spawn ahead of leader at intervals that tighten slightly with race progress; always jumpable (no stacked impossible patterns).
- Prune hurdles behind camera.

### Controls

| Seat | Hold | Jump |
| --- | --- | --- |
| First human | `D` / `d` | `F` / `f` |
| Second human | `J` / `j` | `K` / `k` |

- Hold keys: `keydown` → `setHold(true)`, `keyup` → `setHold(false)`; also clear hold on blur/unmount.
- Jump keys: edge on `keydown` (ignore auto-repeat via held-key set).
- Keyboard only (no on-screen control pads).
- Camera always frames the full pack (trailing horse stays on screen).
- Prevent default on control keys used for play.

### AI

`chooseHorseRacingActions(state, seatIndex, options?)` returns `{ hold: boolean; jump: boolean }`.

- Default: hold `true` during racing.
- If a hurdle is within jump look-ahead and timing window: `jump: true`.
- Easy / medium: probability to jump late or skip (blunder), using `AiDifficulty` from session (same enum as other games).
- Hard: reliable jump in window.

Board applies AI each frame for AI seats: `setHold` + conditional `jump`.

### UI (`HorseRacingBoard.vue`)

- Horses as clear side-view SVG silhouettes (head, neck, body, legs, tail); vertical offset while airborne; name pill.
- Camera frames entire pack so trailing horses stay visible.
- Hurdles as vertical bars on the ground plane.
- Progress bar (~2–3 min label).
- Countdown overlay + keyboard legend (P1 D/F, P2 J/K).
- Sounds via existing `useSound` where racing already plays start/hit/win cues (reuse same play calls if available; no new audio assets required for v1).
- On finish: `emit('complete', [winnerSeatIndex])` once.

### Wins / parental / profiles

Unchanged: `play/[game].vue` `completeGame` records wins for human winners; playtime guard remains global.

## Testing

| Suite | Must cover |
| --- | --- |
| Engine | Hold accelerates; release decelerates; jump clears hurdle; miss slows; finish sets winner; countdown gates input |
| AI | Jump when hurdle ahead (hard); easy can skip |
| Lobby | Allow 1 human + 1–3 AI; allow 2 humans + 0–2 AI; reject 0 humans; reject 3 humans; reject length outside 2–4 |

Also extend any source-sniff UI tests that assert game wiring (e.g. `final-review-ui.test.ts`) only if they enumerate games and would fail without the new id.

## Success criteria

- Hub shows Pferderennen; lobby enforces roster; play runs side-view race.
- Two humans can hold/jump on one keyboard without fighting keys.
- Missed hurdle visibly slows; cleared hurdle does not.
- First to finish shows WinScreen; human win increments profile count.
- `bun run test` green; build succeeds.
