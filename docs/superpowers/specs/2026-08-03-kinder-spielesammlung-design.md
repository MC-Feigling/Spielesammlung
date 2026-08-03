# Kinder-Spielesammlung — Design Spec

Date: 2026-08-03  
Status: approved (brainstorming)  
Stack: Nuxt 4, Vue 3 Composition API, TypeScript, TailwindCSS, Bun (no npm)  
Target OS: elementaryOS (Linux), local browser only

## Goal

Browser-based game collection for children ages 4–10. Playable by 2–4 players on one laptop (hot-seat) with optional AI opponents. Child-friendly UI, German UI copy.

## Decisions

| Topic | Choice |
|-------|--------|
| Ages | Mixed 4–10; adaptive UI only |
| Rules | One rule set per game; UI scale + hints adapt |
| MVP games | Memory, Kniffel, Mensch ärgere dich nicht |
| Multiplayer | Hot-seat + AI (`human` \| `ai`) |
| Hosting | Local only (`bun run dev` / preview) |
| Profiles | localStorage: name, avatar, wins, favorite game |
| Sound | SFX with global mute |
| Architecture | Nuxt client monolith; games as feature modules |

## Architecture

```
App (Nuxt 4 / Bun)
├── pages/                 Hub, lobby, play, profiles
├── components/ui/         Shared UI (large hit targets)
├── features/
│   ├── profiles/          localStorage profiles
│   ├── lobby/             players, AI, sound
│   └── games/
│       ├── memory/
│       ├── kniffel/
│       └── ludo/          Mensch ärgere dich nicht
├── composables/           useAgeUi, useSound, useHotSeat
└── stores/                session, settings, profiles
```

- No backend, no auth
- Each game: pure TypeScript engine + Vue UI
- AI and humans share the same engine API

### Game engine contract

```ts
createGame(config) → {
  state,
  actions,
  getValidMoves,
  applyMove,
  checkWinner
}
```

## Data model

```ts
type GameId = 'memory' | 'kniffel' | 'ludo'
type UiScale = 'large' | 'compact'
type PlayerType = 'human' | 'ai'

interface Profile {
  id: string
  name: string
  avatarId: string
  wins: Partial<Record<GameId, number>>
  favoriteGameId?: GameId
  createdAt: string
}

interface Settings {
  soundEnabled: boolean
  uiScale: UiScale
}

// Session: Pinia only, not persisted
interface Session {
  gameId: GameId
  players: Array<{ profileId?: string; type: PlayerType; displayName: string; avatarId: string }>
  engineState: unknown
  currentPlayerIndex: number
}
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Hub — game cards, profiles, sound toggle, UI scale |
| `/lobby/[game]` | 2–4 seats, human/AI, start when ≥2 players |
| `/play/[game]` | Active game |
| `/profiles` | Create/edit profiles |

## Games

### Shared UX

- Clear “your turn” banner for hot-seat
- Win screen → update wins → return to hub
- Quit requires confirmation
- Sound: dice, match, hit, win; respects global mute
- UI scale: `large` (default) vs `compact` — typography/buttons/hints only

### Memory

- Grid size selectable (e.g. 4×3 / 4×4) — layout choice, same match rules
- AI: random + remembered cards heuristic

### Kniffel (custom scores)

Classic sheet **plus**:

| Category | Score |
|----------|-------|
| Kniffel (Yahtzee) | **60** (not 50) |
| Chance | classic (sum of dice) |
| Viele Augen (≥25 pips) | **40** if sum ≥ 25, else 0 / strike |
| Wenig Augen (≤10 pips) | **40** if sum ≤ 10, else 0 / strike |

- Rest classic: ones–sixes, three/four of a kind, full house, small/large straight
- 5 dice, up to 3 rolls per turn
- AI: simple category heuristic

### Mensch ärgere dich nicht (Ludo)

- 2–4 colors, standard rules (enter on 6, capture, home stretch)
- AI priorities: capture → enter home → advance
- Animated piece moves

## Visual direction

- Warm playroom palette (wood/felt), high contrast
- Expressive display font + readable UI sans (not Inter/Roboto/Arial)
- Touch targets ≥48px, strong focus rings
- Motion: dice roll, card flip, piece step — intentional, not noisy
- Fixed animal/color avatars (no uploads)

## Out of scope (MVP)

- Online multiplayer / network play
- Accounts, parental login
- Chat, purchases
- Server/SQLite persistence

## Success criteria

1. 2–4 kids can play without long explanation (>5 min session)
2. On elementaryOS: `bun install` + `bun run dev` is enough
3. All three games completable with AI
4. Profiles and settings survive browser reload

## Verification (MVP)

- Unit tests: Memory match, Ludo moves, Kniffel scoring (incl. custom categories + Kniffel=60)
- Manual: hot-seat flow, mute, profile persistence after reload

## Anti-patterns

- Do not invent backend APIs
- Do not use npm (Bun only)
- Do not add online multiplayer in MVP
- Do not change Kniffel points back to 50
- Do not split rules by age — UI only
