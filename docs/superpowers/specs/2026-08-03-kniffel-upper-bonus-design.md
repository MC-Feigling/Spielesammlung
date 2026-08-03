# Kniffel Upper Bonus Design

Date: 2026-08-03  
Status: approved  
Scope: Oberteil-Bonus (63 → +35) im Kniffel-Block

## Goal

Klassischer Kniffel-Bonus im Score-Block und in der Gewinner-Berechnung.

## Rules

- Oberteil = Einser, Zweier, Dreier, Vierer, Fünfer, Sechser
- Summe oben = Summe der eingetragenen Oberteil-Werte (teilweise erlaubt)
- Bonus = 35 wenn Summe oben ≥ 63, sonst 0
- Gesamt = alle Kategorie-Punkte + Bonus
- Gewinner nutzt dieselbe Gesamt-Logik

Constants:

- `UPPER_BONUS_THRESHOLD = 63`
- `UPPER_BONUS_POINTS = 35`

## Approach

Shared helpers in `app/features/games/kniffel/scoring.ts`:

- `UPPER_CATEGORIES` (ones…sixes)
- `upperSum(scoreSheet)`
- `upperBonus(scoreSheet)` → 0 oder 35
- `totalScore(scoreSheet)` → Kategorie-Summe + Bonus

Engine (`engine.ts`) and UI (`KniffelBoard.vue`) both call these helpers. No bonus category on the score sheet.

## UI

After the six upper rows, before lower categories:

1. **Summe oben** — live `upperSum`
2. **Bonus (+35 ab 63)** — live `upperBonus` (0 oder 35)

Footer **Gesamt** uses `totalScore`.

Rows are read-only summary rows (not clickable).

## Out of scope

- Kniffel-Joker / extra Kniffel bonuses
- AI strategy changes for chasing the upper bonus
- Layout redesign beyond the two summary rows

## Testing

Unit tests in `test/unit/kniffel-scoring.test.ts`:

- upperSum with partial / full upper sheet
- upperBonus below 63 → 0
- upperBonus at/above 63 → 35
- totalScore includes bonus

Engine test: winner totals include bonus when upper ≥ 63.
