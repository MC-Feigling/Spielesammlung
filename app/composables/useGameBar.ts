import type { InjectionKey } from 'vue'

export interface GameBarTurn {
  seatIndex: number | null
  playerName: string
  isAi: boolean
  hint: string
}

export interface GameBarState {
  turn: GameBarTurn | null
}

export const GAME_BAR_KEY: InjectionKey<GameBarState> = Symbol('game-bar')

/** Called by the play page: boards below can report whose turn it is. */
export function provideGameBar(): GameBarState {
  const state = reactive<GameBarState>({ turn: null })
  provide(GAME_BAR_KEY, state)
  return state
}

/** Returns the play page's game bar, or null when rendered elsewhere. */
export function useGameBar(): GameBarState | null {
  return inject(GAME_BAR_KEY, null)
}
