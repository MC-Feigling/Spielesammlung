import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  LANE_COUNT,
  SPAWN_INTERVAL_END_MS,
  SPAWN_INTERVAL_START_MS,
  TARGET_RACE_MS,
  TRACK_LENGTH,
  createRacingGame,
  difficultyFromProgress,
  pickSpawnLanes,
  spawnCountForDifficulty,
  spawnIntervalMs,
} from '../../app/features/games/racing/engine'

describe('racing engine', () => {
  it('targets about three minutes at base speed', () => {
    expect(TRACK_LENGTH).toBe(BASE_SPEED * TARGET_RACE_MS)
    expect(TRACK_LENGTH / BASE_SPEED).toBe(TARGET_RACE_MS)
    expect(TARGET_RACE_MS).toBe(180_000)
  })

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

  it('increases spawn pressure with progress', () => {
    expect(difficultyFromProgress(0)).toBe(0)
    expect(difficultyFromProgress(TRACK_LENGTH / 2)).toBeCloseTo(0.5)
    expect(difficultyFromProgress(TRACK_LENGTH)).toBe(1)
    expect(spawnIntervalMs(0)).toBe(SPAWN_INTERVAL_START_MS)
    expect(spawnIntervalMs(1)).toBe(SPAWN_INTERVAL_END_MS)
    expect(spawnIntervalMs(1)).toBeLessThan(spawnIntervalMs(0))
    expect(spawnCountForDifficulty(0, () => 0)).toBe(1)
    expect(spawnCountForDifficulty(1, () => 0)).toBe(2)
  })

  it('never blocks all lanes in one spawn wave', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(pickSpawnLanes(3).length).toBeLessThan(LANE_COUNT)
      expect(pickSpawnLanes(2).length).toBe(2)
    }
  })
})
