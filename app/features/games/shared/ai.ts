export type AiDifficulty = 'easy' | 'hard'

export const DEFAULT_AI_DIFFICULTY: AiDifficulty = 'easy'

/** Chance that easy Memory AI skips a known match. */
export const MEMORY_EASY_FORGET_RATE = 0.55

/** Chance that easy Ludo AI picks a random legal move. */
export const LUDO_EASY_BLUNDER_RATE = 0.5

/** Chance that easy Kniffel AI skips the best score. */
export const KNIFFEL_EASY_BLUNDER_RATE = 0.4

/** Chance that easy UNO AI picks a random legal action. */
export const UNO_EASY_BLUNDER_RATE = 0.45

/** Chance that easy Connect Four AI picks a random legal move. */
export const CONNECT_FOUR_EASY_BLUNDER_RATE = 0.45
