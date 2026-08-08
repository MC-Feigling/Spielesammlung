export type GameId = 'memory' | 'kniffel' | 'ludo' | 'racing' | 'uno' | 'connectFour' | 'shutTheBox' | 'muehle' | 'horseRacing'
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
