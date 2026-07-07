import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS - Board Layout
// ============================================================
const TILE_W = 36      // Width of narrow side (double tile width)
const TILE_H = 72      // Length of tile (normal tile length)
const GAP = 2          // Small gap between tiles
const BOARD_MARGIN = 60 // Margin from screen edges
const SCREEN_W = 360   // Mobile screen width (approximate)
const SCREEN_H = 600   // Mobile screen height (approximate)

// ============================================================
// DECK CREATION
// ============================================================
export const createDominoSet = (): DominoTile[] => {
  const tiles: DominoTile[] = []
  let id = 0
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ top: i, bottom: j, id: `tile-${id++}` })
    }
  }
  return shuffle(tiles)
}

export const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ============================================================
// PLAYER CREATION
// ============================================================
export const createPlayers = (names: string[], avatars: string[]): Player[] => {
  return names.map((name, i) => ({
    id: `player-${i}`,
    name,
    avatar: avatars[i] || '/assets/avatar_ai.png',
    hand: [],
    score: 0,
    isAI: i !== 0,
  }))
}

// ============================================================
// HAND SORTING
// ============================================================
export function sortPlayerHand(hand: DominoTile[]): DominoTile[] {
  const normalized = hand.map(tile => {
    if (tile.top > tile.bottom) {
      return { ...tile, top: tile.bottom, bottom: tile.top }
    }
    return tile
  })
  return normalized.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top
    return a.bottom - b.bottom
  })
}

// ============================================================
// TILE DEALING
// ============================================================
export const dealTiles = (players: Player[], stock: DominoTile[]): { players: Player[]; stock: DominoTile[] } => {
  const newPlayers = players.map(p => ({ ...p, hand: [] as DominoTile[] }))
  const newStock = [...stock]
  const tilesPerPlayer = players.length <= 2 ? 7 : players.length <= 4 ? 6 : 5

  for (let i = 0; i < tilesPerPlayer; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      if (newStock.length > 0) {
        newPlayers[j].hand.push(newStock.pop()!)
      }
    }
  }

  for (const player of newPlayers) {
    player.hand = sortPlayerHand(player.hand)
  }

  return { players: newPlayers, stock: newStock }
}

// ============================================================
// BOARD ENDS - Get the two open ends of the chain
// ============================================================
export const getBoardEnds = (board: BoardTile[]): { leftValue: number; rightValue: number } => {
  if (board.length === 0) return { leftValue: -1, rightValue: -1 }

  // The chain is: [leftmost] ... [rightmost]
  // leftValue = the OPEN value on the leftmost tile (the side NOT connected to next tile)
  // rightValue = the OPEN value on the rightmost tile (the side NOT connected to prev tile)

  const leftTile = board[0]
  const rightTile = board[board.length - 1]

  // For the leftmost tile:
  // - If connected on its RIGHT side, the OPEN side is LEFT
  // - The LEFT side value depends on rotation
  // 
  // A vertical tile (rotation 0): top is up, bottom is down
  // When placed horizontally (rotation 90): top becomes left, bottom becomes right

  // For a BoardTile, we store the DISPLAY values after flip/rotation
  // The "connected" side is the one facing the chain
  // The "open" side is the one facing outward

  // leftTile.isLeft means this tile was placed on the LEFT end
  // So its connected side is its RIGHT side
  // Its open side is its LEFT side

  // For a tile placed on the LEFT end:
  // The matching number should be at the RIGHT (connected to chain)
  // The open number is at the LEFT

  // After calculateTileValues:
  // For LEFT placement: matching number at bottom (visually right when rotated 90°)
  //                    open number at top (visually left when rotated 90°)
  // So: leftValue = tile.top (the open side)

  // For RIGHT placement: matching number at top (visually left when rotated 90°)
  //                      open number at bottom (visually right when rotated 90°)
  // So: rightValue = tile.bottom (the open side)

  return {
    leftValue: leftTile.top,
    rightValue: rightTile.bottom,
  }
}

// ============================================================
// CAN PLAY
// ============================================================
export const canPlayTile = (tile: DominoTile, board: BoardTile[], end: TileEnd): boolean => {
  if (board.length === 0) return true
  const { leftValue, rightValue } = getBoardEnds(board)
  const targetValue = end === 'left' ? leftValue : rightValue
  return tile.top === targetValue || tile.bottom === targetValue
}

