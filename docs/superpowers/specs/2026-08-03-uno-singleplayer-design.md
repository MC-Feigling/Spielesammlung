# UNO (Singleplayer vs AI) Design

Date: 2026-08-03  
Status: draft (awaiting rule approval)  
Scope: Neues Hot-Seat-Kartenspiel `uno` — 1 Mensch gegen bis zu 3 AI (Lobby 2–4 Sitze)

## Goal

Kinderfreundliches UNO lokal im Browser: Spieler legt passende Karten, AI-Gegner ziehen mit. Klarer Zug-Hinweis, große Karten-Targets, Deutsch.

## Decisions

| Topic | Choice |
|-------|--------|
| Spieler | Lobby 2–4 Sitze; typisch 1× `human` + 1–3× `ai` (wie bestehende Spiele, kein Racing-Cap) |
| Regel-Set | **Vereinfachtes Klassik-UNO** (siehe Rules) — eine Regelmenge, keine Altersvarianten |
| UNO rufen | **Auto** bei 1 Karte (kein Strafzug für vergessenes Rufen) |
| +4 Challenge | **Nein** |
| Stacking (+2/+4) | **Ja** — Draw-Strafen stapeln; Opfer kann mit +2/+4 weiterreichen (siehe Rules) |
| Muss spielen | Wenn legale Karte → muss legen; sonst ziehen; gezogene Karte sofort spielbar wenn legal |
| 2 Spieler + Reverse | Reverse wirkt wie Skip (Richtung flippt, nächster ist wieder Gegner → effektiv Skip) |
| Engine | Pure TS `GameEngine` (wie Kniffel/Ludo/Memory) |
| AI Difficulty | Code: `easy` \| `hard` (Shared); Play-Default `easy`; keine Lobby-UI in v1 |
| TurnBanner | Ja |
| Online | Nein |

### Alternatives considered (not chosen)

| Option | Why not (v1) |
|--------|----------------|
| Nur Zahlen/Farben (kein Action) | Zu flach; kaum „UNO“-Gefühl |
| Voll-UNO inkl. +4 Challenge | Challenge zu komplex; Stacking bewusst drin |
| Separater Singleplayer-Modus ohne Lobby | Lobby deckt 1H+AI schon ab |

## Approach

```
app/features/games/uno/
  engine.ts      # deck, deal, play, draw, effects, winner
  ai.ts          # chooseUnoAction(state, actions, options?)
  UnoBoard.vue   # Hand, Discard, Draw-Pile, AI-Hände (Rückseiten), TurnBanner
```

Copy patterns:

- Engine contract: `app/features/games/shared/engine.ts`
- AI choose + Board delay: Kniffel/Ludo (`chooseX` + `scheduleAiAction` ~650–700 ms)
- Registry: `GameId` + `GAMES` + Play-Page Board-Switch

## Rules

### Deck (108 Karten, klassisch)

- Farben: `red` \| `yellow` \| `green` \| `blue`
- Pro Farbe: 1× `0`, 2× `1`–`9`, 2× Skip, 2× Reverse, 2× DrawTwo
- Wild: 4× Wild, 4× WildDrawFour

### Deal / Start

- 7 Karten pro Spieler
- Rest = Draw-Pile; oberste Karte = Discard (wenn Action/Wild: neu ziehen bis Zahl/Farbkarte; optional: Action als Start mit Effekt — **v1: neu ziehen bis Number**)
- Startspieler: Seat 0
- Richtung: `clockwise` initial

### Legal play

**Normal** (`pendingDrawCount === 0`):

- gleiche Farbe **oder** gleicher Rang (Zahl/Skip/Reverse/DrawTwo) **oder** Wild / WildDrawFour

**Während Stack** (`pendingDrawCount > 0`):

- Nur Karten die den Stack fortsetzen (siehe Stacking)
- Alternativ: Strafe annehmen (`draw` / Accept) — keine anderen Karten legal

Wild / WildDrawFour: Spieler wählt Farbe nach dem Legen.

### Effects (nach erfolgreichem Legen)

| Karte | Effekt |
|-------|--------|
| Number | Nächster Spieler |
| Skip | Nächster überspringen |
| Reverse | Richtung umkehren; dann nächster in neuer Richtung |
| DrawTwo | `pendingDrawCount += 2`; Zug geht an nächsten (Stack offen) |
| Wild | Farbe wählen, nächster Spieler |
| WildDrawFour | Farbe wählen; `pendingDrawCount += 4`; Zug geht an nächsten (Stack offen) |

Kein sofortiges Ziehen beim Legen von +2/+4 — erst wenn das Opfer den Stack **annimmt**.

### Stacking (+2 / +4)

State: `pendingDrawCount: number` (0 = kein Stack).

