import { describe, expect, it } from 'vitest'
import {
  chooseHandymanPart,
  chooseHandymanTool,
  HANDYMAN_EASY_BLUNDER_RATE,
  HANDYMAN_HARD_BLUNDER_RATE,
} from '../../app/features/games/handyman/ai'
import { getHandymanJob, type PartId, type ToolId } from '../../app/features/games/handyman/catalog'

describe('handyman AI', () => {
  const job = getHandymanJob('lamp')
  const tools: ToolId[] = ['hammer', 'screwdriver', 'wrench']
  const parts: PartId[] = ['nail', 'wire', 'paint']

  it('always returns an offered tool id', () => {
    const pick = chooseHandymanTool(job, tools, { difficulty: 'easy', random: () => 0.99 })
    expect(tools).toContain(pick)
  })

  it('always returns an offered part id', () => {
    const pick = chooseHandymanPart(job, parts, { difficulty: 'medium', random: () => 0.5 })
    expect(parts).toContain(pick)
  })

  it('hard usually picks the correct tool when not blundering', () => {
    const pick = chooseHandymanTool(job, tools, {
      difficulty: 'hard',
      random: () => HANDYMAN_HARD_BLUNDER_RATE + 0.01,
    })
    expect(pick).toBe('screwdriver')
  })

  it('easy can blunder to an incorrect tool', () => {
    let call = 0
    const pick = chooseHandymanTool(job, tools, {
      difficulty: 'easy',
      random: () => {
        call += 1
        if (call === 1) return HANDYMAN_EASY_BLUNDER_RATE - 0.01
        return 0
      },
    })
    expect(pick).not.toBe('screwdriver')
    expect(tools).toContain(pick)
  })
})
