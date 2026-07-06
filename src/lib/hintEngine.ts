import { GameState, TileEnd } from '@/types/game'
import { getValidEnds, getBoardEnds } from './gameEngine'

/**
 * Get the best move for the current player with detailed reasoning
 */
export function getBestMove(state: GameState, playerIndex: number): { tileIndex: number; end: TileEnd; reason: string } | null {
  const player = state.players[playerIndex]
  const validMoves: { tileIndex: number; end: TileEnd; score: number; reason: string }[] = []

  for (let i = 0; i < player.hand.length; i++) {
    const ends = getValidEnds(player.hand[i], state.board)
    for (const end of ends) {
      let score = 0
      const tile = player.hand[i]
      const reasons: string[] = []

      // Prefer doubles (harder to play later)
      if (tile.top === tile.bottom) {
        score += 8
        reasons.push('دبل')
      }

      // Prefer high-value tiles (get rid of heavy tiles)
      const tileValue = tile.top + tile.bottom
      score += tileValue
      if (tileValue >= 10) reasons.push('قيمة عالية')

      // Prefer moves that leave playable tiles
      const remainingHand = player.hand.filter((_, idx) => idx !== i)
      const remainingPlayable = remainingHand.filter(t => getValidEnds(t, state.board).length > 0).length
      score += remainingPlayable * 3
      if (remainingPlayable > 0) reasons.push('تترك حركات')

      // Check if this move blocks opponents (advanced)
      const { leftValue, rightValue } = getBoardEnds(state.board)
      const newEnds = end === 'left' 
        ? { left: tile.top === leftValue ? tile.bottom : tile.top, right: rightValue }
        : { left: leftValue, right: tile.top === rightValue ? tile.bottom : tile.top }

      // Prefer ends that match our remaining tiles
      const matchingEnds = remainingHand.filter(t => 
        t.top === newEnds.left || t.bottom === newEnds.left ||
        t.top === newEnds.right || t.bottom === newEnds.right
      ).length
      score += matchingEnds * 4
      if (matchingEnds > 0) reasons.push('تتحكم بالأطراف')

      validMoves.push({ tileIndex: i, end, score, reason: reasons.join(' + ') || 'حركة متاحة' })
    }
  }

  if (validMoves.length === 0) return null

  validMoves.sort((a, b) => b.score - a.score)
  const best = validMoves[0]

  let finalReason = best.reason
  if (best.score >= 20) finalReason = '⭐ حركة ممتازة! ' + finalReason
  else if (best.score >= 12) finalReason = '👍 حركة جيدة - ' + finalReason
  else if (best.score >= 6) finalReason = '👌 حركة مقبولة - ' + finalReason
  else finalReason = '💡 ' + finalReason

  return {
    tileIndex: best.tileIndex,
    end: best.end,
    reason: finalReason,
  }
}

/**
 * Get a hint message for the current situation
 */
export function getHintMessage(state: GameState, playerIndex: number): string {
  const player = state.players[playerIndex]

  // Check if any tile can be played
  const playableTiles = player.hand.filter(tile => getValidEnds(tile, state.board).length > 0)

  if (playableTiles.length === 0) {
    if (state.stock.length > 0) {
      return '📦 لا توجد قطع صالحة - اسحب من المخزن'
    } else {
      return '⏭️ لا يمكن اللعب - تخطى الدور'
    }
  }

  if (playableTiles.length === 1) {
    return '⚠️ عندك قطعة وحيدة تقدر تلعبها!'
  }

  return '🎯 اختر قطعة واضغط على السهم للعب'
}

/**
 * Check if player should draw from stock
 */
export function shouldDraw(state: GameState, playerIndex: number): boolean {
  const player = state.players[playerIndex]
  for (const tile of player.hand) {
    if (getValidEnds(tile, state.board).length > 0) {
      return false
    }
  }
  return state.stock.length > 0
}

/**
 * Analyze board state and give strategic advice
 */
export function getStrategicAdvice(state: GameState, playerIndex: number): string {
  const player = state.players[playerIndex]
  const hand = player.hand

  // Count doubles
  const doubles = hand.filter(t => t.top === t.bottom)
  if (doubles.length >= 3) {
    return '💡 عندك كثير دبل - حاول تلعبهم بدري'
  }

  // Check for high value tiles
  const highValue = hand.filter(t => t.top + t.bottom >= 10)
  if (highValue.length >= 2) {
    return '💡 حاول تتخلص من القطع الثقيلة'
  }

  // Check board ends
  const { leftValue, rightValue } = getBoardEnds(state.board)
  const matchingTiles = hand.filter(t => 
    t.top === leftValue || t.bottom === leftValue ||
    t.top === rightValue || t.bottom === rightValue
  )

  if (matchingTiles.length <= 2) {
    return '⚠️ عندك خيارات محدودة - العب بحذر'
  }

  return '🎯 وضعك منيح - استمر بالضغط'
}