export const getValidEnds = (tile: DominoTile, board: BoardTile[]): TileEnd[] => {
  if (board.length === 0) return ['left']
  const ends: TileEnd[] = []
  if (canPlayTile(tile, board, 'left')) ends.push('left')
  if (canPlayTile(tile, board, 'right')) ends.push('right')
  return ends
}

// ============================================================
// SNAKE LAYOUT ENGINE - Calculate positions for chain layout
// ============================================================

interface LayoutState {
  x: number
  y: number
  direction: 'right' | 'left' | 'down'
  row: number
}

function getInitialLayoutState(): LayoutState {
  return { x: 0, y: 0, direction: 'right', row: 0 }
}

function getTileLength(isDouble: boolean): number {
  return isDouble ? TILE_W : TILE_H
}

function shouldTurn(state: LayoutState, nextTileLength: number): boolean {
  const margin = BOARD_MARGIN
  if (state.direction === 'right') {
    return state.x + nextTileLength + TILE_H + GAP > SCREEN_W / 2 - margin
  }
  if (state.direction === 'left') {
    return state.x - nextTileLength - TILE_H - GAP < -(SCREEN_W / 2) + margin
  }
  return false
}

function turnDirection(state: LayoutState): LayoutState {
  const newRow = state.row + 1
  if (state.direction === 'right') {
    return { x: state.x, y: state.y + TILE_W + GAP, direction: 'down', row: newRow }
  } else if (state.direction === 'down') {
    if (state.row % 2 === 1) {
      return { x: state.x, y: state.y, direction: 'right', row: newRow }
    } else {
      return { x: state.x, y: state.y, direction: 'left', row: newRow }
    }
  } else if (state.direction === 'left') {
    return { x: state.x, y: state.y + TILE_W + GAP, direction: 'down', row: newRow }
  }
  return state
}

function calculateRotation(direction: 'right' | 'left' | 'down', isDouble: boolean): 0 | 90 | 180 | 270 {
  if (isDouble) {
    // Double tiles are always vertical (rotation 0)
    // They act as connection points
    return 0
  }

  // Normal tiles: the divider line should be perpendicular to direction of play
  // When playing right/left: tile is horizontal (rotation 90)
  // When playing down: tile is vertical (rotation 0)
  switch (direction) {
    case 'right': return 90
    case 'left': return 270
    case 'down': return 0
  }
}

// ============================================================
// CALCULATE TILE VALUES - Proper matching logic
// ============================================================
/**
 * When placing a tile on the board:
 * 
 * For LEFT end placement:
 * - The matching number goes to the BOTTOM (visually right side when rotated 90°)
 * - The open number goes to the TOP (visually left side when rotated 90°)
 * - Example: board ends with [6|4] on left, play [1|6] → becomes [6|1] on board
 *   So: top=6 (open), bottom=1 (connected to chain... wait that's wrong)
 *   
 *   Actually: The chain goes: [new] - [existing]
 *   The new tile's matching number should face the existing chain
 *   If existing left end is 6, and we play [1|6]:
 *   - The 6 should connect to the existing 6
 *   - So 6 goes to the side facing the chain (bottom when placed on left)
 *   - 1 goes to the open side (top)
 *   - Result: top=1, bottom=6
 *   
 *   But wait, when rotated 90° (horizontal):
 *   - top becomes left
 *   - bottom becomes right
 *   - So visually: [1|6] with 1 on left (open), 6 on right (connected)
 *   
 *   The leftValue of the board would be 1 (the open side)
 */
