import { computed, type Ref } from 'vue'
import type { SessionPlayer } from '~/types/game'

export function useHotSeat(players: Ref<readonly SessionPlayer[]>, currentPlayerIndex: Ref<number>) {
  const activePlayer = computed(() => players.value[currentPlayerIndex.value] ?? null)

  function advanceTurn() {
    if (players.value.length === 0) return
    currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length
  }

  return {
    activePlayer,
    advanceTurn,
  }
}
