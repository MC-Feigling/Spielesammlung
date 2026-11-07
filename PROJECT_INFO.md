# Spielesammlung

Kinderfreundliche Browser-Spielesammlung (2–4 Spieler, ein Laptop).

## Stack

- Nuxt 4, Vue 3 Composition API, TypeScript, TailwindCSS
- Bun (kein npm)
- Ziel: elementaryOS, lokal im Browser

## Befehle

```bash
./start.sh          # One-Click: Bun + deps + Dev-Server (+ Browser)
bun install
bun run dev
bun run typecheck
bun run test
bun run build
bun run preview
```

## Spec

Siehe `docs/superpowers/specs/2026-08-03-kinder-spielesammlung-design.md`  
Jugendschutz: `docs/superpowers/specs/2026-08-04-jugendschutz-spielzeit-design.md`

## Plan

Siehe `docs/superpowers/plans/2026-08-03-kinder-spielesammlung.md`  
Jugendschutz: `docs/superpowers/plans/2026-08-04-jugendschutz-spielzeit.md`

## MVP-Spiele

Memory, Kniffel (Custom-Score), Mensch ärgere dich nicht, Spurrennen, UNO, Vier gewinnt, Shut the Box, Mühle, Pferderennen, Puzzle-Rennen, Drachenkampf, Handwerker

## Jugendschutz Wiederherstellung

Beim Einrichten wird ein zufälliger 8-stelliger Wiederherstellungscode erzeugt und **einmal** angezeigt (bitte notieren). Im Browser liegt nur dessen Hash.

- „PIN vergessen?“ → Code eingeben → Jugendschutz wird zurückgesetzt, danach neue PIN setzen
- In den Einstellungen kann ein neuer Code erzeugt werden (der alte wird ungültig)
- Es gibt keinen festen Master-Code im Quelltext

## Branch

Arbeit auf `dev`.
