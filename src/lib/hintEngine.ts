import { GameState, DominoTile, TileEnd, BoardTile } from '@/types/game'
import { getValidEnds, canPlayTile, getBoardEnds } from './gameEngine'

export function getBestMove(state: GameState, playerIndex: number): { tileIndex: number; end: TileEnd; reason: string } | null {
  const player = state.players[playerIndex]
  const validMoves: { tileIndex: number; end: TileEnd; score: number }[] = []

  for (let i = 0; i < player.hand.length; i++) {
    const ends = getValidEnds(player.hand[i], state.board)
    for (const end of ends) {
      let score = 0
      const tile = player.hand[i]

      // Prefer doubles
      if (tile.top === tile.bottom) score += 5

      // Prefer high-value tiles
      score += tile.top + tile.bottom

      // Prefer moves that leave playable tiles
      const remainingHand = player.hand.filter((_, idx) => idx !== i)
      const remainingPlayable = remainingHand.filter(t => getValidEnds(t, state.board).length > 0).length
      score += remainingPlayable * 2

      validMoves.push({ tileIndex: i, end, score })
    }
  }

  if (validMoves.length === 0) return null

  validMoves.sort((a, b) => b.score - a.score)
  const best = validMoves[0]

  return {
    tileIndex: best.tileIndex,
    end: best.end,
    reason: best.score >= 10 ? 'حركة ممتازة!' : best.score >= 5 ? 'حركة جيدة' : 'حركة مقبولة',
  }
}

export function getHintMessage(state: GameState, playerIndex: number): string {
  const player = state.players[playerIndex]

  // Check if any tile can be played
  const playableTiles = player.hand.filter(tile => getValidEnds(tile, state.board).length > 0)

  if (playableTiles.length === 0) {
    if (state.stock.length > 0) {
      return 'لا توجد قطع صالحة - اسحب من المخزن'
    } else {
      return 'لا يمكن اللعب - تخطى الدور'
    }
  }

  return 'اختر قطعة واضغط على السهم للعب'
}

export function shouldDraw(state: GameState, playerIndex: number): boolean {
  const player = state.players[playerIndex]
  for (const tile of player.hand) {
    if (getValidEnds(tile, state.board).length > 0) {
      return false
    }
  }
  return state.stock.length > 0
}