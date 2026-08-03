import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isFullyHome } from '../../app/features/games/ludo/board'

function readSource(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('final review UI fixes', () => {
  it('supports game-specific turn banner hints', () => {
    const turnBanner = readSource('app/components/ui/TurnBanner.vue')
    const memoryBoard = readSource('app/features/games/memory/MemoryBoard.vue')
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    const ludoBoard = readSource('app/features/games/ludo/LudoBoard.vue')

    expect(turnBanner).toContain('hint?: string')
    expect(turnBanner).toContain("'Finde zwei gleiche Karten.'")
    expect(turnBanner).toContain('{{ hint }}')
    expect(memoryBoard).toContain(":hint=\"isAiTurn ? 'Die Karten werden gleich aufgedeckt.' : 'Finde zwei gleiche Karten.'\"")
    expect(kniffelBoard).toContain(":hint=\"isAiTurn ? 'Die KI würfelt…' : 'Würfle und trage Punkte ein.'\"")
    expect(ludoBoard).toContain(":hint=\"isAiTurn ? 'Die KI zieht…' : 'Würfle und ziehe deine Figur.'\"")
  })

  it('navigates away before clearing the active session', () => {
    const playPage = readSource('app/pages/play/[game].vue')
    const endGame = playPage.match(/async function endGame\(\) \{[\s\S]*?\n\}/)?.[0]

    expect(endGame).toBeDefined()
    expect(endGame?.indexOf("await navigateTo('/')")).toBeLessThan(endGame?.indexOf('session.endSession()') ?? -1)
    expect(playPage).toContain('Wird geladen…')
  })

  it('counts only fully home Ludo pieces as in the goal', () => {
    expect(isFullyHome({ progress: 42 })).toBe(false)
    expect(isFullyHome({ progress: 43 })).toBe(true)
  })
})
