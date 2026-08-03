# Ludo Classic Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `LudoBoard.vue` matches [Uber Games XXL Ludo](https://ubergames.de/products/ludo-mensch-spiel-xxl-4-spielern-spielfeld-von-100x100-cm-bis-500x500-cm-mit-wurfeln-und-spielfiguren): 11×11 cross, circle fields + black connectors, colored yards/homes/starts.

**Architecture:** Pure `boardLayout.ts` maps ring/yard/home → `{row,col}` on 11×11. Vue/SVG draws circles + lines. Pieces on board. Sidebar keeps dice only.

**Tech Stack:** TypeScript, Vue 3, Tailwind v4, Vitest, Bun

**Design Spec:** `docs/superpowers/specs/2026-08-03-ludo-classic-board-design.md`

---

## Phase 0: Documentation Discovery (complete)

### Sources

| Source | Finding |
|--------|---------|
| Uber Games product page + gallery (`4persMENS.jpg`, board PNGs) | Classic **11×11** cross; circles + black links; TL green / TR red / BR yellow / BL blue; 2×2 yards; 4 home circles/arm; colored starts; 40 path |
| `board.ts` | Ring 40, starts `[0,10,20,30]`, colors currently `red,blue,green,yellow` |
| `LudoBoard.vue` | Perimeter absolute circles; yards in sidebar |
| Design spec (updated) | Authoritative seat→color + ASCII grid |

### Allowed APIs

- Existing: `getRingIndex`, `isInYard`, `isInHome`, `isFullyHome`, `LUDO_*`, engine actions, `AppButton`, `TurnBanner`
- New pure helpers in `boardLayout.ts` (tested)
- Inline SVG or CSS circles — **no** new SVG libraries

### Anti-patterns

- Do **not** use 15×15 (superseded — reference is **11×11**)
- Do **not** use square tile cells as primary look (circles + lines)
- Do **not** change ring size to 52
- Do **not** invent engine actions
- Do **not** keep sidebar as only yard/home UI after Phase 3

### Locked reference

Corner/home/start colors and circle-cross structure are fixed by the Uber Games board. Spec table is source of truth.

---

## Global Constraints

- Branch: `dev`
- Bun only
- TypeScript strict, no `any`
- German UI
- Touch ≥48px; `motion-reduce`
- Work under `app/features/games/ludo/`

## File Structure

| File | Responsibility |
|------|----------------|
| `docs/superpowers/specs/2026-08-03-ludo-classic-board-design.md` | Visual + seat→color (locked) |
| `app/features/games/ludo/board.ts` | Update `LUDO_PLAYER_COLORS` order only |
| `app/features/games/ludo/boardLayout.ts` | **New** — 11×11 maps |
| `app/features/games/ludo/LudoBoard.vue` | Circle-cross UI + pieces |
| `test/unit/ludo-board-layout.test.ts` | **New** |
| `test/unit/ludo-engine.test.ts` | Pass; fix color-name asserts if any |
| `test/unit/final-review-ui.test.ts` | Only if string asserts break |

---

## Phase 1: Color order + layout map

**What to implement:**

1. Set `LUDO_PLAYER_COLORS = ['red', 'yellow', 'blue', 'green'] as const` in `board.ts` (matches reference edges: top/right/bottom/left).
2. Add `boardLayout.ts` with **11×11** maps per design-spec ASCII grid.

**Interfaces:**

```ts
export const BOARD_GRID_SIZE = 11

export interface BoardCell {
  row: number
  col: number
}

export function getRingCell(ringIndex: number): BoardCell
export function getYardCell(playerIndex: number, slotIndex: number): BoardCell
export function getHomeCell(playerIndex: number, homeStep: number): BoardCell
export function getCenterCell(): BoardCell
/** Optional: adjacent pairs for drawing connector lines on the ring */
export function getRingEdges(): ReadonlyArray<readonly [BoardCell, BoardCell]>
```

**Home cell mapping (spec):**

| Player color | Seat after color fix | Home cells (step 0→3 toward center) |
|--------------|----------------------|-------------------------------------|
| red | 0 | `(1,5),(2,5),(3,5),(4,5)` |
| yellow | 1 | `(5,9),(5,8),(5,7),(5,6)` |
| blue | 2 | `(9,5),(8,5),(7,5),(6,5)` |
| green | 3 | `(5,1),(5,2),(5,3),(5,4)` |

**Yard corners (2×2 slot centers — pick consistent cells inside corner pads):**

| Color | Corner region | Example slots |
|-------|---------------|---------------|
| green | top-left | `(1,1),(1,2),(2,1),(2,2)` |
| red | top-right | `(1,8),(1,9),(2,8),(2,9)` |
| yellow | bottom-right | `(8,8),(8,9),(9,8),(9,9)` |
| blue | bottom-left | `(8,1),(8,2),(9,1),(9,2)` |

**Ring path:** Exactly 40 cells on cross perimeter (outer lanes of arms). Order: top L→R → right T→B → bottom R→L → left B→T. `getRingCell(0)` = red start on top arm; `10` = yellow start on right; `20` = blue bottom; `30` = green left.

**Documentation references:**

