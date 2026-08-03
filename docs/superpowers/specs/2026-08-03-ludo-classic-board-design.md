# Ludo Classic Board Visual Design

**Date:** 2026-08-03  
**Status:** Locked to reference  
**Reference:** [Uber Games – Ludo Mensch Spiel XXL](https://ubergames.de/products/ludo-mensch-spiel-xxl-4-spielern-spielfeld-von-100x100-cm-bis-500x500-cm-mit-wurfeln-und-spielfiguren)  
**Scope:** UI redesign of `LudoBoard.vue` + pure layout helpers. Engine rules stay (ring 40, home 4). Color seat order may change to match reference corners.

## Problem

Current board = 40 perimeter circles. Yards/home only in sidebar. Not classic cross.

## Goal

Match the Uber Games XXL field layout:

1. Square white board, thick **colored corner borders** (quadrants)
2. **Cross-shaped** track of **circles** linked by **black lines** (not square cells as the visual)
3. **4 corner yards**: each a light pad with **2×2 colored circles**
4. **40** white path circles on the cross perimeter; **1 colored start** per player on the path
5. **4 home stretches**: each **4 colored circles** toward center (middle lane of each arm)
6. Center: empty meet-point of the four home lanes
7. Pieces move on the board (yard → ring → home)

## Non-goals

- Pixel-perfect logos („DOCTOR SPORT“) or outdoor mat texture
- Rule changes (capture, 6 to enter, etc.)
- 52-field international Ludo
- Replacing TurnBanner / dice sidebar chrome

## Rules (engine)

| Constant | Value | Source |
|----------|-------|--------|
| Ring | 40 | `LUDO_RING_SIZE` |
| Home | 4 | `LUDO_HOME_LENGTH` |
| Starts | `[0, 10, 20, 30]` | `LUDO_START_INDEXES` |
| Progress | yard `-1`, ring `0..39`, home `40..43` | helpers in `board.ts` |

## Reference geometry (authoritative)

Logical grid: **11×15? No — 11×11** cell centers.

```
         0 1 2 3 4 5 6 7 8 9 10
     0           ○ ○ ○
     1           ○ ■ ○
     2           ○ ■ ○
     3           ○ ■ ○
     4   ○ ○ ○ ○ ○ ■ ○ ○ ○ ○ ○
     5   ○ ■ ■ ■ ■ ★ ■ ■ ■ ■ ○
     6   ○ ○ ○ ○ ○ ■ ○ ○ ○ ○ ○
     7           ○ ■ ○
     8           ○ ■ ○
     9           ○ ■ ○
    10           ○ ○ ○
```

- `○` = ring path (or arm edge)
- `■` = home stretch (4 per color; center column/row of each arm, excluding `★`)
- `★` = center hub (not a playable ring cell)
- Cross arms: **3 circles wide**, extending to board edge
- Corner yards sit in the four square regions outside the cross

### Corner colors (from reference, clockwise from top-left)

| Corner | Color | Yard | Home lane direction | Start field (on ring) |
|--------|-------|------|---------------------|------------------------|
| Top-left | **green** | 2×2 green circles | left → center (row 5, cols 1–4) | left arm |
| Top-right | **red** | 2×2 red circles | top → center (col 5, rows 1–4) | top arm |
| Bottom-right | **yellow** | 2×2 yellow circles | right → center (row 5, cols 6–9) | right arm |
| Bottom-left | **blue** | 2×2 blue circles | bottom → center (col 5, rows 6–9) | bottom arm |

### Seat → engine start → reference color

Ring walk order stays: top L→R, right T→B, bottom R→L, left B→T (10 fields per side).

| Seat | `LUDO_START_INDEXES` | Edge | Reference color |
|------|----------------------|------|-----------------|
| 0 | 0 | top | **red** |
| 1 | 10 | right | **yellow** |
| 2 | 20 | bottom | **blue** |
| 3 | 30 | left | **green** |

Update `LUDO_PLAYER_COLORS` from `['red','blue','green','yellow']` to `['red','yellow','blue','green']` so seat colors match the reference. No change to start indexes or move math.

## Visual language

Copy reference look, keep app panel chrome around the board:

| Element | Spec |
|---------|------|
| Board face | White / `#fffaf0` |
| Path circle | White fill, thick dark outline (~`#2b2118`) |
| Connectors | Short black/dark line segments between adjacent path circles |
| Start circles | Solid player color + outline |
| Home circles | Solid player color + outline (no connector lines required) |
| Yard circles | Solid player color on light/white pad inside colored corner |
| Corner wash | Soft tint of player color in that quadrant (or bold like reference) |
| Outer frame | Optional 4-segment colored border (green/red/yellow/blue) |
| Pieces | Existing rounded token buttons (`COLOR_CLASSES`), on top of circles |
| Panel around board | Existing wood panel: `bg-[var(--color-panel)]` + shadow/ring |

Approx reference hues (tune to existing `COLOR_CLASSES` where close):

- Red `#E31E24` / existing `#e7674c`
- Green `#39B54A` / existing `#66b57a`
- Blue `#00AEEF` / existing `#5ca4d6`
- Yellow `#F2BF4F` (prefer existing softer yellow over neon `#FFF200` for kids contrast on white)

Prefer **existing** `COLOR_CLASSES` unless contrast fails on white.

## Layout approach

1. Pure `boardLayout.ts`: map `ringIndex` / yard slot / home step → `{ row, col }` on **11×11**
2. Render: CSS Grid 11×11 **or** SVG with circles at cell centers + line paths
3. Preferred visual: **circles + connecting lines** (SVG or CSS), not filled square tiles

Do **not** keep perimeter-only absolute `%` ring.

## Interaction

| Location | Action |
|----------|--------|
| Yard circle piece | `from: 'yard'` |
| Ring piece | `from: 'ring'` |
| Home piece | `from: 'home'` |
| Dice | Sidebar `AppButton` „Würfeln“ |

Sidebar: names + turn highlight + „N im Ziel“ only — no yard/home piece buttons after migration.

## Stacking

Offset stack when multiple pieces share a cell; each valid piece remains clickable.

## Accessibility

- Region label: `Mensch ärgere dich nicht Brett`
- Piece `aria-label`: name + number + Haus/Bahn/Ziel
- Focus rings via `--color-accent`; touch ≥ `--hit-min`

## Success criteria

- Board recognizable vs [Uber Games XXL](https://ubergames.de/products/ludo-mensch-spiel-xxl-4-spielern-spielfeld-von-100x100-cm-bis-500x500-cm-mit-wurfeln-und-spielfiguren): cross, circle path, colored homes, 2×2 yards, corner colors as table
- Layout unit tests: 40 distinct ring cells, 16 yard, 16 home, no overlap
- Engine tests still pass after `LUDO_PLAYER_COLORS` reorder (update color assertions if any)
