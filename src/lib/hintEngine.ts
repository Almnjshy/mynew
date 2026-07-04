import { GameState, DominoTile, TileEnd } from '@/types/game'
import { canPlayTile, getValidEnds } from './gameEngine'

export interface HintResult {
  tileIndex: number
  end: TileEnd
  confidence: number // 0-100
  reason: string
}

/**
 * Analyze the best move based on:
 * 1. Tile value (higher is better to get rid of high tiles)
 * 2. Board state (matching ends)
 * 3. Future playability (keeping options open)
 * 4. Opponent hand estimation (blocking)
 */
export const getBestMove = (state: GameState, playerIndex: number): HintResult | null => {
  const player = state.players[playerIndex]
  const validMoves: { tileIndex: number; end: TileEnd; score: number }[] = []

  for (let i = 0; i < player.hand.length; i++) {
    const tile = player.hand[i]
    const ends = getValidEnds(tile, state.board)

    for (const end of ends) {
      const score = calculateMoveScore(state, tile, end, i, playerIndex)
      validMoves.push({ tileIndex: i, end, score })
    }
  }

  if (validMoves.length === 0) return null

  // Sort by score descending
  validMoves.sort((a, b) => b.score - a.score)
  const best = validMoves[0]

  const tile = player.hand[best.tileIndex]
  const reason = generateReason(tile, best.end, best.score, state)

  return {
    tileIndex: best.tileIndex,
    end: best.end,
    confidence: Math.min(100, Math.round(best.score)),
    reason,
  }
}

const calculateMoveScore = (
  state: GameState,
  tile: DominoTile,
  end: TileEnd,
  tileIndex: number,
  playerIndex: number
): number => {
  let score = 0

  // 1. Tile value - prefer high value tiles to reduce hand score
  const tileValue = tile.top + tile.bottom
  score += tileValue * 5

  // 2. Double bonus - doubles are powerful
  if (tile.top === tile.bottom) {
    score += 20
  }

  // 3. Board matching - prefer moves that create matching ends for future plays
  const boardEnds = getBoardEnds(state.board)
  const playedEnd = end === 'left' ? tile.top : tile.bottom
  const otherEnd = end === 'left' ? tile.bottom : tile.top

  // Check if the other end of the tile matches any board end (creates more options)
  const matchingEnds = boardEnds.filter(e => e === otherEnd).length
  score += matchingEnds * 15

  // 4. Count how many tiles in hand can play after this move
  const futurePlayability = countFuturePlayability(state, playerIndex, tileIndex, end)
  score += futurePlayability * 10

  // 5. Blocking - if opponent likely has matching tiles, try to block
  const opponent = state.players.find((_, i) => i !== playerIndex && i !== 0)
  if (opponent) {
    const blockingValue = calculateBlockingValue(state, tile, end)
    score += blockingValue * 8
  }

  // 6. End game consideration - if close to winning, be more aggressive
  const player = state.players[playerIndex]
  if (player.hand.length <= 3) {
    score += 15 // Aggressive play when close to winning
  }

  return score
}

const getBoardEnds = (board: DominoTile[]): number[] => {
  if (board.length === 0) return [0, 1, 2, 3, 4, 5, 6] // All possible first moves
  return [board[0].top, board[board.length - 1].bottom]
}

const countFuturePlayability = (
  state: GameState,
  playerIndex: number,
  excludeTileIndex: number,
  playedEnd: TileEnd
): number => {
  const player = state.players[playerIndex]
  const remainingHand = player.hand.filter((_, i) => i !== excludeTileIndex)

  // Simulate the board after this move
  const simulatedBoard = [...state.board]
  const tile = player.hand[excludeTileIndex]

  if (simulatedBoard.length === 0) {
    simulatedBoard.push(tile)
  } else if (playedEnd === 'left') {
    simulatedBoard.unshift(tile)
  } else {
    simulatedBoard.push(tile)
  }

  let count = 0
  for (const handTile of remainingHand) {
    const ends = getValidEnds(handTile, simulatedBoard)
    if (ends.length > 0) count++
  }

  return count
}

const calculateBlockingValue = (
  state: GameState,
  tile: DominoTile,
  end: TileEnd
): number => {
  // Simple heuristic: if we play a tile that creates a rare end number,
  // it might be harder for opponent to match
  const board = state.board
  if (board.length === 0) return 0

  const playedValue = end === 'left' ? tile.top : tile.bottom
  const exposedValue = end === 'left' ? tile.bottom : tile.top

  // Count how many tiles have the exposed value
  let count = 0
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      if (i === exposedValue || j === exposedValue) count++
    }
  }

  // Lower count = better blocking (harder to match)
  return Math.max(0, 7 - count)
}

const generateReason = (
  tile: DominoTile,
  end: TileEnd,
  score: number,
  state: GameState
): string => {
  const reasons: string[] = []

  if (tile.top === tile.bottom) {
    reasons.push('قطعة مزدوجة قوية')
  }

  if (tile.top + tile.bottom >= 10) {
    reasons.push('تخلص من نقاط عالية')
  }

  if (state.board.length > 0) {
    const boardEnd = end === 'left' ? state.board[0].top : state.board[state.board.length - 1].bottom
    if (tile.top === boardEnd && tile.bottom === boardEnd) {
      reasons.push('تطابق مثالي')
    }
  }

  if (score > 80) {
    reasons.push('حركة ممتازة')
  } else if (score > 50) {
    reasons.push('حركة جيدة')
  }

  return reasons.join(' • ') || 'حركة متاحة'
}

/**
 * Check if player should draw (no valid moves)
 */
export const shouldDraw = (state: GameState, playerIndex: number): boolean => {
  const player = state.players[playerIndex]

  for (const tile of player.hand) {
    const ends = getValidEnds(tile, state.board)
    if (ends.length > 0) return false
  }

  return state.stock.length > 0
}

/**
 * Get hint message for current state
 */
export const getHintMessage = (state: GameState, playerIndex: number): string => {
  const bestMove = getBestMove(state, playerIndex)

  if (!bestMove) {
    if (shouldDraw(state, playerIndex)) {
      return 'لا يوجد حركة متاحة. اسحب من المخزون.'
    }
    return 'لا يوجد حركة متاحة.'
  }

  const player = state.players[playerIndex]
  const tile = player.hand[bestMove.tileIndex]

  return `${bestMove.reason} (${tile.top}|${tile.bottom})`
}
