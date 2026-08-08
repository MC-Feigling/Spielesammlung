import { describe, expect, it } from 'vitest'
import {
  createPuzzleRaceGame,
  isPuzzleSolved,
  PUZZLE_RACE_COUNTDOWN_MS,
} from '../../app/features/games/puzzleRace/engine'

describe('puzzle race engine', () => {
  it('scrambles away from identity', () => {
    const game = createPuzzleRaceGame({
      players: [{ seatIndex: 0, type: 'human' }, { seatIndex: 1, type: 'ai' }],
      gridSize: '3x3',
      imageUrl: '/puzzles/meadow.svg',
      seed: 42,
    })
    expect(game.state.gridSize).toBe(3)
    expect(game.state.boards[0]!.tiles).toHaveLength(9)
    expect(isPuzzleSolved(game.state.boards[0]!.tiles)).toBe(false)
    expect(game.state.boards[0]!.tiles).toEqual(game.state.boards[1]!.tiles)
  })

  it('gates swaps during countdown', () => {
    const game = createPuzzleRaceGame({
      players: [{ seatIndex: 0, type: 'human' }, { seatIndex: 1, type: 'ai' }],
      gridSize: '3x3',
      imageUrl: '/puzzles/meadow.svg',
      seed: 7,
    })
    const before = [...game.state.boards[0]!.tiles]
    game.selectTile(0, 0)
    game.selectTile(0, 1)
    expect(game.state.boards[0]!.tiles).toEqual(before)
    expect(game.state.phase).toBe('countdown')
  })

  it('swaps via select-then-select while racing', () => {
    const game = createPuzzleRaceGame({
      players: [{ seatIndex: 0, type: 'human' }, { seatIndex: 1, type: 'ai' }],
      gridSize: '3x3',
      imageUrl: '/puzzles/meadow.svg',
      seed: 7,
    })
    game.state.phase = 'racing'
    game.state.countdownMs = 0
    game.state.boards[0]!.tiles = [1, 0, 2, 3, 4, 5, 6, 7, 8]

    game.selectTile(0, 0)
    expect(game.state.boards[0]!.selectedIndex).toBe(0)
    game.selectTile(0, 1)
    expect(game.state.boards[0]!.tiles).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(game.state.boards[0]!.selectedIndex).toBeNull()
    expect(game.state.phase).toBe('finished')
    expect(game.getWinnerSeatIndex()).toBe(0)
  })

  it('swapTiles finishes and locks later swaps', () => {
    const game = createPuzzleRaceGame({
      players: [{ seatIndex: 0, type: 'human' }, { seatIndex: 1, type: 'ai' }],
      gridSize: '3x3',
      imageUrl: '/puzzles/meadow.svg',
      seed: 3,
    })
    game.state.phase = 'racing'
    game.state.boards[0]!.tiles = [1, 0, 2, 3, 4, 5, 6, 7, 8]
    game.state.boards[1]!.tiles = [1, 0, 2, 3, 4, 5, 6, 7, 8]

    game.swapTiles(0, 0, 1)
    expect(game.getWinnerSeatIndex()).toBe(0)
    expect(game.state.phase).toBe('finished')

    game.swapTiles(1, 0, 1)
    expect(isPuzzleSolved(game.state.boards[1]!.tiles)).toBe(false)
    expect(game.getWinnerSeatIndex()).toBe(0)
  })

  it('tick moves countdown into racing', () => {
    const game = createPuzzleRaceGame({
      players: [{ seatIndex: 0, type: 'human' }, { seatIndex: 1, type: 'ai' }],
      gridSize: '3x3',
      imageUrl: '/puzzles/meadow.svg',
      seed: 1,
    })
    expect(game.state.countdownMs).toBe(PUZZLE_RACE_COUNTDOWN_MS)
    game.tick(PUZZLE_RACE_COUNTDOWN_MS)
    expect(game.state.phase).toBe('racing')
    expect(game.state.countdownMs).toBe(0)
  })

  it('clears selection when same tile tapped twice', () => {
    const game = createPuzzleRaceGame({
      players: [{ seatIndex: 0, type: 'human' }, { seatIndex: 1, type: 'ai' }],
      gridSize: '3x3',
      imageUrl: '/puzzles/meadow.svg',
      seed: 9,
    })
    game.state.phase = 'racing'
    game.selectTile(0, 2)
    game.selectTile(0, 2)
    expect(game.state.boards[0]!.selectedIndex).toBeNull()
  })
})
