# Spielesammlung

Kinderfreundliche Browser-Spielesammlung für 2–4 Spieler an einem Laptop.

Hot-Seat: abwechselnd am gleichen Gerät. Profile, KI-Gegner und lokale Wins.

## Spiele

| Spiel | Spieler | Kurz |
| --- | --- | --- |
| Memory | 2–4 | Paare finden |
| Kniffel | 2–4 | Würfel und Punkte (Custom-Score) |
| Mensch ärgere dich nicht | 2–4 | Figuren ins Ziel, Gegner rauswerfen |
| Spurrennen | 2–4 | Ausweichen und zuerst ins Ziel |
| UNO | 2–4 | Karten ablegen, allein gegen KI möglich |
| Vier gewinnt | 2 | 4 in einer Reihe |
| Shut the Box | 2–4 | Zahlen zuklappen |

## Stack

- Nuxt 4, Vue 3 Composition API, TypeScript, TailwindCSS, Pinia
- Bun (kein npm, yarn oder pnpm)
- Ziel: elementaryOS, lokal im Browser (Firefox oder Chrome)

## Start

One-Click (Setup + Dev-Server + Browser):

```bash
./start.sh
```

Ohne Browser öffnen: `./start.sh --no-open`

Manuell:

```bash
bun install
bun run dev
```

Danach `http://localhost:3000` im Browser öffnen.

## Prüfung und Produktion

```bash
bun run test
bun run build
bun run preview
```

## Branch

Arbeit auf `dev`.
