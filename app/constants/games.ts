import type { GameId } from '~/types/game'

export const GAMES: Array<{ id: GameId; title: string; blurb: string; minPlayers: number; maxPlayers: number }> = [
  { id: 'memory', title: 'Memory', blurb: 'Finde die Paare!', minPlayers: 2, maxPlayers: 4 },
  { id: 'kniffel', title: 'Kniffel', blurb: 'Würfle die besten Augen!', minPlayers: 2, maxPlayers: 4 },
  { id: 'ludo', title: 'Mensch ärgere dich nicht', blurb: 'Rauswerfen und ins Ziel!', minPlayers: 2, maxPlayers: 4 },
  { id: 'racing', title: 'Spurrennen', blurb: 'Ausweichen und zuerst ins Ziel!', minPlayers: 2, maxPlayers: 4 },
  { id: 'uno', title: 'UNO', blurb: 'Allein gegen bis zu 3 Roboter!', minPlayers: 2, maxPlayers: 4 },
  { id: 'connectFour', title: 'Vier gewinnt', blurb: '4 in einer Reihe!', minPlayers: 2, maxPlayers: 2 },
  { id: 'shutTheBox', title: 'Shut the Box', blurb: 'Zahlen zuklappen!', minPlayers: 2, maxPlayers: 4 },
  { id: 'muehle', title: 'Mühle', blurb: 'Drei in einer Reihe und Steine schlagen!', minPlayers: 2, maxPlayers: 2 },
  { id: 'horseRacing', title: 'Pferderennen', blurb: 'Halten, springen, zuerst ins Ziel!', minPlayers: 2, maxPlayers: 4 },
  { id: 'puzzleRace', title: 'Puzzle-Rennen', blurb: 'Wer legt das Bild zuerst?', minPlayers: 2, maxPlayers: 4 },
  { id: 'dragonBoss', title: 'Drachenkampf', blurb: 'Treffe den Drachen, weiche aus, gewinne mit den meisten Treffern!', minPlayers: 2, maxPlayers: 2 },
  { id: 'handyman', title: 'Handwerker', blurb: 'Aufträge erledigen — Werkzeug und Teil wählen!', minPlayers: 2, maxPlayers: 4 },
]

export function isGameId(value: string): value is GameId {
  return value === 'memory' || value === 'kniffel' || value === 'ludo' || value === 'racing' || value === 'uno' || value === 'connectFour' || value === 'shutTheBox' || value === 'muehle' || value === 'horseRacing' || value === 'puzzleRace' || value === 'dragonBoss' || value === 'handyman'
}

export function formatPlayerRange(minPlayers: number, maxPlayers: number): string {
  if (minPlayers === maxPlayers) {
    return `${minPlayers} Spieler`
  }

  return `${minPlayers}–${maxPlayers} Spieler`
}
