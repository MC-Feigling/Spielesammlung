import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  LANE_COUNT,
  TRACK_LENGTH,
  createRacingGame,
} from '../../app/features/games/racing/engine'

describe('racing engine', () => {
  it('clamps lane changes to 0..LANE_COUNT-1', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    // skip countdown
    game.state.phase = 'racing'
    game.state.countdownMs = 0
    const car = game.state.cars[0]!
    car.lane = 0
    game.setLaneIntent(0, -1)
    expect(car.lane).toBe(0)
    car.lane = LANE_COUNT - 1
    game.setLaneIntent(0, 1)
    expect(car.lane).toBe(LANE_COUNT - 1)
  })

  it('applies slowdown on same-lane obstacle overlap', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const car = game.state.cars[0]!
    car.lane = 1
    car.progress = 10
    game.state.obstacles = [{ id: 1, lane: 1, progress: 10 }]
    game.tick(16)
    expect(car.slowdownUntil).toBeGreaterThan(0)
    expect(car.speed).toBeLessThan(BASE_SPEED)
  })

  it('declares winner when progress reaches TRACK_LENGTH', () => {
    const game = createRacingGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'human' },
      ],
    })
    game.state.phase = 'racing'
    game.state.cars[0]!.progress = TRACK_LENGTH
    game.tick(16)
    expect(game.state.phase).toBe('finished')
    expect(game.getWinnerSeatIndex()).toBe(0)
  })

  it('ignores lane intent during countdown', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    expect(game.state.phase).toBe('countdown')
    const lane = game.state.cars[0]!.lane
    game.setLaneIntent(0, 1)
    expect(game.state.cars[0]!.lane).toBe(lane)
  })
})
