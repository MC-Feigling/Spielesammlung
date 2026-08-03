# Kniffel Score Preview Design

Date: 2026-08-03  
Status: approved  
Scope: Score-Zellen zeigen Preview-Punkte oder roten „Streichen“-Button

## Goal

Nach dem Würfeln sofort sichtbar machen, welche offenen Kategorien Punkte bringen und welche nur gestrichen werden können.

## Rules

- Preview nutzt bestehende `scoreCategory(category, dice)` aus `scoring.ts`
- `scoreCategory(...) > 0` → Kategorie ist eintragbar mit Punkten
- `scoreCategory(...) === 0` → Kategorie ist streichen (0 Punkte)
- Eintrag und Streichen nutzen dieselbe Engine-Action: `{ type: 'score', category }`
- Keine neue Engine-Action, keine neue Score-Sheet-Semantik
- Preview nur, wenn die Kategorie aktuell scorebar ist (`validCategories`, also `rollsUsed > 0` und Zelle offen)
- Vor dem ersten Wurf: offene Zellen bleiben disabled (kein Preview, Label optional „Eintragen“ disabled oder leer/–)
- Summe oben / Bonus bleiben read-only Summary-Rows

## UI

Offene Zelle des aktuellen Spielers, wenn scorebar:

| Preview | Button-Label | Variant |
|---------|--------------|---------|
| Punkte > 0 | die Punktezahl (z. B. `12`) | `primary` oder bestehendes positives Pattern |
| Punkte = 0 | `Streichen` | neue `AppButton`-Variant `danger` (rot, Accent `#d45d3a`) |

Bereits ausgefüllte Zellen und andere Spieler: unverändert Zahlen / `–`.

Beide Upper- und Lower-Blöcke nutzen dieselbe Preview-Logik (kein Duplikat der Scoring-Regeln im Template).

## Approach

1. Optionaler reiner Helper in `scoring.ts` (oder computed in Board): Preview-Map `category → scoreCategory(...)`
2. `AppButton`: Variant `danger` ergänzen
3. `KniffelBoard.vue`: „Eintragen“ ersetzen durch Preview-Label + Variant-Switch
4. Unit-/UI-Source-Tests für Helper-Verhalten und sichtbare Labels

## Out of scope

- Engine-/AI-Änderungen (`STRIKE_PRIORITY` bleibt AI-intern)
- Separate Strike-Action
- Layout-Redesign der Score-Tabelle
- Kniffel-Joker / Extra-Boni
- Score-Hinweis vor dem ersten Wurf

## Testing

- Scoring: Preview-Helfer (falls eingeführt) spiegelt `scoreCategory`
- UI source test: enthält `Streichen`, `scoreCategory` / Preview-Helper, `danger`
- Manuell: Full House Würfel → Full House zeigt `25`, Kniffel zeigt `Streichen`
