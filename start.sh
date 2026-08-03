#!/usr/bin/env bash
# One-click setup + start for Spielesammlung (elementaryOS / Linux).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"
OPEN_BROWSER=1

for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN_BROWSER=0 ;;
    --help|-h)
      echo "Usage: ./start.sh [--no-open]"
      echo "  Installs Bun (if missing), runs bun install, starts Nuxt dev server."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./start.sh [--no-open]" >&2
      exit 1
      ;;
  esac
done

ensure_bun() {
  if command -v bun >/dev/null 2>&1; then
    return 0
  fi

  if [[ -x "${HOME}/.bun/bin/bun" ]]; then
    export PATH="${HOME}/.bun/bin:${PATH}"
    return 0
  fi

  echo "→ Bun fehlt. Installiere Bun…"
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"

  if ! command -v bun >/dev/null 2>&1; then
    echo "Fehler: Bun-Installation fehlgeschlagen." >&2
    exit 1
  fi
}

open_browser_when_ready() {
  local waited=0
  local max_wait=60

  while (( waited < max_wait )); do
    if curl -fsS --max-time 1 "${URL}" >/dev/null 2>&1; then
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "${URL}" >/dev/null 2>&1 || true
      fi
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

ensure_bun

echo "→ Abhängigkeiten installieren…"
bun install

if (( OPEN_BROWSER )); then
  open_browser_when_ready &
fi

echo "→ Dev-Server starten (${URL})"
exec bun run dev -- --port "${PORT}" --host
