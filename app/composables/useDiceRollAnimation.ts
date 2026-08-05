export const DICE_ROLL_DURATION_MS = 700

export function useDiceRollAnimation() {
  const isRolling = ref(false)
  const rollingIndices = ref<Set<number>>(new Set())
  const { play } = useSound()

  function isDieRolling(dieIndex: number, held = false): boolean {
    if (!isRolling.value || held) return false
    if (rollingIndices.value.size === 0) return true
    return rollingIndices.value.has(dieIndex)
  }

  async function rollWithAnimation(options: {
    onRoll: () => void
    indices?: number[]
  }): Promise<void> {
    if (isRolling.value) return

    isRolling.value = true
    rollingIndices.value = new Set(options.indices)
    play('dice')

    await new Promise<void>((resolve) => {
      setTimeout(resolve, DICE_ROLL_DURATION_MS)
    })

    options.onRoll()
    isRolling.value = false
    rollingIndices.value = new Set()
  }

  return {
    isRolling,
    rollWithAnimation,
    isDieRolling,
  }
}
