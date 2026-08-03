# Task 5 Report: Memory

## Status
- Memory-Engine, KI, Spielbrett, Turn-Banner, Lobby-Rasterwahl und Session-Cleanup umgesetzt.

## TDD
- RED Engine: `bun test test/unit/memory-engine.test.ts` → fehlendes Modul `memory/engine`.
- GREEN Engine: 4 Tests bestanden.
- RED KI: `bun test test/unit/memory-ai.test.ts` → fehlendes Modul `memory/ai`.
- GREEN gesamt: `bun test` → 10 bestanden, 0 fehlgeschlagen.

## Verifikation
- `bun run build` erfolgreich.
- Build meldet bestehende Nuxt-Warnung für den relativen CSS-Eintrag in `nuxt.config.ts`.

## Memory AI Fix
- Ursache: Die KI prüfte bekannte Paare in Beobachtungsreihenfolge und ignorierte die bekannte Partnerkarte der bereits offenen Karte.
- Fix: Partner der offenen Karte erhält Vorrang; Zufallsauswahl bevorzugt unbeobachtete Karten vor gemerkten Einzelkarten.
- RED: `bun test test/unit/memory-ai.test.ts` reproduzierte beide Fehler.
- GREEN: `bun run test` → 5 Testdateien, 11 Tests bestanden.
