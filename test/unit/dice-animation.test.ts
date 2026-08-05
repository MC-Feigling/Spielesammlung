import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DICE_ROLL_DURATION_MS } from '../../app/composables/useDiceRollAnimation'

function readSource(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('dice 3d animation', () => {
  it('exposes shared roll duration constant', () => {
    expect(DICE_ROLL_DURATION_MS).toBe(700)
  })

  it('renders a css 3d cube with pip faces', () => {
    const diceDie = readSource('app/components/game/DiceDie.vue')

    expect(diceDie).toContain('transform-style: preserve-3d')
    expect(diceDie).toContain('perspective: 600px')
    expect(diceDie).toContain('@keyframes dice-tumble')
    expect(diceDie).toContain('dice-face--1')
    expect(diceDie).toContain('dice-face--6')
    expect(diceDie).toContain('prefers-reduced-motion')
  })

  it('colors held dice faces so the hold state stays visible on the 3d cube', () => {
    const diceDie = readSource('app/components/game/DiceDie.vue')

    expect(diceDie).toContain('dice-root--held')
    expect(diceDie).toMatch(/\.dice-root--held\s+\.dice-face\s*\{/)
    expect(diceDie).toMatch(/\.dice-root--held\s+\.dice-face[\s\S]*?background:\s*#fff3c4/)
    expect(diceDie).toMatch(/\.dice-root--held\s+\.dice-face[\s\S]*?border-color:\s*var\(--color-accent\)/)
  })

  it('uses roll animation composable in dice games', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    const shutTheBoxBoard = readSource('app/features/games/shutTheBox/ShutTheBoxBoard.vue')
    const ludoBoard = readSource('app/features/games/ludo/LudoBoard.vue')

    expect(kniffelBoard).toContain('useDiceRollAnimation')
    expect(kniffelBoard).toContain('<DiceDie')
    expect(shutTheBoxBoard).toContain('useDiceRollAnimation')
    expect(shutTheBoxBoard).toContain('<DiceDie')
    expect(ludoBoard).toContain('useDiceRollAnimation')
    expect(ludoBoard).toContain('<DiceDie')
  })

  it('delays engine roll until animation completes', async () => {
    vi.useFakeTimers()

    const onRoll = vi.fn()
    const isRolling = { value: false }
    const rollingIndices = { value: new Set<number>() }

    async function rollWithAnimation(options: {
      onRoll: () => void
      indices?: number[]
    }) {
      if (isRolling.value) return

      isRolling.value = true
      rollingIndices.value = new Set(options.indices)

      await new Promise<void>((resolveTimer) => {
        setTimeout(resolveTimer, DICE_ROLL_DURATION_MS)
      })

      options.onRoll()
      isRolling.value = false
      rollingIndices.value = new Set()
    }

    const rollPromise = rollWithAnimation({ indices: [0, 1], onRoll })
    expect(onRoll).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(DICE_ROLL_DURATION_MS)
    await rollPromise

    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(isRolling.value).toBe(false)

    vi.useRealTimers()
  })
})
