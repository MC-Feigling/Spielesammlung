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
    expect(ludoBoard).toContain(':hint="turnHint"')
    expect(ludoBoard).toContain('Tippe eine leuchtende Figur im Haus an')
    expect(ludoBoard).toContain('Würfelversuch')
    expect(ludoBoard).toContain('LUDO_YARD_ROLL_ATTEMPTS_MAX')
    expect(ludoBoard).toContain('diceHelpText')
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

  it('highlights held kniffel dice via DiceDie component', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    const diceDie = kniffelBoard.match(/<DiceDie[\s\S]*?v-for="\(die, dieIndex\) in state\.dice"[\s\S]*?\/>/)?.[0]

    expect(diceDie).toBeDefined()
    expect(diceDie).toContain(':held="state.heldDice[dieIndex]"')
    expect(diceDie).toContain('interactive')
    expect(kniffelBoard).toContain('useDiceRollAnimation')
  })

  it('recomputes kniffel valid actions from reactive state', () => {
    const kniffelBoard = readSource('app/features/games/kniffel/KniffelBoard.vue')
    const validActions = kniffelBoard.match(/const validActions = computed\(\(\) => \{[\s\S]*?\n\}\)/)?.[0]

    expect(validActions).toBeDefined()
    expect(validActions).toMatch(/state\.value/)
    expect(validActions).toMatch(/getValidActions\(\)/)
  })

  it('recomputes ludo valid actions from reactive state', () => {
    const ludoBoard = readSource('app/features/games/ludo/LudoBoard.vue')
    const validActions = ludoBoard.match(/const validActions = computed\(\(\) => \{[\s\S]*?\n\}\)/)?.[0]

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

  it('wires PuzzleRaceBoard on the play page and emits complete', () => {
    const playPage = readSource('app/pages/play/[game].vue')
    const puzzleBoard = readSource('app/features/games/puzzleRace/PuzzleRaceBoard.vue')
    const games = readSource('app/constants/games.ts')
    const lobbyPage = readSource('app/pages/lobby/[game].vue')

    expect(games).toContain("id: 'puzzleRace'")
    expect(games).toContain("value === 'puzzleRace'")
    expect(playPage).toContain('PuzzleRaceBoard')
    expect(playPage).toContain("routeGame === 'puzzleRace'")
    expect(playPage).toContain('@complete="completeGame"')
    expect(puzzleBoard).toContain('complete')
    expect(lobbyPage).toContain('isPuzzleRaceRosterValid')
  })

  it('wires DragonBossBoard on the play page and emits complete', () => {
    const playPage = readSource('app/pages/play/[game].vue')
    const dragonBoard = readSource('app/features/games/dragonBoss/DragonBossBoard.vue')
    const games = readSource('app/constants/games.ts')
    const lobbyPage = readSource('app/pages/lobby/[game].vue')

    expect(games).toContain("id: 'dragonBoss'")
    expect(games).toContain("value === 'dragonBoss'")
    expect(playPage).toContain('DragonBossBoard')
    expect(playPage).toContain("routeGame === 'dragonBoss'")
    expect(playPage).toContain('@complete="completeGame"')
    expect(dragonBoard).toContain('complete')
    expect(lobbyPage).toContain('isDragonBossRosterValid')
  })
})
