import { describe, expect, it } from 'vitest'
import { createShutTheBoxGame } from '../../app/features/games/shutTheBox/engine'

/** Maps die face 1–6 to a random() value that kniffel-style rollDie produces. */
function dieToRandom(die: number): number {
  return (die - 1) / 6
}

function createDieRandom(dice: number[]): () => number {
  let index = 0
  return () => {
    const die = dice[index]
    if (die === undefined) {
      throw new Error(`Unexpected random call at index ${index}`)
    }
    index += 1
    return dieToRandom(die)
  }
}

describe('shut the box engine', () => {
  it('starts with all tiles open, awaitingRoll, seat 0', () => {
    const game = createShutTheBoxGame({ playerCount: 2 })
    const state = game.getState()

    expect(state.currentPlayerIndex).toBe(0)
    expect(state.phase).toBe('awaitingRoll')
    expect(state.dice).toEqual([])
    expect(state.boxes).toHaveLength(2)
    expect(state.boxes[0]!.open).toEqual(Array.from({ length: 9 }, () => true))
    expect(state.boxes[0]!.score).toBeNull()
    expect(game.isTerminal()).toBe(false)
    expect(game.getValidActions()).toEqual([{ type: 'roll' }])
  })

  it('rejects invalid playerCount with a German error', () => {
    expect(() => createShutTheBoxGame({ playerCount: 1 })).toThrow('zwei bis vier')
    expect(() => createShutTheBoxGame({ playerCount: 5 })).toThrow('zwei bis vier')
  })

  it('rolls two dice with injectable random and enters awaitingClose', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })
    const result = game.applyAction({ type: 'roll' })

    expect(result.state.dice).toEqual([1, 1])
    expect(result.state.phase).toBe('awaitingClose')
    expect(result.winnerSeatIndexes).toEqual([])
    expect(game.getValidActions()).toEqual([{ type: 'close', numbers: [2] }])
  })

  it('closes a valid subset, shuts tiles, and returns to awaitingRoll', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })
    game.applyAction({ type: 'roll' })
    const result = game.applyAction({ type: 'close', numbers: [2] })

    expect(result.state.boxes[0]!.open[1]).toBe(false)
    expect(result.state.phase).toBe('awaitingRoll')
    expect(result.state.dice).toEqual([])
    expect(result.state.currentPlayerIndex).toBe(0)
    expect(result.state.boxes[0]!.score).toBeNull()
  })

  it('ends the turn with remainingSum when a roll has no legal close', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [2] })
    const result = game.applyAction({ type: 'roll' })

    expect(result.state.boxes[0]!.score).toBe(43)
    expect(result.state.currentPlayerIndex).toBe(1)
    expect(result.state.phase).toBe('awaitingRoll')
    expect(result.state.dice).toEqual([])
  })

  function playPerfectShut(game: ReturnType<typeof createShutTheBoxGame>): ReturnType<
    ReturnType<typeof createShutTheBoxGame>['applyAction']
  > {
    // Remaining after [3,9]/[4,8]/[5,7]: {1,2,6} — need sum 6 then sum 3
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [3, 9] })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [4, 8] })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [5, 7] })
    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [6] })
    game.applyAction({ type: 'roll' })
    return game.applyAction({ type: 'close', numbers: [1, 2] })
  }

  const PERFECT_SHUT_DICE = [
    6, 6,
    6, 6,
    6, 6,
    1, 5,
    1, 2,
  ] as const

  it('scores 0 and advances on perfect shut', () => {
    const game = createShutTheBoxGame({
      playerCount: 2,
      random: createDieRandom([...PERFECT_SHUT_DICE]),
    })

    const result = playPerfectShut(game)

    expect(result.state.boxes[0]!.open.every((tile) => !tile)).toBe(true)
    expect(result.state.boxes[0]!.score).toBe(0)
    expect(result.state.currentPlayerIndex).toBe(1)
    expect(result.state.phase).toBe('awaitingRoll')
    expect(result.state.dice).toEqual([])
  })

  it('declares the lowest score as winner when all players scored', () => {
    const game = createShutTheBoxGame({
      playerCount: 2,
      random: createDieRandom([
        1, 1,
        1, 1,
        ...PERFECT_SHUT_DICE,
      ]),
    })

    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [2] })
    game.applyAction({ type: 'roll' })

    const result = playPerfectShut(game)

    expect(result.state.boxes[0]!.score).toBe(43)
    expect(result.state.boxes[1]!.score).toBe(0)
    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([1])
  })

  it('returns multiple winners on a score tie', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })

    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [2] })
    game.applyAction({ type: 'roll' })

    game.applyAction({ type: 'roll' })
    game.applyAction({ type: 'close', numbers: [2] })
    const result = game.applyAction({ type: 'roll' })

    expect(result.state.boxes[0]!.score).toBe(43)
    expect(result.state.boxes[1]!.score).toBe(43)
    expect(game.isTerminal()).toBe(true)
    expect(result.winnerSeatIndexes).toEqual([0, 1])
  })

  it('rejects roll in awaitingClose with a German error', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })
    game.applyAction({ type: 'roll' })

    expect(() => game.applyAction({ type: 'roll' })).toThrow(/nicht erlaubt|würfeln|Phase/i)
  })

  it('rejects an illegal close with a German error', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })
    game.applyAction({ type: 'roll' })

    expect(() => game.applyAction({ type: 'close', numbers: [1, 5] })).toThrow(/nicht erlaubt|ungültig|zuklappen/i)
  })

  it('rejects close while awaitingRoll with a German error', () => {
    const game = createShutTheBoxGame({ playerCount: 2 })

    expect(() => game.applyAction({ type: 'close', numbers: [1] })).toThrow(/nicht erlaubt|würfeln|Phase/i)
  })

  it('deep-clones state from getState', () => {
    const game = createShutTheBoxGame({ playerCount: 2, random: () => 0 })
    const state = game.getState()
    state.boxes[0]!.open[0] = false
    state.dice.push(9)

    expect(game.getState().boxes[0]!.open[0]).toBe(true)
    expect(game.getState().dice).toEqual([])
  })
})
