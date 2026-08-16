export type ToolId = 'hammer' | 'screwdriver' | 'wrench' | 'pliers' | 'paintbrush' | 'tape'
export type PartId = 'nail' | 'screw' | 'pipe' | 'wire' | 'paint' | 'hinge'

export interface HandymanJob {
  id: string
  title: string
  toolId: ToolId
  partId: PartId
}

export interface HandymanChoiceSet {
  tools: ToolId[]
  parts: PartId[]
}

export const TOOL_IDS: readonly ToolId[] = [
  'hammer',
  'screwdriver',
  'wrench',
  'pliers',
  'paintbrush',
  'tape',
] as const

export const PART_IDS: readonly PartId[] = [
  'nail',
  'screw',
  'pipe',
  'wire',
  'paint',
  'hinge',
] as const

export const TOOL_LABELS: Record<ToolId, string> = {
  hammer: 'Hammer',
  screwdriver: 'Schraubenzieher',
  wrench: 'Schraubenschlüssel',
  pliers: 'Zange',
  paintbrush: 'Pinsel',
  tape: 'Klebeband',
}

export const PART_LABELS: Record<PartId, string> = {
  nail: 'Nagel',
  screw: 'Schraube',
  pipe: 'Rohr',
  wire: 'Kabel',
  paint: 'Farbe',
  hinge: 'Scharnier',
}

export const HANDYMAN_JOBS: readonly HandymanJob[] = [
  { id: 'lamp', title: 'Lampe reparieren', toolId: 'screwdriver', partId: 'wire' },
  { id: 'faucet', title: 'Wasserhahn dicht machen', toolId: 'wrench', partId: 'pipe' },
  { id: 'picture', title: 'Bild aufhängen', toolId: 'hammer', partId: 'nail' },
  { id: 'shelf', title: 'Regal festschrauben', toolId: 'screwdriver', partId: 'screw' },
  { id: 'door', title: 'Tür einhängen', toolId: 'screwdriver', partId: 'hinge' },
  { id: 'bike', title: 'Fahrrad festziehen', toolId: 'wrench', partId: 'screw' },
  { id: 'cable', title: 'Kabel greifen', toolId: 'pliers', partId: 'wire' },
  { id: 'fence', title: 'Zaun streichen', toolId: 'paintbrush', partId: 'paint' },
] as const

export function getHandymanJob(jobId: string): HandymanJob {
  const job = HANDYMAN_JOBS.find((entry) => entry.id === jobId)
  if (!job) {
    throw new Error(`Unknown handyman job: ${jobId}`)
  }
  return job
}

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(items.length - 1, Math.floor(random() * (index + 1)))
    const current = items[index]!
    items[index] = items[swapIndex]!
    items[swapIndex] = current
  }
  return items
}

function pickDistractors<T extends string>(
  allIds: readonly T[],
  correctId: T,
  count: number,
  random: () => number,
): T[] {
  const pool = shuffleInPlace(
    allIds.filter((id) => id !== correctId),
    random,
  )
  return pool.slice(0, count)
}

export function buildChoiceSet(
  job: HandymanJob,
  choiceCount: number,
  random: () => number,
): HandymanChoiceSet {
  const distractorCount = choiceCount - 1
  const tools = shuffleInPlace(
    [job.toolId, ...pickDistractors(TOOL_IDS, job.toolId, distractorCount, random)],
    random,
  )
  const parts = shuffleInPlace(
    [job.partId, ...pickDistractors(PART_IDS, job.partId, distractorCount, random)],
    random,
  )
  return { tools, parts }
}