function calculateTileValues(
  tile: DominoTile,
  connectValue: number,
  isLeft: boolean
): { top: number; bottom: number; flipped: boolean } {

  if (isLeft) {
    // Placing on LEFT end
    // Matching number goes to BOTTOM (connected side, faces the chain)
    // Open number goes to TOP
    if (tile.bottom === connectValue) {
      // tile.bottom matches → keep as is: top=top (open), bottom=bottom (connected)
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    // tile.top matches → flip: top=bottom (open), bottom=top (connected)
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  } else {
    // Placing on RIGHT end
    // Matching number goes to TOP (connected side, faces the chain)
    // Open number goes to BOTTOM
    if (tile.top === connectValue) {
      // tile.top matches → keep as is: top=top (connected), bottom=bottom (open)
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    // tile.bottom matches → flip: top=bottom (connected), bottom=top (open)
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  }
}

// ============================================================
// PLAY TILE - Complete rewrite with proper board logic
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  const isDouble = tile.top === tile.bottom

  let x: number, y: number, rotation: 0 | 90 | 180 | 270
  let tileTop: number, tileBottom: number

  if (state.board.length === 0) {
    // First tile - center, vertical
    x = 0
    y = 0
    rotation = 0
    tileTop = tile.top
    tileBottom = tile.bottom
  } else if (end === 'left') {
    // Extend left
    const firstTile = state.board[0]
    const connectValue = firstTile.top  // The open value on the left end

    const values = calculateTileValues(tile, connectValue, true)
    tileTop = values.top
    tileBottom = values.bottom

    // Calculate position
    const tileLength = getTileLength(isDouble)
    x = firstTile.x - tileLength - GAP
    y = firstTile.y

    // Determine rotation based on position relative to previous tile
    // If previous tile is at same y, we're going horizontal
    // If y differs, we might be on a turn
    if (firstTile.y === 0 && state.board.length > 1) {
      // Check direction from second tile
      const secondTile = state.board[1]
      if (secondTile.x > firstTile.x) {
        rotation = calculateRotation('left', isDouble)
      } else {
        rotation = calculateRotation('right', isDouble)
      }
    } else {
      rotation = calculateRotation('left', isDouble)
    }
  } else {
    // Extend right
    const lastTile = state.board[state.board.length - 1]
    const connectValue = lastTile.bottom  // The open value on the right end

    const values = calculateTileValues(tile, connectValue, false)
    tileTop = values.top
    tileBottom = values.bottom

    const tileLength = getTileLength(isDouble)
    x = lastTile.x + tileLength + GAP
    y = lastTile.y

    // Similar logic for right end
    if (lastTile.y === 0 && state.board.length > 1) {
      const prevTile = state.board[state.board.length - 2]
      if (prevTile.x < lastTile.x) {
        rotation = calculateRotation('right', isDouble)
      } else {
        rotation = calculateRotation('left', isDouble)
      }
    } else {
      rotation = calculateRotation('right', isDouble)
    }
  }

  const playedTile: BoardTile = {
    ...tile,
    x,
    y,
    rotation,
    isLeft: end === 'left',
    top: tileTop,
    bottom: tileBottom,
  }

  // Add to board: unshift for left, push for right
  const newBoard = end === 'left'
    ? [playedTile, ...state.board]
    : [...state.board, playedTile]

  // Remove tile from hand
  const newHand = [...player.hand]
  newHand.splice(tileIndex, 1)

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = { ...player, hand: newHand }

  // All Fives scoring
  const allFivesScore = calculateAllFivesScore(newBoard)
  if (allFivesScore > 0) {
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      score: newPlayers[playerIndex].score + allFivesScore
    }
  }

  // Check win
  if (newHand.length === 0) {
    return {
      valid: true,
      newState: {
        ...state,
        board: newBoard,
        players: newPlayers,
        isGameOver: true,
        winner: newPlayers[playerIndex],
        isBlocked: false,
      }
    }
  }

  return {
    valid: true,
    newState: {
      ...state,
      board: newBoard,
      players: newPlayers,
      currentPlayerIndex: (playerIndex + 1) % state.players.length,
      lastMove: { playerId: player.id, tile: playedTile, end },
    }
  }
}

// ============================================================
// DRAW FROM STOCK
// ============================================================
export const drawFromStock = (state: GameState, playerIndex: number): GameState => {
  if (state.stock.length === 0) return state
  const newStock = [...state.stock]
  const tile = newStock.pop()!
  const newPlayers = [...state.players]

  const newHand = [...newPlayers[playerIndex].hand, tile]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: sortPlayerHand(newHand)
  }

  return { ...state, stock: newStock, players: newPlayers }
}

// ============================================================
// SCORING
// ============================================================
export const calculateScore = (hand: DominoTile[]): number => {
  return hand.reduce((sum, tile) => sum + tile.top + tile.bottom, 0)
}

