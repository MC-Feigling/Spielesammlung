# Puzzle-Rennen (Puzzle Race)

## Goal

Add a simultaneous image-puzzle race: one human and 1–3 AIs solve the same scrambled picture. First finished board wins. Fits the existing hub → lobby → play shell.

## Decisions

| Topic | Choice |
| --- | --- |
| Puzzle type | Image tile puzzle (swap pieces), not sliding-15 |
| Race format | Same scramble for all seats; parallel solve; first solved wins |
| Grid sizes | `3x3`, `5x5`, `7x7` (default `3x3`) |
| Interaction | Tap two tiles to swap **and** drag-and-drop swap |
| Images | Built-in set under `public/puzzles/` **plus** optional local upload (DataURL for the round) |
| Players | Exactly 1 human + 1–3 AI (same roster rule as UNO) |
| Reference image | Hidden by default; shown via “Vorschau” button → dialog |
| AI visibility | Full mini-boards (real tile state), not progress bars only |
| Architecture | New feature folder; independent board state per seat; timer-driven AI (not shared turn engine) |
| Difficulty | Existing session `aiDifficulty` (`easy` / `medium` / `hard`) |

## Out of scope

- Online multiplayer
- Two humans racing in parallel
- Rotating tiles
- Persisting uploaded images across sessions / profiles
- New audio assets (reuse `useSound` start/win cues if already used elsewhere)
- Changing Memory or other games

## Catalog

| Field | Value |
| --- | --- |
| `GameId` | `puzzleRace` |
| Title | Puzzle-Rennen |
| Blurb | Wer legt das Bild zuerst? |
| Players | min 2, max 4 |
| Hub icon | 🧩 |

## Architecture

Clone registration pattern from Pferderennen / UNO. Do **not** use `shared/engine.ts` (turn-based). Each seat owns a tile array cloned from one shared scramble.

### Files

| Path | Role |
| --- | --- |
| `app/features/games/puzzleRace/engine.ts` | Scramble, swap, solved check, phases, winner |
| `app/features/games/puzzleRace/ai.ts` | Timed move chooser by difficulty |
| `app/features/games/puzzleRace/lobby.ts` | Roster validation (1 human + 1–3 AI) |
| `app/features/games/puzzleRace/PuzzleRaceBoard.vue` | Countdown, human board, AI mini-boards, preview, input |
| `app/features/games/puzzleRace/images.ts` | Built-in image catalog ids + paths |
| `public/puzzles/*` | 4–6 kid-friendly built-in images (SVG or PNG) |
| `test/unit/puzzle-race-engine.test.ts` | Engine unit tests |
| `test/unit/puzzle-race-ai.test.ts` | AI unit tests |
| `test/unit/puzzle-race-lobby.test.ts` | Lobby unit tests |

### Registration touchpoints

1. `app/types/game.ts` — add `'puzzleRace'` to `GameId`
2. `app/constants/games.ts` — `GAMES` entry + `isGameId`
3. `app/components/hub/GameCard.vue` — `GAME_ICONS.puzzleRace`
4. `app/stores/session.ts` — `puzzleGridSize`, `puzzleImageId`, `puzzleImageDataUrl` (+ setters; reset in `startLobby`)
5. `app/pages/lobby/[game].vue` — size select, image picker + upload, roster validation + hint
6. `app/pages/play/[game].vue` — title + `PuzzleRaceBoard`
7. `PROJECT_INFO.md` — list under MVP-Spiele

### Engine API

```ts
type PuzzleRacePhase = 'countdown' | 'racing' | 'finished'
type PuzzleGridSize = '3x3' | '5x5' | '7x7'

interface PuzzleRaceBoardState {
  seatIndex: number
  tiles: number[] // value = correct index; length = gridSize²
  selectedIndex: number | null
}

interface PuzzleRaceState {
  phase: PuzzleRacePhase
  countdownMs: number
  gridSize: number // 3 | 5 | 7
  imageUrl: string
  boards: PuzzleRaceBoardState[]
  winnerSeatIndex: number | null
}

interface PuzzleRaceGame {
  state: PuzzleRaceState
  tick: (dtMs: number) => void
  selectTile: (seatIndex: number, tileIndex: number) => void
  swapTiles: (seatIndex: number, a: number, b: number) => void
  applyAiSwap: (seatIndex: number, a: number, b: number) => void
  getWinnerSeatIndex: () => number | null
}

function createPuzzleRaceGame(config: {
  players: Array<{ seatIndex: number; type: 'human' | 'ai' }>
  gridSize: PuzzleGridSize
  imageUrl: string
  seed?: number
}): PuzzleRaceGame
```

Rules:

