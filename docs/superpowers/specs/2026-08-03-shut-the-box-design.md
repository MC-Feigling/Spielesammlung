# Shut the Box Design

Date: 2026-08-03  
Status: approved (planning)  
Scope: Neues Hot-Seat-Würfelspiel `shutTheBox` — 2–4 Sitze (Human/AI)

## Goal

Kinderfreundliches Shut the Box lokal im Browser: Zahlen 1–9 zuklappen, Würfelsumme treffen, niedrigste Restsumme gewinnt. Klarer Zug-Hinweis, große Targets, Deutsch.

## Decisions

| Topic | Choice |
|-------|--------|
| GameId | `shutTheBox` |
| Titel / Blurb | `Shut the Box` / `Zahlen zuklappen!` |
| Spieler | Lobby **2–4 Sitze**, Human/AI frei (wie Kniffel/Memory) — **kein** Sonder-Roster |
| Brett / Box | Zahlen **1–9**, pro Spieler eigene Box |
| Würfel | **Immer 2 Würfel** (1–6); kein 1-Würfel-Modus in v1 |
| Zugablauf | Würfeln → Kombination zuklappen → erneut würfeln bis keine legale Kombi → Zugende |
| Wertung | Nach Zugende: `score = Summe offener Zahlen`; nach allen Spielern einmal: **niedrigste Score gewinnt** |
| Perfect shut | Alle zu → Score `0` (bester Wert) |
| Unentschieden | Mehrere mit gleicher Min-Score → alle in `winnerSeatIndexes` |
| Engine | Pure TS `GameEngine` + reines `scoring`/`combos`-Modul |
| AI Difficulty | Code: `easy` \| `hard`; Default `easy`; keine Lobby-UI |
| TurnBanner | Ja |
| Online | Nein |

### Alternatives considered (not chosen)

| Option | Why not (v1) |
|--------|----------------|
| Geteilte Box / ein Durchgang global | Weniger fair Hot-Seat; eigene Box klarer |
| 1-Würfel-Option wenn max offen ≤ 6 | Extra UI/Regel für Kinder unnötig |
| Zahlen 1–12 | Längere Runden |
| Höchste Score / „wer zuerst zu“ | Klassik = niedrigste Restsumme |

## Approach

```
app/features/games/shutTheBox/
  engine.ts          # turns, roll, close, advance
  combos.ts          # pure: subsets of open tiles summing to target
  ai.ts              # chooseShutTheBoxAction(...)
  ShutTheBoxBoard.vue
```

Copy patterns:

- Engine + dice `random`: `app/features/games/kniffel/engine.ts`
- Pure helpers: `app/features/games/kniffel/scoring.ts`
- AI + Board delay: Kniffel
- Registry: wie andere Hot-Seat-Spiele (**ohne** lobby.ts)

## Rules

### Per-player box

```ts
interface ShutTheBoxPlayerBox {
  open: boolean[] // length 9; index 0 = number 1, … index 8 = number 9; true = still open
  score: number | null // null until turn finished for this player
}
```

### Turn phases

State machine inside engine:

1. `awaitingRoll` — valid: `{ type: 'roll' }`
2. `awaitingClose` — valid: `{ type: 'close'; numbers: number[] }` for each legal subset
3. After successful close: back to `awaitingRoll` (same player)
4. If after roll **no** legal subset → auto-end turn: set `score` = sum of open numbers; advance `currentPlayerIndex`
5. When all players have `score !== null` → terminal; winners = seats with minimal score

No explicit `endTurn` action — impossible roll ends the turn automatically inside `applyAction({ type: 'roll' })` **or** via derived flow:

**Decided:** `roll` always allowed in `awaitingRoll`. After roll, if `getLegalCloses(open, diceSum).length === 0`, engine sets score, clears dice, advances player (still one `applyAction` call). UI shows briefly via returned state (`phase: 'turnEnded'` optional) — v1: state already has next player + scored box.

### Legal close

