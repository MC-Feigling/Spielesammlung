/** Sprite data for the side-view horse (viewBox ≈ 0..200 × -10..130, hooves on y≈124). */

export type Point = readonly [number, number]
/** anchor → knee → fetlock → hoof */
export type LegPoints = readonly [Point, Point, Point, Point]

export type HorsePoseName = 'stand' | 'stretch' | 'land' | 'gather' | 'push' | 'jump'

export interface HorsePose {
  /** vertical body offset (negative = up) */
  dy: number
  /** far front, near front, far hind, near hind */
  ff: LegPoints
  fn: LegPoints
  hf: LegPoints
  hn: LegPoints
}

export type HorseCoatName = 'bay' | 'chestnut' | 'black' | 'grey'

export interface HorseCoat {
  body: string
  shade: string
  mane: string
  lower: string
  blaze: boolean
}

export const HORSE_COATS: Record<HorseCoatName, HorseCoat> = {
  bay: { body: '#8a4b24', shade: '#6d3a1a', mane: '#1d1410', lower: '#1d1410', blaze: false },
  chestnut: { body: '#b8622c', shade: '#954c1f', mane: '#7a3612', lower: '#954c1f', blaze: true },
  black: { body: '#2f2622', shade: '#1d1714', mane: '#0e0b0a', lower: '#0e0b0a', blaze: false },
  grey: { body: '#ddd7cd', shade: '#bdb5a8', mane: '#8e8880', lower: '#9c958b', blaze: false },
}

export const COAT_ORDER: readonly HorseCoatName[] = ['bay', 'chestnut', 'black', 'grey']

const F_FAR: Point = [120, 76]
const F_NEAR: Point = [126, 76]
const H_FAR: Point = [58, 74]
const H_NEAR: Point = [64, 74]

export const HORSE_POSES: Record<HorsePoseName, HorsePose> = {
  stand: {
    dy: 0,
    ff: [F_FAR, [118, 98], [118, 112], [118, 123]],
    fn: [F_NEAR, [128, 98], [128, 112], [129, 124]],
    hf: [H_FAR, [56, 96], [60, 110], [58, 123]],
    hn: [H_NEAR, [68, 96], [70, 110], [70, 124]],
  },
  stretch: {
    dy: -6,
    ff: [F_FAR, [134, 96], [146, 108], [156, 113]],
    fn: [F_NEAR, [140, 94], [154, 104], [165, 107]],
    hf: [H_FAR, [48, 94], [34, 106], [24, 111]],
    hn: [H_NEAR, [52, 92], [37, 100], [26, 103]],
  },
  land: {
    dy: 3,
    ff: [F_FAR, [124, 98], [122, 112], [118, 123]],
    fn: [F_NEAR, [132, 100], [136, 114], [141, 124]],
    hf: [H_FAR, [60, 94], [50, 106], [56, 112]],
    hn: [H_NEAR, [66, 94], [60, 108], [66, 114]],
  },
  gather: {
    dy: 0,
    ff: [F_FAR, [126, 98], [116, 112], [110, 107]],
    fn: [F_NEAR, [131, 96], [119, 106], [114, 100]],
    hf: [H_FAR, [72, 94], [80, 112], [90, 117]],
    hn: [H_NEAR, [78, 92], [85, 108], [95, 113]],
  },
  push: {
    dy: 1,
    ff: [F_FAR, [130, 96], [124, 108], [130, 114]],
    fn: [F_NEAR, [138, 94], [134, 106], [140, 110]],
    hf: [H_FAR, [60, 98], [54, 113], [48, 124]],
    hn: [H_NEAR, [70, 98], [67, 113], [71, 124]],
  },
  jump: {
    dy: -4,
    ff: [F_FAR, [130, 94], [118, 104], [112, 98]],
    fn: [F_NEAR, [136, 92], [124, 100], [118, 94]],
    hf: [H_FAR, [48, 94], [34, 106], [24, 111]],
    hn: [H_NEAR, [52, 92], [37, 100], [26, 103]],
  },
}

/** Gallop cycle order: flight → front landing → gather → hind push-off. */
export const GALLOP_CYCLE: readonly HorsePoseName[] = ['stretch', 'land', 'gather', 'push']

/** Gallop frames per progress unit: ties stride rate to actual speed. */
export const GALLOP_FRAMES_PER_UNIT = 0.6

export function gallopPose(progress: number, speed: number, airborne: boolean): HorsePoseName {
  if (airborne) return 'jump'
  if (speed <= 0.0015) return 'stand'
  const frame = Math.floor(Math.max(0, progress) * GALLOP_FRAMES_PER_UNIT) % GALLOP_CYCLE.length
  return GALLOP_CYCLE[frame]!
}

export function coatForLane(lane: number): HorseCoatName {
  return COAT_ORDER[((lane % COAT_ORDER.length) + COAT_ORDER.length) % COAT_ORDER.length]!
}

export function segment(a: Point, b: Point): string {
  return `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`
}
