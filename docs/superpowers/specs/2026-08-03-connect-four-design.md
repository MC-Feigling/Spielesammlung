# Vier gewinnt (Connect Four) Design

Date: 2026-08-03  
Status: approved (planning)  
Scope: Neues Hot-Seat-Brettspiel `connectFour` — genau 2 Sitze (Human/AI mix)

## Goal

Kinderfreundliches Vier gewinnt lokal im Browser: Steine fallen in Spalten, 4 in einer Reihe gewinnen. Klarer Zug-Hinweis, große Targets, Deutsch.

## Decisions

| Topic | Choice |
|-------|--------|
| GameId | `connectFour` |
| Titel / Blurb | `Vier gewinnt` / `4 in einer Reihe!` |
| Spieler | Lobby **genau 2 Sitze** (`isConnectFourRosterValid`) — Human/AI beliebig mixbar |
| Brett | **7 Spalten × 6 Reihen** (klassisch) |
| Aktion | Stein in Spalte droppen (Schwerkraft) |
| Sieg | 4 gleichfarbig horizontal, vertikal oder diagonal |
| Unentschieden | Brett voll, kein 4er → beide Seats in `winnerSeatIndexes` (wie Memory-Gleichstand) |
| Engine | Pure TS `GameEngine` (wie Memory/Kniffel) |
| AI Difficulty | Code: `easy` \| `hard` (Shared); Play-Default `easy`; keine Lobby-UI in v1 |
| TurnBanner | Ja |
| Online / Animation-Physics | Nein / CSS drop ok, kein Canvas |

### Alternatives considered (not chosen)

| Option | Why not (v1) |
|--------|----------------|
| 2–4 Spieler (Team oder Reihenfolge) | Klassik ist 2P; verwässert Regeln |
| Variable Brettgröße | Unnötig; 7×6 Standard reicht |
| 5-gewinnt / Gomoku | Anderes Spiel |
| Racing-tick API | Turn-basiert → `GameEngine` |

## Approach

```
app/features/games/connectFour/
  engine.ts           # board, drop, win/draw detect
  ai.ts               # chooseConnectFourAction(state, actions, options?)
  lobby.ts            # isConnectFourRosterValid — exactly 2 filled seats
  ConnectFourBoard.vue
```

Copy patterns:

- Engine contract: `app/features/games/shared/engine.ts`
- AI + Board delay: Kniffel/Ludo (`chooseX` + `scheduleAiAction` ~650–700 ms)
- Lobby gate: `app/features/games/uno/lobby.ts` / `racing/lobby.ts`
- Registry: `GameId` + `GAMES` + Play-Page Board-Switch

## Rules

### Board

- Grid `cells: Array<Array<number | null>>` — outer index = **column** 0..6, inner = **row** 0..5
- Row 0 = bottom (gravity). Empty = `null`, occupied = seat index `0` \| `1`
- Start: Seat 0 beginnt

### Legal move

- `drop` in column `c` legal iff top cell of column is empty (`cells[c][5] === null`)
- Piece lands on lowest empty row in that column

### Win / draw

After each drop:

1. If last placed piece completes ≥4 consecutive same seat (H/V/both diagonals) → that seat wins alone
2. Else if no legal drops remain → draw: `winnerSeatIndexes = [0, 1]`
3. Else → next player (`1 - currentPlayerIndex`)

### Engine contract

```ts
type ConnectFourAction = { type: 'drop'; column: number }

interface ConnectFourGameState {
  cells: Array<Array<number | null>> // 7 × 6
  currentPlayerIndex: number
  lastMove: { column: number; row: number } | null
}

interface ConnectFourGameOptions {
  // always 2 players; no playerCount option needed
  // optional seed unused (deterministic without RNG)
}

createConnectFourGame(): GameEngine<ConnectFourGameState, ConnectFourAction>
```

- `getState` returns deep clone
- Invalid drop throws German error (z. B. „Spalte ist voll“)
- `isTerminal` when win or draw

### AI

```ts
chooseConnectFourAction(
  state: ConnectFourGameState,
  actions: ConnectFourAction[],
  options?: { difficulty?: AiDifficulty },
): ConnectFourAction | null
```

| Difficulty | Behavior |
|------------|----------|
| `easy` | Mit Rate `CONNECT_FOUR_EASY_BLUNDER_RATE` (z. B. 0.45) zufälliger legaler Zug; sonst `hard`-Heuristik |
| `hard` | Sofort-Sieg nehmen; Sofort-Verlust blocken; sonst zentrierte Spalten bevorzugen (einfaches Scoring, optional 2-ply) |

Kein Minimax-Vollbaum Pflicht in v1 — Heuristik + Sofort-Taktik reicht für 4–10.

### UI

- `TurnBanner` für aktuellen Spieler
- 7 große Spalten-Buttons / klickbare Spalten
- Steine in Sitzfarben (`players[i].color` oder Fallback-Palette)
- WinScreen über bestehendes `@complete`
- SFX: bestehendes `win`; optional `drop` nur wenn neuer `SoundName` + wav — **v1: nur `win`**, kein neuer Sound Pflicht

### Lobby

```ts
isConnectFourRosterValid(players: Array<{ type: 'human' | 'ai' }>): boolean
// true iff players.length === 2 (filled seats only — same input shape as uno/racing helpers)
```

Catalog: `minPlayers: 2`, `maxPlayers: 2` (Badge ehrlich).

### Integration touchpoints

| File | Change |
|------|--------|
| `app/types/game.ts` | `GameId` + `'connectFour'` |
| `app/constants/games.ts` | Catalog + `isGameId` |
| `app/components/hub/GameCard.vue` | `GAME_ICONS.connectFour` |
| `app/pages/play/[game].vue` | Title + `<ConnectFourBoard>` |
| `app/pages/lobby/[game].vue` | Gate + Hint via `isConnectFourRosterValid` |
| `PROJECT_INFO.md` | MVP-Liste erweitern |

## Out of scope

- Online / Spectator
- Animierte Physik-Engine / Canvas
- Variable Brettgrößen
- Undo
- Lobby AI-Difficulty-UI
- Neuer Sound zwingend

## Testing / Success criteria

| File | Covers |
|------|--------|
| `test/unit/connect-four-engine.test.ts` | Drop gravity, win H/V/diag, draw, invalid full column, turn advance |
| `test/unit/connect-four-ai.test.ts` | easy blunder path; hard takes winning move / blocks |
| `test/unit/connect-four-lobby.test.ts` | exactly 2 seats |

Akzeptanz: Hub → Lobby (2 Sitze) → Play → Mensch vs AI → Sieg/Unentschieden → WinScreen → Hub.
