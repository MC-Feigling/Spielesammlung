/** Player colours by position in the round (matches Ludo, UNO, races: red, yellow, blue, green). */
export const PLAYER_COLORS = ['#e45b3a', '#f0b429', '#3d8fd1', '#4faf6a'] as const
/** Readable text colour on top of PLAYER_COLORS. */
export const PLAYER_TEXT_COLORS = ['#ffffff', '#2b2118', '#ffffff', '#ffffff'] as const

export function playerColor(index: number): string {
  return PLAYER_COLORS[((index % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length]!
}

export function playerTextColor(index: number): string {
  return PLAYER_TEXT_COLORS[((index % PLAYER_TEXT_COLORS.length) + PLAYER_TEXT_COLORS.length) % PLAYER_TEXT_COLORS.length]!
}
