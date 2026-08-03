# Spurrennen (Lane Racing) Design

Date: 2026-08-03  
Status: approved (brainstorming)  
Scope: Neues Echtzeit-Spiel `racing` in der Spielesammlung

## Goal

Kinderfreundliches Spur-Rennen: 2–4 Autos auf einer geteilten Bahn, max. 2 Menschen an einer Tastatur + max. 2 AI. Wer zuerst die Ziellinie erreicht, gewinnt.

## Decisions

| Topic | Choice |
|-------|--------|
| Stil | Spur-Rennen (3 Spuren), Ausweichen |
| Ziel | Feste Distanz / Ziellinie |
| Steuerung | Nur Spurwechsel; Tempo automatisch |
| Treffer | Kurzer Slowdown, Rennen weiter |
| Spieler | 2–4 Sitze; humans ≤ 2; ais ≤ 2 |
| Rendering | Vue-DOM + pure TypeScript-Engine |
| TurnBanner | Nein (alle gleichzeitig) |

## Approach

Vue-DOM + pure Engine (wie Memory/Kniffel/Ludo). Kein Canvas, keine Game-Lib.

```
app/features/games/racing/
  engine.ts       # state, tick(dt), lane, collide, finish
  ai.ts           # Spur-Heuristik
  RacingBoard.vue # DOM-Render + Keyboard + rAF-Loop
```

## Rules

### Track

- `LANE_COUNT = 3` (Lanes `0 | 1 | 2`)
- `TRACK_LENGTH` feste Distanz-Einheiten (Konstante in `engine.ts`)
- Hindernisse spawnen voraus auf einer Spur und bewegen sich relativ zur Scroll-Perspektive
- Autos haben `progress` (0 → `TRACK_LENGTH`)
- Shared Camera: Viewport folgt `max(car.progress)`; Autos bleiben im unteren Bilddrittel, Hindernisse scrollen relativ dazu

### Movement

- Basisgeschwindigkeit konstant (`BASE_SPEED`)
- Spurwechsel: ±1 Lane pro Input, Clamp auf `0..2`
- Humans: Edge-Trigger (Taste neu gedrückt), kein Halten-Spam

### Collision

- AABB: gleiche Lane + überlappendes Progress-Fenster
- Treffer → `slowdownUntil = now + SLOWDOWN_MS`; währenddessen `speed = BASE_SPEED * SLOWDOWN_FACTOR`
- Kein Ausscheiden, kein Zurücksetzen auf der Strecke

### Win

- Erste Car mit `progress >= TRACK_LENGTH` gewinnt
- Phase: `countdown` → `racing` → `finished`
- Countdown 3-2-1 vor Start (keine Inputs vor `racing`)
- WinScreen + `recordWin` für menschliche Gewinner (wie bestehende Spiele)

## Controls

| Slot | Keys |
|------|------|
| Erster Human | `A` / `D` |
| Zweiter Human | `←` / `→` |

Human-Slots = Humans in Sitzreihenfolge (nicht zwingend Sitz 0/1 wenn AI dazwischen).

## Lobby

- `GAMES` Eintrag: `id: 'racing'`, `minPlayers: 2`, `maxPlayers: 4`
- Start nur wenn `players.length >= 2` und `humanCount <= 2` und `aiCount <= 2`
- AI-Sitze wählbar wie bei anderen Spielen

## Engine contract

```ts
createRacingGame(config: {
  players: Array<{ seatIndex: number; type: 'human' | 'ai' }>
}) → {
  state: RacingState
  tick: (dtMs: number) => void
  setLaneIntent: (seatIndex: number, laneDelta: -1 | 1) => void
  getWinnerSeatIndex: () => number | null
}
```

`RacingState` (Kernfelder):

- `phase: 'countdown' | 'racing' | 'finished'`
- `countdownMs: number`
- `cars: Array<{ seatIndex; lane; progress; speed; slowdownUntil }>`
- `obstacles: Array<{ id; lane; progress }>`
- `trackLength: number`

AI (`ai.ts`): bei Hindernis auf gleicher Spur voraus → freie Nachbarspur wählen; sonst Spur halten.

## UI

- Eine geteilte Bahn (kein Split-Screen)
- Autos farblich + Name/Avatar
- Progress-Übersicht (wer führt)
- Steuerungshinweise vor/während Countdown
- Quit-Dialog unverändert über `play/[game].vue`
- SFX: start, hit, win via `useSound` (Mute respektieren)

## Integration touchpoints

- `app/types/game.ts` — `GameId` um `'racing'`
- `app/constants/games.ts` — Katalog + `isGameId`
- Hub `GameCard`, Lobby-Validierung, `pages/play/[game].vue`
- Profil-Wins: `Partial<Record<GameId, number>>` deckt neues Id ab

## Out of scope

- Boost / Bremse / Power-ups
- Online-Multiplayer
- Canvas / WebGL / Phaser
- Mehr als 3 Spuren
- Turn-basiertes Hot-Seat für dieses Spiel

## Testing

Vitest in `test/unit/racing-engine.test.ts` (+ optional `racing-ai`, lobby-limits):

- Spurwechsel Clamp 0–2
- Kollision setzt Slowdown
- Ziel → Winner-Seat
- Lobby-Regel: >2 humans / >2 AIs ungültig
- AI weicht Hindernis auf gleicher Spur aus