- Spec ASCII + seat table: `docs/superpowers/specs/2026-08-03-ludo-classic-board-design.md`
- Constants: `board.ts`

**Steps:**

- [ ] Update `LUDO_PLAYER_COLORS` in `board.ts`
- [ ] Implement `boardLayout.ts` (ring, yard, home, center, optional edges)
- [ ] Add `test/unit/ludo-board-layout.test.ts`:
  - [ ] 40 distinct ring cells; all within 0..10
  - [ ] Start cells equal colored starts adjacent to correct yards
  - [ ] 16 yard + 16 home distinct; home does not intersect ring
  - [ ] `getHomeCell` matches table above per seat
  - [ ] `getRingEdges().length === 40` (cycle)
- [ ] Fix any engine/UI tests that hardcode old color order
- [ ] `bun run test`

**Verification:**

- [ ] `rg "LUDO_PLAYER_COLORS" app/features/games/ludo` → new order
- [ ] `BOARD_GRID_SIZE === 11`
- [ ] No Vue imports in `boardLayout.ts`

**Anti-pattern guards:**

- Do not leave colors as `red,blue,green,yellow`
- Do not use grid size 15
- Do not change `LUDO_START_INDEXES` or `getRingIndex`

---

## Phase 2: Static circle-cross chrome

**What to implement:** Draw the Uber-style board (circles + connectors + corner washes + yards + homes + starts). Sidebar moves still work.

**Documentation references:**

- Spec Visual language (circles, black outlines, connectors)
- Panel chrome: `LudoBoard.vue` existing panel classes
- `COLOR_CLASSES` / tokens
- Reference product gallery

**Steps:**

- [ ] Board container `aspect-square` inside existing panel
- [ ] Render via SVG (preferred) or CSS Grid 11×11 with circular cells:
  - [ ] White path circles at `getRingCell`
  - [ ] Lines from `getRingEdges`
  - [ ] Colored start fills at indexes 0/10/20/30
  - [ ] Colored home circles via `getHomeCell`
  - [ ] Yard 2×2 circles + corner color wash
  - [ ] Center hub empty/white
- [ ] Remove old perimeter `ringPosition` decorative circles + center status cards
- [ ] Keep sidebar yard/home buttons for this phase

**Verification:**

- [ ] Visual match vs reference: cross, 4 colored corners, circle path, 4 home lanes
- [ ] Playable via sidebar

**Anti-pattern guards:**

- Do not draw square track tiles as the main look
- Do not add Doctor Sport logos
- Do not add npm SVG packages

---

## Phase 3: Pieces on the board

**What to implement:** All pieces on yard/ring/home circles; click → existing `movePiece`. Strip yard/home controls from sidebar.

**Documentation references:**

- Piece button pattern: `LudoBoard.vue` L130–141
- Spec Interaction + Stacking
- `canControlPiece`, `isValidMove`

**Steps:**

- [ ] Compute cell per piece (yard slot / `getRingIndex` / home step)
- [ ] Position piece buttons on cells; stack offset if shared
- [ ] Valid-move affordance (`ring-4` / scale)
- [ ] Remove sidebar yard/home buttons; keep „N im Ziel“
- [ ] Motion 300ms + `motion-reduce`
- [ ] Aria: Haus / Bahn / Ziel

**Verification:**

- [ ] Enter on 6 from yard circle; capture; enter home lane
- [ ] AI pieces move on board
- [ ] `bun run test`

**Anti-pattern guards:**

- No new engine actions
- No duplicate sidebar piece buttons

---

## Phase 4: Polish

**What to implement:** Corner border segments, connector weight, valid-move highlight, unused seats (2–3 players) hide empty color yards or show inactive.

**Documentation references:** Spec Success criteria; kinder visual direction (warm panel around white board).

**Steps:**

- [ ] Optional 4-color outer frame like reference
- [ ] Unused player yards: only render `players.length` seats
- [ ] Focus/touch targets ≥48px where possible
- [ ] German copy unchanged

**Verification:**

- [ ] 2- and 4-player visual check
- [ ] Side-by-side with reference screenshot mentally: same structure

**Anti-pattern guards:**

- Do not clutter board with instructions
- Do not break dice column layout

---

## Phase 5: Verification

**Steps:**

- [ ] `bun run test`
- [ ] `bun run build`
- [ ] Grep:
  - [ ] `rg "ringPosition" app/features/games/ludo` → gone
  - [ ] `rg "BOARD_GRID_SIZE = 15" app/features/games/ludo` → none
  - [ ] `rg "\['red', 'blue', 'green', 'yellow'\]" app/features/games/ludo` → none (old order)
  - [ ] `rg "LUDO_RING_SIZE" app/features/games/ludo/board.ts` → still 40
- [ ] Compare UI to [Uber Games product](https://ubergames.de/products/ludo-mensch-spiel-xxl-4-spielern-spielfeld-von-100x100-cm-bis-500x500-cm-mit-wurfeln-und-spielfiguren): TL green, TR red, BR yellow, BL blue

**Anti-pattern guards:**

- Fix layout map if geometry wrong — do not hack engine progress

---

## Execution note

One phase per session. Phase 1 tests are the contract.

Reference is locked; do not reinvent corner colors.