export const calculateAllFivesScore = (board: BoardTile[]): number => {
  if (board.length === 0) return 0
  const { leftValue, rightValue } = getBoardEnds(board)
  const total = leftValue + rightValue
  return total % 5 === 0 ? total : 0
}

// ============================================================
// INITIALIZE GAME
// ============================================================
export const createInitialState = (playerNames: string[], playerAvatars: string[]): GameState => {
  const stock = createDominoSet()
  const players = createPlayers(playerNames, playerAvatars)
  const { players: dealtPlayers, stock: remainingStock } = dealTiles(players, stock)

  // Find starter: player with highest double
  let starter = 0
  let highestDouble = -1
  for (let i = 0; i < dealtPlayers.length; i++) {
    for (const tile of dealtPlayers[i].hand) {
      if (tile.top === tile.bottom && tile.top > highestDouble) {
        highestDouble = tile.top
        starter = i
      }
    }
  }

  return {
    board: [],
    players: dealtPlayers,
    currentPlayerIndex: starter,
    stock: remainingStock,
    round: 1,
    isGameOver: false,
    winner: null,
    lastMove: null,
    isBlocked: false,
    snakeDirection: 'right',
    snakeRow: 0,
    snakeCol: 0,
    maxRow: 0,
    minRow: 0,
    maxCol: 0,
    minCol: 0,
  }
}

// ============================================================
// AI - IMPROVED with better strategy
// ============================================================
export const getAIMove = (state: GameState, playerIndex: number, difficulty: string): { tileIndex: number; end: TileEnd } | null => {
  const ai = state.players[playerIndex]
  if (!ai || !ai.isAI) return null

  const validMoves: { tileIndex: number; end: TileEnd; score: number }[] = []
  for (let i = 0; i < ai.hand.length; i++) {
    const ends = getValidEnds(ai.hand[i], state.board)
    for (const end of ends) {
      let score = 0
      const tile = ai.hand[i]

      // Prefer doubles (harder to play later)
      if (tile.top === tile.bottom) score += 5

      // Prefer high value tiles
      score += tile.top + tile.bottom

      // In All Fives, prefer moves that give points
      if (state.board.length > 0) {
        const { leftValue, rightValue } = getBoardEnds(state.board)
        const target = end === 'left' ? leftValue : rightValue
        const otherEnd = end === 'left' ? rightValue : leftValue
        const newTotal = (tile.top === target ? tile.bottom : tile.top) + otherEnd
        if (newTotal % 5 === 0) score += 15
      }

      validMoves.push({ tileIndex: i, end, score })
    }
  }

  if (validMoves.length === 0) return null
  if (difficulty === 'easy') {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }

  // Sort by score (highest first)
  validMoves.sort((a, b) => b.score - a.score)

  if (difficulty === 'hard') {
    return { tileIndex: validMoves[0].tileIndex, end: validMoves[0].end }
  }

  // Medium: pick from top 3
  const topMoves = validMoves.slice(0, Math.min(3, validMoves.length))
  const selected = topMoves[Math.floor(Math.random() * topMoves.length)]
  return { tileIndex: selected.tileIndex, end: selected.end }
}

// ============================================================
// GAME BLOCKED - Proper blocked game detection
// ============================================================
export const isGameBlocked = (state: GameState): boolean => {
  // If stock is not empty, game is not blocked (players can draw)
  if (state.stock.length > 0) return false

  // Check if ANY player can play
  for (let i = 0; i < state.players.length; i++) {
    for (const tile of state.players[i].hand) {
      if (getValidEnds(tile, state.board).length > 0) return false
    }
  }
  return true
}

export const getBlockedWinner = (state: GameState): Player | null => {
  let winner = state.players[0]
  let minScore = calculateScore(winner.hand)
  let tie = false

  for (let i = 1; i < state.players.length; i++) {
    const score = calculateScore(state.players[i].hand)
    if (score < minScore) {
      minScore = score
      winner = state.players[i]
      tie = false
    } else if (score === minScore) {
      tie = true
    }
  }

  // Return null if tie (draw)
  return tie ? null : winner
}

export const canPlayerPlay = (state: GameState, playerIndex: number): boolean => {
  for (const tile of state.players[playerIndex].hand) {
    if (getValidEnds(tile, state.board).length > 0) return true
  }
  return false
}

export const skipTurn = (state: GameState): GameState => {
  return { ...state, currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length }
}