- `numbers` non-empty, unique, each in 1..9, each currently open
- `sum(numbers) === dice[0] + dice[1]`
- After close: those tiles `open[i] = false`; if no tiles remain open → score `0`, turn ends early, advance

### Dice

- `dice: number[]` — length 0 before roll / after turn end; length 2 after roll
- Injectable `random: () => number` like Kniffel (`floor(random()*6)+1`)

### Engine contract

```ts
type ShutTheBoxAction =
  | { type: 'roll' }
  | { type: 'close'; numbers: number[] }

type ShutTheBoxPhase = 'awaitingRoll' | 'awaitingClose'

interface ShutTheBoxGameState {
  currentPlayerIndex: number
  phase: ShutTheBoxPhase
  dice: number[]
  boxes: ShutTheBoxPlayerBox[]
}

interface ShutTheBoxGameOptions {
  playerCount: number // 2–4
  random?: () => number
}

createShutTheBoxGame(options: ShutTheBoxGameOptions): GameEngine<ShutTheBoxGameState, ShutTheBoxAction>
```

### Pure helpers (`combos.ts`)

```ts
export function openNumbers(open: boolean[]): number[]
export function remainingSum(open: boolean[]): number
export function legalCloses(open: boolean[], target: number): number[][]
```

`legalCloses` returns all subsets (as sorted number arrays) summing to `target`. Used by `getValidActions` and AI.

### AI

```ts
chooseShutTheBoxAction(
  state: ShutTheBoxGameState,
  actions: ShutTheBoxAction[],
  options?: { difficulty?: AiDifficulty },
): ShutTheBoxAction | null
```

| Phase | easy | hard |
|-------|------|------|
| `awaitingRoll` | always `roll` | always `roll` |
| `awaitingClose` | Mit Blunder-Rate zufällige legale Close; sonst Heuristik | Heuristik: bevorzuge Closes die hohe Zahlen entfernen / mehr Tiles; Perfect-Shut wenn möglich |

Constant: `SHUT_THE_BOX_EASY_BLUNDER_RATE` in `shared/ai.ts` (z. B. 0.4).

### UI

- `TurnBanner`
- 9 große Zahl-Toggles (Auswahl vor „Zuklappen“); nur legale Mengen absendbar **oder** Buttons pro legaler Kombi — **Decided:** Multi-Select open tiles + Confirm „Zuklappen“, disabled wenn Summe ≠ Würfel; Show hint „Summe: n“
- Würfel anzeigen; Button „Würfeln“
- Sidebar: Scores der Sitze (— bis Zugende)
- SFX: `dice` on roll, `win` on complete; optional `match` on close

### Lobby

Standard `session.canBegin` (≥2). Catalog `minPlayers: 2`, `maxPlayers: 4`.

### Integration touchpoints

| File | Change |
|------|--------|
| `app/types/game.ts` | `GameId` + `'shutTheBox'` |
| `app/constants/games.ts` | Catalog + `isGameId` |
| `app/components/hub/GameCard.vue` | Icon |
| `app/pages/play/[game].vue` | Title + Board |
| `app/features/games/shared/ai.ts` | Blunder-Rate Konstante |
| `PROJECT_INFO.md` | MVP-Liste |

## Out of scope

- 1-Würfel-Regel
- Zahlen 1–12
- Mehrere Runden / Best-of
- Online
- Lobby Difficulty-UI
- Shared single box

## Testing / Success criteria

| File | Covers |
|------|--------|
| `test/unit/shut-the-box-combos.test.ts` | subsets, empty, exact sum, duplicates impossible |
| `test/unit/shut-the-box-engine.test.ts` | roll, close, auto-end turn, perfect shut, winners min score, ties |
| `test/unit/shut-the-box-ai.test.ts` | roll when awaiting; prefers perfect/high tiles on hard |

Akzeptanz: Hub → Lobby 2–4 → Play → Würfeln/Zuklappen → alle Scores → WinScreen → Hub.