| Situation | Erlaubt zu legen | Pending |
|-----------|------------------|---------|
| Top-Effekt / Pending aus **+2** | weiteres **DrawTwo** (+2) oder **WildDrawFour** (+4) | += 2 bzw. += 4 |
| Top-Effekt / Pending aus **+4** | nur weiteres **WildDrawFour** (+4) | += 4 |
| Opfer nimmt an | — | zieht `pendingDrawCount` Karten; `pendingDrawCount = 0`; Zugende (kein Ablegen in dem Zug) |

Regeln im Detail:

1. Erste +2/+4 startet den Stack (`pendingDrawCount = 2` bzw. `4`).
2. Nächster Spieler darf stacken **oder** annehmen (ziehen).
3. **+2 auf +2** ok; **+4 auf +2** ok (Eskalation); **+2 auf +4** **nicht** (kein Downgrade).
4. +4 beim Stacken braucht weiterhin Farbwahl.
5. Skip / Reverse / Zahl / normales Wild während offenem Stack **illegal**.
6. Stack-Kette kann rundumgehen, bis jemand annimmt.
7. UI: Banner/Hinweis z. B. „Ziehe X oder lege +2/+4“.

### Draw when no legal card

**Normal** (`pendingDrawCount === 0`):

1. Eine Karte vom Draw-Pile
2. Wenn spielbar → **muss** legen (v1, kinderfreundlich/klar)
3. Sonst Zugende
4. Draw-Pile leer → Discard (ohne oberste) mischen → neuer Draw-Pile

**Stack** (`pendingDrawCount > 0`):

- `draw` = Strafe annehmen (siehe Stacking), nicht „eine Karte suchen“

### Win

- Erste Hand leer → alleiniger Gewinner (`winnerSeatIndexes: [seat]`)
- Kein Punktescore in v1 (nur Wer-gewinnt)

## AI

### API (wie Ludo)

```ts
chooseUnoAction(state, actions, options?: { difficulty?: AiDifficulty; random?: () => number }): UnoAction | null
```

### Heuristik

**hard**

1. Bei offenem Stack: stacken wenn möglich (hard immer wenn Karte da; easy oft annehmen)
2. Bevorzuge Karten die Gegner blockieren (Skip / DrawTwo / WildDrawFour) wenn sinnvoll
3. Sonst Farbe halten (häufigste Farbe in Hand)
4. Wild / WildDrawFour erst wenn keine farbige legale Karte
5. Nach Wild: Farbe = häufigste Hand-Farbe

**easy**

- Mit `UNO_EASY_BLUNDER_RATE` (neu in `shared/ai.ts`) zufällige legale Action statt Heuristik

### Timing

- Board: `AI_ACTION_DELAY_MS = 700` (wie Ludo)
- Optional kurze Pause nach Effekt-Karten (gleiche Delay-Schleife reicht)

## UI

### Layout

- Mitte: Discard (Farbe + Rang groß) + Draw-Pile Button
- Unten: eigene Hand (fächer / Wrap, Targets ≥48px)
- Oben/Seiten: AI-Sitze mit Kartenrückseiten-Count + Avatar/Name
- `TurnBanner` für aktuellen Spieler
- Wild-Farbwahl: 4 große Farb-Buttons (Modal/Inline)

### Feedback

- Illegale Karte: kein Apply (nur legale klickbar / disabled)
- SFX: `play` / `draw` / `win` — bestehende `SoundName` nutzen oder minimal erweitern (`card` falls nötig)
- Win-Dialog wie andere Boards → `emit('complete', [winnerSeat])`

### Lobby

- Keine Extra-Gates (anders als Racing)
- `minPlayers: 2`, `maxPlayers: 4`
- Singleplayer = 1 Human + AI-Sitze füllen

## Out of scope (v1)

- Online / Netzwerk
- UNO rufen manuell + Strafe
- +4 Challenge
- Punktestand / Turnier
- House-Rules Toggle
- Difficulty in Lobby-UI
- Kartengrafik-Assets von Mattel (eigene simple SVG/CSS-Karten)

## Testing

| File | Cases |
|------|--------|
| `test/unit/uno-engine.test.ts` | Deal 7, legal play, skip/reverse/draw2/wild/+4, **stack +2/+4 & accept**, recycle pile, win |
| `test/unit/uno-ai.test.ts` | hard prefers color/block/stack; easy blunders; wild color choice |

## Success criteria

1. 1 Kind + 1–3 AI spielbar ohne Regelbuch >5 Min
2. Alle Action-Effekte korrekt inkl. 2-Spieler-Reverse und +2/+4-Stacking
3. AI-Züge sichtbar verzögert; Human kann AI-Sitze nicht bedienen
4. Hub → Lobby → Play → Win → Profile-Wins für `uno`
