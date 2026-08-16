import { describe, expect, it } from 'vitest'
import { getHandymanJob } from '../../app/features/games/handyman/catalog'
import { createHandymanGame } from '../../app/features/games/handyman/engine'

describe('handyman engine', () => {
  const players = [
    { seatIndex: 0, type: 'human' as const },
    { seatIndex: 1, type: 'ai' as const },
  ]

  it('deals a job with three tool and part choices', () => {
    const game = createHandymanGame({ players, seed: 1 })
    const state = game.getState()

    expect(state.phase).toBe('pickTool')
    expect(state.currentJobId).toBeTruthy()
    expect(state.choices?.tools).toHaveLength(3)
    expect(state.choices?.parts).toHaveLength(3)
    expect(state.roundIndex).toBe(0)
    expect(state.totalRounds).toBe(5)
  })

  it('scores after correct tool then part', () => {
    const game = createHandymanGame({ players, seed: 2 })
    let state = game.getState()
    const job = getHandymanJob(state.currentJobId!)

    game.pickTool(0, job.toolId)
    state = game.getState()
    expect(state.phase).toBe('pickPart')
    expect(state.selectedToolId).toBe(job.toolId)

    game.pickPart(0, job.partId)
    state = game.getState()
    expect(state.phase).toBe('feedback')
    expect(state.lastFeedback).toBe('correct')
    expect(state.players[0]?.jobsCompleted).toBe(1)
  })

  it('ends turn on wrong tool without scoring', () => {
    const game = createHandymanGame({ players, seed: 3 })
    const stateBefore = game.getState()
    const job = getHandymanJob(stateBefore.currentJobId!)
    const wrongTool = stateBefore.choices!.tools.find((toolId) => toolId !== job.toolId)!

    game.pickTool(0, wrongTool)
    const state = game.getState()
    expect(state.phase).toBe('feedback')
    expect(state.lastFeedback).toBe('wrongTool')
    expect(state.players[0]?.jobsCompleted).toBe(0)
  })

  it('ends turn on wrong part without scoring', () => {
    const game = createHandymanGame({ players, seed: 4 })
    let state = game.getState()
    const job = getHandymanJob(state.currentJobId!)

    game.pickTool(0, job.toolId)
    state = game.getState()
    const wrongPart = state.choices!.parts.find((partId) => partId !== job.partId)!
    game.pickPart(0, wrongPart)

    state = game.getState()
    expect(state.phase).toBe('feedback')
    expect(state.lastFeedback).toBe('wrongPart')
    expect(state.players[0]?.jobsCompleted).toBe(0)
  })

  it('ignores picks from non-current seats', () => {
    const game = createHandymanGame({ players, seed: 5 })
    const stateBefore = game.getState()
    const job = getHandymanJob(stateBefore.currentJobId!)

    game.pickTool(1, job.toolId)
    expect(game.getState().phase).toBe('pickTool')
  })

  it('finishes after configured rounds and supports ties', () => {
    const game = createHandymanGame({ players, seed: 6, totalRounds: 1 })

    // Seat 0 fails
    let state = game.getState()
    const job0 = getHandymanJob(state.currentJobId!)
    const wrong0 = state.choices!.tools.find((toolId) => toolId !== job0.toolId)!
    game.pickTool(0, wrong0)
    game.acknowledgeFeedback()

    // Seat 1 fails
    state = game.getState()
    const job1 = getHandymanJob(state.currentJobId!)
    const wrong1 = state.choices!.tools.find((toolId) => toolId !== job1.toolId)!
    game.pickTool(1, wrong1)
    game.acknowledgeFeedback()

    state = game.getState()
    expect(state.phase).toBe('finished')
    expect(state.winnerSeatIndexes).toEqual([0, 1])
  })

  it('awards win to highest job count', () => {
    const game = createHandymanGame({ players, seed: 7, totalRounds: 1 })

    let state = game.getState()
    const job0 = getHandymanJob(state.currentJobId!)
    game.pickTool(0, job0.toolId)
    game.pickPart(0, job0.partId)
    game.acknowledgeFeedback()

    state = game.getState()
    const job1 = getHandymanJob(state.currentJobId!)
    const wrong1 = state.choices!.tools.find((toolId) => toolId !== job1.toolId)!
    game.pickTool(1, wrong1)
    game.acknowledgeFeedback()

    state = game.getState()
    expect(state.phase).toBe('finished')
    expect(state.winnerSeatIndexes).toEqual([0])
  })
})