- Build identity tiles `0…n-1`, Fisher–Yates scramble with seed; reject identity-only scramble (reshuffle until at least one tile wrong).
- Clone scrambled array onto every seat board.
- Human and AI swaps only while `phase === 'racing'`.
- `selectTile`: first tap sets `selectedIndex`; second tap on different index swaps and clears selection; second tap on same index clears selection.
- `swapTiles` / `applyAiSwap`: swap two indices; if board becomes identity → set `winnerSeatIndex`, `phase = 'finished'` (first win locks; later swaps ignored).
- Countdown: ~3s; no swaps; show overlay.

### Lobby

```ts
function isPuzzleRaceRosterValid(
  players: ReadonlyArray<{ type: 'human' | 'ai' }>,
): boolean
```

Rules: length 2–4; exactly 1 human; 1–3 AI; all seats filled are human or AI. Same as UNO.

Hint when invalid but seats filled: `Genau 1 Mensch und 1–3 KI.`

Lobby UI extras (only for `puzzleRace`):

- Grid size select: `3x3` / `5x5` / `7x7`
- Built-in image picker (radio/cards from `images.ts`)
- File input: jpg/png/webp, max ~2 MB → read as DataURL into session; clears `puzzleImageId` when custom; custom preferred in play if set
- AI difficulty select when any AI seat (existing control)

### Session fields

| Field | Type | Default |
| --- | --- | --- |
| `puzzleGridSize` | `'3x3' \| '5x5' \| '7x7'` | `'3x3'` |
| `puzzleImageId` | `string` | first built-in id |
| `puzzleImageDataUrl` | `string \| null` | `null` |

Play resolves `imageUrl` = DataURL if present, else built-in path for `puzzleImageId`.

## Behavior

### Phases

1. **countdown** — 3s; ignore human/AI swaps; show controls hint
2. **racing** — human input + AI interval moves
3. **finished** — first solved board wins; emit `complete` once with `[winnerSeatIndex]`

### Human input

- Pointer: tap/click two tiles to swap (large hit targets).
- Drag: pointer down on tile → drag over another → drop swaps (or cancel if same / outside).
- Only the human seat receives input; AI boards are display-only.
- Clear selection on blur / phase change.

### Tile rendering

- One image URL sliced via CSS `background-image` + `background-size: N*100%` + `background-position` from tile value (correct index), not from current slot.
- Grid CSS `N × N` for size `N`.
- Selected tile: strong outline / scale for kids.
- AI mini-boards: same renderer, smaller scale; no pointer interaction.

### Reference preview

- Button “Vorschau” opens `AppDialog` (or existing dialog) with full image.
- Does not pause the race.

### AI

`choosePuzzleRaceSwap(tiles, options?: { difficulty?: AiDifficulty; random?: () => number }): { a: number; b: number } | null`

- Find indices where `tiles[i] !== i`.
- Correct move: pick a wrong index `i`, swap with index `tiles[i]` (places that piece correctly). Prefer this when not blundering.
- Blunder: swap two random distinct indices.
- Return `null` if already solved.

Board drives AI with `setInterval` / accumulated `tick` time per AI seat:

| Difficulty | Move interval (approx.) | Blunder rate |
| --- | --- | --- |
| easy | 1200 ms | 0.45 |
| medium | 700 ms | 0.22 |
| hard | 350 ms | 0.05 |

Constants live in `ai.ts` (same style as other games). Stagger AI seats slightly (e.g. +seatIndex × 80 ms) so boards do not move in lockstep.

### UI (`PuzzleRaceBoard.vue`)

- Top: countdown/status + “Vorschau”
- Main: large human board
- Side: stacked AI mini-boards with display name + avatar
- Responsive: on narrow screens stack AI boards below human board (still full mini grids, not bars)
- On finish: `emit('complete', [winnerSeatIndex])` once

### Wins / parental / profiles

Unchanged: `play/[game].vue` `completeGame` records wins for human winners; playtime guard remains global.

## Testing

| Suite | Must cover |
| --- | --- |
| Engine | Scramble ≠ identity; swap; select-then-swap; solved → finished; countdown gates input; first winner locks |
| AI | Hard prefers correcting swap; easy can blunder; solved → null |
| Lobby | Allow 1 human + 1–3 AI; reject 0 humans; reject 2+ humans; reject length outside 2–4 |

Also extend source-sniff UI tests that enumerate games if they would fail without the new id.

## Success criteria

- Hub shows Puzzle-Rennen; lobby enforces roster + size + image; play runs parallel race.
- Human can swap via tap and via drag.
- AI mini-boards visibly update; difficulty changes pace/accuracy.
- First solved shows WinScreen; human win increments profile count.
- Built-in image and upload path both render tiles.
- `bun run test` green; build succeeds.
