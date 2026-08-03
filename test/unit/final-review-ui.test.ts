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

  it('highlights held kniffel dice without conflicting Tailwind utilities', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    const dieButton = kniffelBoard.match(/v-for="\(die, dieIndex\) in state\.dice"[\s\S]*?<\/button>/)?.[0]
    const staticClass = dieButton?.match(/(?<!:)class="([^"]*)"/)?.[1] ?? ''
    const dynamicClass = dieButton?.match(/:class="([\s\S]*?)"\n/)?.[1] ?? ''

    expect(dieButton).toBeDefined()
    expect(staticClass).not.toMatch(/\bbg-white\b/)
    expect(staticClass).not.toMatch(/\bshadow-\[0_4px_0_#c48a4a\]\b/)
    expect(dynamicClass).toMatch(/heldDice\[dieIndex\]\s*\?[\s\S]*?bg-\[#fff3c4\]/)
    expect(dynamicClass).toMatch(/:\s*'[^']*\bbg-white\b/)
  })

  it('recomputes kniffel valid actions from reactive state', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    const validActions = kniffelBoard.match(/const validActions = computed\(\(\) => \{[\s\S]*?\n\}\)/)?.[0]

    expect(validActions).toBeDefined()
    expect(validActions).toMatch(/state\.value/)
    expect(validActions).toMatch(/getValidActions\(\)/)
  })

  it('shows Kniffel Summe oben and Bonus rows', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    expect(kniffelBoard).toContain('Summe oben')
    expect(kniffelBoard).toContain('Bonus (+35 ab 63)')
    expect(kniffelBoard).toContain('upperSum')
    expect(kniffelBoard).toContain('upperBonus')
    expect(kniffelBoard).toContain('totalScore')
  })

  it('shows Kniffel score preview and Streichen buttons', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    expect(kniffelBoard).toContain('previewCategoryScore')
    expect(kniffelBoard).toContain('Streichen')
    expect(kniffelBoard).toContain('categoryButtonLabel')
    expect(kniffelBoard).toContain('categoryButtonVariant')
    expect(kniffelBoard).toContain("'danger'")
  })

  it('supports AppButton danger variant', () => {
    const button = readSource('app/components/ui/AppButton.vue')
    expect(button).toContain("'danger'")
    expect(button).toMatch(/type ButtonVariant = .*danger/)
  })

  it('wires RacingBoard complete emit and control hints', () => {
    const racingBoard = readSource('app/features/games/racing/RacingBoard.vue')
    expect(racingBoard).toContain('complete')
    expect(
      racingBoard.includes('Steuerung')
      || (racingBoard.includes('A') && racingBoard.includes('D')),
    ).toBe(true)
  })

  it('wires UnoBoard on the play page and emits complete', () => {
    const playPage = readSource('app/pages/play/[game].vue')
    const unoBoard = readSource('app/features/games/uno/UnoBoard.vue')
    const games = readSource('app/constants/games.ts')
    const lobbyPage = readSource('app/pages/lobby/[game].vue')

    expect(games).toContain("id: 'uno'")
    expect(games).toContain("value === 'uno'")
    expect(playPage).toContain('UnoBoard')
    expect(playPage).toContain("routeGame === 'uno'")
    expect(playPage).toContain('@complete="completeGame"')
    expect(unoBoard).toContain('complete')
    expect(lobbyPage).toContain('isUnoRosterValid')
  })
})
