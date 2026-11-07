import { safeSetItem } from '~/utils/storage'
import type { GameId } from '~/types/game'
import type { LastLobby } from './roster'

export const STORAGE_LAST_LOBBY = 'spielesammlung.lastLobby.v1'

function isLastLobby(value: unknown): value is LastLobby {
  if (!value || typeof value !== 'object') return false
  const players = (value as { players?: unknown }).players
  return Array.isArray(players) && players.every((player) => (
    player && typeof player === 'object'
    && ((player as { type?: unknown }).type === 'ai'
      || ((player as { type?: unknown }).type === 'human'
        && typeof (player as { profileId?: unknown }).profileId === 'string'))
  ))
}

function loadAll(): Partial<Record<GameId, LastLobby>> {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(STORAGE_LAST_LOBBY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function loadLastLobby(gameId: GameId): LastLobby | null {
  const entry = loadAll()[gameId]
  return isLastLobby(entry) ? entry : null
}

export function saveLastLobby(gameId: GameId, lobby: LastLobby): void {
  const all = loadAll()
  all[gameId] = lobby
  safeSetItem(STORAGE_LAST_LOBBY, JSON.stringify(all))
}
