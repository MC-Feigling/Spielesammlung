import { describe, expect, it } from 'vitest'
import {
  BASE_SPEED,
  COAST_SPEED_FACTOR,
  JUMP_AIR_MS,
  MEAN_SPEED_MULT,
  SLOWDOWN_MS,
  TARGET_RACE_MS,
  TRACK_LENGTH,
  coastSpeedForProgress,
  createHorseRacingGame,
  maxSpeedForProgress,
  speedMultForProgress,
} from '../../app/features/games/horseRacing/engine'

describe('horse racing engine', () => {
  it('targets about 2.5 minutes at mean speed', () => {
    expect(TRACK_LENGTH).toBe(BASE_SPEED * TARGET_RACE_MS * MEAN_SPEED_MULT)
    expect(TARGET_RACE_MS).toBe(150_000)
  })

  it('accelerates while holding', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    game.state.countdownMs = 0
    const horse = game.state.horses[0]!
    horse.speed = 0
    game.setHold(0, true)

    for (let i = 0; i < 40; i += 1) {
      game.tick(16)
    }

    expect(horse.speed).toBeGreaterThan(coastSpeedForProgress(horse.progress))
    expect(horse.hold).toBe(true)
  })

  it('decelerates toward coast when released', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const horse = game.state.horses[0]!
    horse.speed = maxSpeedForProgress(0)
    horse.hold = true
    game.setHold(0, false)

    for (let i = 0; i < 80; i += 1) {
      game.tick(16)
    }

    expect(horse.speed).toBeLessThan(maxSpeedForProgress(horse.progress) * 0.6)
    expect(horse.speed).toBeGreaterThanOrEqual(coastSpeedForProgress(horse.progress) * 0.95)
  })

  it('jump sets air time and clears hurdle without slowdown', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const horse = game.state.horses[0]!
    horse.progress = 10
    horse.speed = BASE_SPEED
    game.state.hurdles = [{ id: 1, progress: 10 }]
    game.jump(0)
    expect(horse.airMs).toBe(JUMP_AIR_MS)

    game.tick(16)
    expect(horse.slowdownUntil).toBe(0)
  })

  it('applies edge-triggered slowdown on ground hurdle hit', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    game.state.phase = 'racing'
    const horse = game.state.horses[0]!
    horse.progress = 10
    horse.speed = BASE_SPEED
    horse.airMs = 0
    game.state.hurdles = [{ id: 1, progress: 10 }]

    game.tick(16)
    expect(horse.slowdownUntil).toBeGreaterThan(0)
    const first = horse.slowdownUntil

    horse.progress = 10
    game.state.hurdles[0]!.progress = 10
    game.tick(16)
    expect(horse.slowdownUntil).toBe(first)
  })

  it('ignores hold and jump during countdown', () => {
    const game = createHorseRacingGame({
      players: [{ seatIndex: 0, type: 'human' }],
    })
    expect(game.state.phase).toBe('countdown')
    game.setHold(0, true)
    game.jump(0)
    expect(game.state.horses[0]!.hold).toBe(false)
    expect(game.state.horses[0]!.airMs).toBe(0)
  })

  it('declares winner when progress reaches TRACK_LENGTH', () => {
    const game = createHorseRacingGame({
      players: [
        { seatIndex: 0, type: 'human' },
        { seatIndex: 1, type: 'ai' },
      ],
    })
    game.state.phase = 'racing'
    game.state.horses[0]!.progress = TRACK_LENGTH
    game.tick(16)
    expect(game.state.phase).toBe('finished')
    expect(game.getWinnerSeatIndex()).toBe(0)
  })

  it('uses coast factor from constants', () => {
    expect(COAST_SPEED_FACTOR).toBe(0.25)
    expect(coastSpeedForProgress(0)).toBeCloseTo(BASE_SPEED * COAST_SPEED_FACTOR)
    expect(speedMultForProgress(0)).toBe(1)
  })
})
