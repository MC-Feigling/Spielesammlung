# Spielesammlung

Kinderfreundliche Browser-Spielesammlung für 2–4 Spieler an einem Laptop.

## Voraussetzungen

- elementaryOS oder eine andere aktuelle Linux-Distribution
- [Bun](https://bun.sh)
- Firefox oder Chrome

## Start

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

Nur Bun verwenden. Kein npm, yarn oder pnpm.
