export type AiDifficulty = 'easy' | 'medium' | 'hard'

export const AI_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export const DEFAULT_AI_DIFFICULTY: AiDifficulty = 'easy'

/** Chance that easy Memory AI skips a known match. */
export const MEMORY_EASY_FORGET_RATE = 0.55

/** Chance that medium Memory AI skips a known match. */
export const MEMORY_MEDIUM_FORGET_RATE = MEMORY_EASY_FORGET_RATE / 2

/** Chance that easy Ludo AI picks a random legal move. */
export const LUDO_EASY_BLUNDER_RATE = 0.5

/** Chance that medium Ludo AI picks a random legal move. */
export const LUDO_MEDIUM_BLUNDER_RATE = LUDO_EASY_BLUNDER_RATE / 2

/** Chance that easy Kniffel AI skips the best score. */
export const KNIFFEL_EASY_BLUNDER_RATE = 0.4

/** Chance that medium Kniffel AI skips the best score. */
export const KNIFFEL_MEDIUM_BLUNDER_RATE = KNIFFEL_EASY_BLUNDER_RATE / 2

/** Chance that easy UNO AI picks a random legal action. */
export const UNO_EASY_BLUNDER_RATE = 0.45

/** Chance that medium UNO AI picks a random legal action. */
export const UNO_MEDIUM_BLUNDER_RATE = UNO_EASY_BLUNDER_RATE / 2

/** Chance that easy Connect Four AI picks a random legal move. */
export const CONNECT_FOUR_EASY_BLUNDER_RATE = 0.45

/** Chance that medium Connect Four AI picks a random legal move. */
export const CONNECT_FOUR_MEDIUM_BLUNDER_RATE = CONNECT_FOUR_EASY_BLUNDER_RATE / 2

/** Chance that easy Shut the Box AI picks a random legal close. */
export const SHUT_THE_BOX_EASY_BLUNDER_RATE = 0.4

/** Chance that medium Shut the Box AI picks a random legal close. */
export const SHUT_THE_BOX_MEDIUM_BLUNDER_RATE = SHUT_THE_BOX_EASY_BLUNDER_RATE / 2

/** Chance that easy Mühle AI picks a random legal action. */
export const MUEHLE_EASY_BLUNDER_RATE = 0.45

/** Chance that medium Mühle AI picks a random legal action. */
export const MUEHLE_MEDIUM_BLUNDER_RATE = MUEHLE_EASY_BLUNDER_RATE / 2
