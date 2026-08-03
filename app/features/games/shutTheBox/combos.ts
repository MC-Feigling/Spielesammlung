const TILE_COUNT = 9

function assertOpenMask(open: boolean[]): void {
  if (open.length !== TILE_COUNT) {
    throw new Error('Shut the Box braucht neun Zahlen')
  }
}

export function openNumbers(open: boolean[]): number[] {
  assertOpenMask(open)
  return open.flatMap((isOpen, index) => (isOpen ? [index + 1] : []))
}

export function remainingSum(open: boolean[]): number {
  return openNumbers(open).reduce((sum, number) => sum + number, 0)
}

export function legalCloses(open: boolean[], target: number): number[][] {
  assertOpenMask(open)

  if (!Number.isInteger(target) || target < 1) {
    return []
  }

  const numbers = openNumbers(open)
  const results: number[][] = []

  function search(startIndex: number, remaining: number, path: number[]): void {
    if (remaining === 0) {
      if (path.length > 0) {
        results.push([...path])
      }
      return
    }

    for (let index = startIndex; index < numbers.length; index += 1) {
      const value = numbers[index]!
      if (value > remaining) {
        break
      }
      path.push(value)
      search(index + 1, remaining - value, path)
      path.pop()
    }
  }

  search(0, target, [])
  return results
}
