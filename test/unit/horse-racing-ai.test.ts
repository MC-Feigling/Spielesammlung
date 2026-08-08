import { describe, expect, it } from 'vitest'
import { chooseHorseRacingActions } from '../../app/features/games/horseRacing/ai'
import { createHorseRacingGame } from '../../app/features/games/horseRacing/engine'

describe('horse racing AI', () => {
  it('holds without jumping when track ahead is clear', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.horses[0]!.progress = 5
    game.state.hurdles = [{ id: 1, progress: 40 }]
    expect(chooseHorseRacingActions(game.state, 0, { difficulty: 'hard' })).toEqual({
      hold: true,
      jump: false,
    })
  })

  it('jumps when hurdle is ahead on hard', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.horses[0]!.progress = 5
    game.state.hurdles = [{ id: 1, progress: 12 }]
    expect(chooseHorseRacingActions(game.state, 0, { difficulty: 'hard' })).toEqual({
      hold: true,
      jump: true,
    })
  })

  it('can skip jump on easy when random blunders', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'ai' }],
    })
    game.state.phase = 'racing'
    game.state.horses[0]!.progress = 5
    game.state.hurdles = [{ id: 1, progress: 12 }]
    expect(chooseHorseRacingActions(game.state, 0, {
      difficulty: 'easy',
      random: () => 0,
    })).toEqual({
      hold: true,
      jump: false,
    })
  })
})
