export type EngineResult<TState> = {
  state: TState
  winnerSeatIndexes: number[]
}

export interface GameEngine<TState, TAction> {
  getState: () => TState
  getValidActions: () => TAction[]
  applyAction: (action: TAction) => EngineResult<TState>
  isTerminal: () => boolean
}
