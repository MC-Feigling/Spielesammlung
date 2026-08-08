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

Memory, Kniffel (Custom-Score), Mensch ärgere dich nicht, Spurrennen, UNO, Vier gewinnt, Shut the Box, Mühle, Pferderennen

## Jugendschutz Super-PIN

Wiederherstellung bei vergessener Eltern-PIN: **`314159`**

- Dialoge „PIN vergessen?“ → Super-PIN → Jugendschutz zurücksetzen
- Super-PIN gilt auch als Master-Schlüssel in Einstellungen / Extra-Zeit
- Super-PIN darf nicht als normale Eltern-PIN gesetzt werden

## Branch

Arbeit auf `dev`.
