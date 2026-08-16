import {
  HANDYMAN_JOBS,
  buildChoiceSet,
  getHandymanJob,
  type HandymanChoiceSet,
  type PartId,
  type ToolId,
} from './catalog'

export const TOTAL_ROUNDS_DEFAULT = 5
export const CHOICE_COUNT = 3

export type HandymanPhase = 'pickTool' | 'pickPart' | 'feedback' | 'finished'
export type HandymanFeedback = 'correct' | 'wrongTool' | 'wrongPart'

export interface HandymanPlayerState {
  seatIndex: number
  jobsCompleted: number
}

export interface HandymanState {
  phase: HandymanPhase
  roundIndex: number
  totalRounds: number
  currentSeatIndex: number
  players: HandymanPlayerState[]
  currentJobId: string | null
  choices: HandymanChoiceSet | null
  selectedToolId: ToolId | null
  lastFeedback: HandymanFeedback | null
  winnerSeatIndexes: number[]
}

export interface HandymanGame {
  getState: () => HandymanState
  pickTool: (seatIndex: number, toolId: ToolId) => void
  pickPart: (seatIndex: number, partId: PartId) => void
  acknowledgeFeedback: () => void
  getWinnerSeatIndexes: () => number[]
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function cloneState(state: HandymanState): HandymanState {
  return {
    phase: state.phase,
    roundIndex: state.roundIndex,
    totalRounds: state.totalRounds,
    currentSeatIndex: state.currentSeatIndex,
    players: state.players.map((player) => ({ ...player })),
    currentJobId: state.currentJobId,
    choices: state.choices
      ? {
          tools: [...state.choices.tools],
          parts: [...state.choices.parts],
        }
      : null,
    selectedToolId: state.selectedToolId,
    lastFeedback: state.lastFeedback,
    winnerSeatIndexes: [...state.winnerSeatIndexes],
  }
}

function computeWinners(players: HandymanPlayerState[]): number[] {
  const maxJobs = Math.max(...players.map((player) => player.jobsCompleted))
  return players
    .filter((player) => player.jobsCompleted === maxJobs)
    .map((player) => player.seatIndex)
}

export function createHandymanGame(config: {
  players: Array<{ seatIndex: number; type: 'human' | 'ai' }>
  seed?: number
  totalRounds?: number
}): HandymanGame {
  if (config.players.length < 2 || config.players.length > 4) {
    throw new Error('Handyman needs 2 to 4 players')
  }

  const random = config.seed === undefined ? Math.random : createSeededRandom(config.seed)
  const totalRounds = config.totalRounds ?? TOTAL_ROUNDS_DEFAULT
  const seatOrder = config.players.map((player) => player.seatIndex)

  let unusedJobIds = HANDYMAN_JOBS.map((job) => job.id)
  let state: HandymanState = {
    phase: 'pickTool',
    roundIndex: 0,
    totalRounds,
    currentSeatIndex: seatOrder[0]!,
    players: seatOrder.map((seatIndex) => ({ seatIndex, jobsCompleted: 0 })),
    currentJobId: null,
    choices: null,
    selectedToolId: null,
    lastFeedback: null,
    winnerSeatIndexes: [],
  }

  function dealJob(): void {
    if (unusedJobIds.length === 0) {
      unusedJobIds = HANDYMAN_JOBS.map((job) => job.id)
    }

    const pickIndex = Math.min(
      unusedJobIds.length - 1,
      Math.floor(random() * unusedJobIds.length),
    )
    const [jobId] = unusedJobIds.splice(pickIndex, 1)
    const job = getHandymanJob(jobId!)
    state.currentJobId = job.id
    state.choices = buildChoiceSet(job, CHOICE_COUNT, random)
    state.selectedToolId = null
    state.lastFeedback = null
    state.phase = 'pickTool'
  }

  dealJob()

  function finishMatch(): void {
    state.phase = 'finished'
    state.currentJobId = null
    state.choices = null
    state.selectedToolId = null
    state.lastFeedback = null
    state.winnerSeatIndexes = computeWinners(state.players)
  }

  function advanceAfterFeedback(): void {
    const currentOrderIndex = seatOrder.indexOf(state.currentSeatIndex)
    const nextOrderIndex = currentOrderIndex + 1

    if (nextOrderIndex >= seatOrder.length) {
      state.roundIndex += 1
      if (state.roundIndex >= state.totalRounds) {
        finishMatch()
        return
      }
      state.currentSeatIndex = seatOrder[0]!
    } else {
      state.currentSeatIndex = seatOrder[nextOrderIndex]!
    }

    dealJob()
  }

  return {
    getState: () => cloneState(state),
    getWinnerSeatIndexes: () => [...state.winnerSeatIndexes],
    pickTool: (seatIndex, toolId) => {
      if (state.phase !== 'pickTool' || seatIndex !== state.currentSeatIndex || !state.choices) {
        return
      }
      if (!state.choices.tools.includes(toolId) || !state.currentJobId) {
        return
      }

      const job = getHandymanJob(state.currentJobId)
      if (toolId !== job.toolId) {
        state.lastFeedback = 'wrongTool'
        state.phase = 'feedback'
        return
      }

      state.selectedToolId = toolId
      state.phase = 'pickPart'
    },
    pickPart: (seatIndex, partId) => {
      if (state.phase !== 'pickPart' || seatIndex !== state.currentSeatIndex || !state.choices) {
        return
      }
      if (!state.choices.parts.includes(partId) || !state.currentJobId) {
        return
      }

      const job = getHandymanJob(state.currentJobId)
      if (partId !== job.partId) {
        state.lastFeedback = 'wrongPart'
        state.phase = 'feedback'
        return
      }

      const player = state.players.find((entry) => entry.seatIndex === seatIndex)
      if (player) {
        player.jobsCompleted += 1
      }
      state.lastFeedback = 'correct'
      state.phase = 'feedback'
    },
    acknowledgeFeedback: () => {
      if (state.phase !== 'feedback') return
      advanceAfterFeedback()
    },
  }
}
