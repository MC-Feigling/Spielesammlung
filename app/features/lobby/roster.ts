import type { SessionPlayerInput, SessionSeat } from '~/stores/session'
import type { Profile } from '~/types/profile'

export const AI_NAMES = ['Robo-Bär', 'Robo-Fuchs', 'Robo-Eule', 'Robo-Frosch'] as const
export const AI_AVATARS = ['bear', 'fox', 'owl', 'frog'] as const
export const MAX_ROSTER = 4

/** Players in seat order, without empty seats. */
export function rosterFromSeats(seats: readonly SessionSeat[]): SessionPlayerInput[] {
  return seats
    .filter((seat): seat is NonNullable<SessionSeat> => seat !== null)
    .map(({ seatIndex: _seatIndex, ...player }) => ({ ...player }))
}

/** Robots get stable names by their order among robots: Robo-Bär, Robo-Fuchs, … */
export function renameAis(roster: readonly SessionPlayerInput[]): SessionPlayerInput[] {
  let aiIndex = 0
  return roster.map((player) => {
    if (player.type !== 'ai') return { ...player }
    const index = aiIndex % AI_NAMES.length
    aiIndex += 1
    return { type: 'ai', displayName: AI_NAMES[index]!, avatarId: AI_AVATARS[index]! }
  })
}

function profilePlayer(profile: Profile): SessionPlayerInput {
  return { type: 'human', profileId: profile.id, displayName: profile.name, avatarId: profile.avatarId }
}

export function rosterIndexOfProfile(roster: readonly SessionPlayerInput[], profileId: string): number {
  return roster.findIndex((player) => player.type === 'human' && player.profileId === profileId)
}

/** Sits a child down (at the end) or lets them stand up again. */
export function toggleProfile(
  roster: readonly SessionPlayerInput[],
  profile: Profile,
  maxPlayers: number,
): SessionPlayerInput[] {
  const index = rosterIndexOfProfile(roster, profile.id)
  if (index >= 0) return removeAt(roster, index)
  if (roster.length >= Math.min(maxPlayers, MAX_ROSTER)) return [...roster]
  return renameAis([...roster, profilePlayer(profile)])
}

export function addAi(roster: readonly SessionPlayerInput[], maxPlayers: number): SessionPlayerInput[] {
  if (roster.length >= Math.min(maxPlayers, MAX_ROSTER)) return [...roster]
  return renameAis([...roster, { type: 'ai', displayName: AI_NAMES[0], avatarId: AI_AVATARS[0] }])
}

export function removeAt(roster: readonly SessionPlayerInput[], index: number): SessionPlayerInput[] {
  return renameAis(roster.filter((_, position) => position !== index))
}

/** What "Wie letztes Mal" remembers per game. */
export interface LastLobby {
  players: Array<{ type: 'human'; profileId: string } | { type: 'ai' }>
  aiDifficulty?: string
  memoryGridSize?: string
  puzzleGridSize?: string
  puzzleImageId?: string
}

export function toLastLobby(
  roster: readonly SessionPlayerInput[],
  options: Omit<LastLobby, 'players'>,
): LastLobby {
  return {
    ...options,
    players: roster.map((player) => (player.type === 'human' && player.profileId
      ? { type: 'human' as const, profileId: player.profileId }
      : { type: 'ai' as const })),
  }
}

/** Rebuilds the roster; children whose profile was deleted are skipped. */
export function restoreRoster(
  last: LastLobby,
  profiles: readonly Profile[],
  maxPlayers: number,
): SessionPlayerInput[] {
  const roster: SessionPlayerInput[] = []
  for (const entry of last.players) {
    if (roster.length >= Math.min(maxPlayers, MAX_ROSTER)) break
    if (entry.type === 'ai') {
      roster.push({ type: 'ai', displayName: AI_NAMES[0], avatarId: AI_AVATARS[0] })
      continue
    }
    const profile = profiles.find((item) => item.id === entry.profileId)
    if (profile && rosterIndexOfProfile(roster, profile.id) < 0) roster.push(profilePlayer(profile))
  }
  return renameAis(roster)
}
