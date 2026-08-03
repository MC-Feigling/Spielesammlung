export type GameId = 'memory' | 'kniffel' | 'ludo' | 'racing'
export type UiScale = 'large' | 'compact'
export type PlayerType = 'human' | 'ai'

export interface SessionPlayer {
  seatIndex: number
  type: PlayerType
  profileId?: string
  displayName: string
  avatarId: string
  color?: string
}
