import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  LANE_COUNT,
  MEAN_SPEED_MULT,
  SLOWDOWN_FACTOR,
  SLOWDOWN_MS,
  SPAWN_INTERVAL_END_MS,
  SPAWN_INTERVAL_START_MS,
  SPEED_RAMP,
  TARGET_RACE_MS,
  TRACK_LENGTH,
  createRacingGame,
  difficultyFromProgress,
  pickSpawnLanes,
  spawnCountForDifficulty,
  spawnIntervalMs,
  speedMultForProgress,
} from '../../app/features/games/racing/engine'

describe('racing engine', () => {
  it('targets about three minutes at base speed', () => {
    expect(TRACK_LENGTH).toBe(BASE_SPEED * TARGET_RACE_MS * MEAN_SPEED_MULT)
    expect(TRACK_LENGTH / (BASE_SPEED * MEAN_SPEED_MULT)).toBe(TARGET_RACE_MS)
    expect(TARGET_RACE_MS).toBe(180_000)
  })

  it('uses the exact configured speed ramp and slowdown values', () => {
    expect(SPEED_RAMP).toBe(0.5)
    expect(SLOWDOWN_FACTOR).toBe(0.7)
    expect(SLOWDOWN_MS).toBe(400)
    expect(speedMultForProgress(0)).toBe(1)
    expect(speedMultForProgress(TRACK_LENGTH)).toBe(1 + SPEED_RAMP)
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
    expect(car.speed).toBeCloseTo(
      BASE_SPEED * speedMultForProgress(car.progress) * SLOWDOWN_FACTOR,
    )

    game.state.obstacles = []
    game.tick(SLOWDOWN_MS + 1)

    expect(car.speed).toBeCloseTo(BASE_SPEED * speedMultForProgress(car.progress))
  })

  it('does not refresh slowdownUntil while staying overlapped', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const car = game.state.cars[0]!
    car.lane = 1
    car.progress = 10
    game.state.obstacles = [{ id: 1, lane: 1, progress: 10 }]

    game.tick(16)
    const firstSlowdownUntil = car.slowdownUntil
    expect(firstSlowdownUntil).toBeGreaterThan(0)

    // Stay overlapped for several frames without moving past the obstacle.
    for (let i = 0; i < 3; i += 1) {
      car.progress = 10
      game.state.obstacles[0]!.progress = 10
      game.tick(16)
    }

    expect(car.slowdownUntil).toBe(firstSlowdownUntil)
  })

  it('increases car speed with own progress', () => {
    const game = createRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const car = game.state.cars[0]!

    car.progress = TRACK_LENGTH / 2
    game.tick(16)
    expect(car.speed).toBeGreaterThan(BASE_SPEED)

    car.progress = TRACK_LENGTH * 0.9
    game.tick(16)
    expect(car.speed).toBeGreaterThan(BASE_SPEED)
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
