import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS - Board Layout
// ============================================================
const TILE_W = 36      // Width of narrow side (double tile width)
const TILE_H = 72      // Length of tile (normal tile length)
const GAP = 2          // Small gap between tiles
const BOARD_MARGIN = 40 // Margin from screen edges
const AVAILABLE_W = 140 // Half of available width (conservative for mobile)

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
// BOARD ENDS
// ============================================================
export const getBoardEnds = (board: BoardTile[]): { leftValue: number; rightValue: number } => {
  if (board.length === 0) return { leftValue: -1, rightValue: -1 }

  const leftTile = board[0]
  const rightTile = board[board.length - 1]

  // Stored values after calculateTileValues:
  // LEFT end tile: top = OPEN (outward), bottom = CONNECTED (to chain)
  // RIGHT end tile: top = CONNECTED (to chain), bottom = OPEN (outward)

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
// TILE DIMENSIONS BASED ON ROTATION
// ============================================================
function getTileDimensions(rotation: number, isDouble: boolean): { width: number; height: number } {
  if (isDouble) {
    // Doubles are always vertical
    return { width: TILE_W, height: TILE_H }
  }
  // Normal tiles
  if (rotation === 0 || rotation === 180) {
    // Vertical
    return { width: TILE_W, height: TILE_H }
  }
  // Horizontal (90 or 270)
  return { width: TILE_H, height: TILE_W }
}

// ============================================================
// SNAKE LAYOUT ENGINE
// ============================================================

// Get the right edge of a tile (x + half width)
function getRightEdge(tile: BoardTile): number {
  const dims = getTileDimensions(tile.rotation, tile.top === tile.bottom)
  return tile.x + dims.width / 2
}

// Get the left edge of a tile (x - half width)
function getLeftEdge(tile: BoardTile): number {
  const dims = getTileDimensions(tile.rotation, tile.top === tile.bottom)
  return tile.x - dims.width / 2
}

// Helper function to get all tiles in the same row as a given tile
function getTilesInSameRow(board: BoardTile[], targetTile: BoardTile): BoardTile[] {
  return board.filter(t => Math.abs(t.y - targetTile.y) < 1)
}

// Calculate next position with snake layout
function calculateNextPosition(
  board: BoardTile[],
  end: TileEnd,
  isDouble: boolean
): { x: number; y: number; rotation: 0 | 90 | 180 | 270 } {

  if (board.length === 0) {
    // First tile: center, vertical
    return { x: 0, y: 0, rotation: 0 }
  }

  const newTileWidth = isDouble ? TILE_W : TILE_H  // Width when placed
  const newTileHeight = isDouble ? TILE_H : TILE_W // Height when placed

  if (end === 'right') {
    const lastTile = board[board.length - 1]
    const lastDims = getTileDimensions(lastTile.rotation, lastTile.top === lastTile.bottom)

    // Calculate new position: place next to last tile's right edge
    const newX = lastTile.x + lastDims.width / 2 + GAP + newTileWidth / 2

    // Check if we need to turn (snake)
    if (newX + newTileWidth / 2 > AVAILABLE_W) {
      // Turn down - start new row
      // Find the first tile in the current row
      const currentRowTiles = getTilesInSameRow(board, lastTile)
      const firstTileInRow = currentRowTiles[0]

      return {
        // Start from same X as the first tile in the current row
        x: firstTileInRow.x,
        // Move down by the height of the current row plus extra gap
        y: lastTile.y + Math.max(lastDims.height, TILE_H) + GAP * 4,
        // Horizontal tile pointing right (for even rows going left to right)
        rotation: isDouble ? 0 : 90
      }
    }

    // Continue right - horizontal
    return {
      x: newX,
      y: lastTile.y,
      rotation: isDouble ? 0 : 90
    }
  } else {
    // end === 'left'
    const firstTile = board[0]
    const firstDims = getTileDimensions(firstTile.rotation, firstTile.top === firstTile.bottom)

    // Calculate new position: place next to first tile's left edge
    const newX = firstTile.x - firstDims.width / 2 - GAP - newTileWidth / 2

    // Check if we need to turn (snake)
    if (newX - newTileWidth / 2 < -AVAILABLE_W) {
      // Turn down - start new row
      // Find the last tile in the current row
      const currentRowTiles = getTilesInSameRow(board, firstTile)
      const lastTileInRow = currentRowTiles[currentRowTiles.length - 1]

      return {
        // Start from same X as the last tile in the current row
        x: lastTileInRow.x,
        // Move down by the height of the current row plus extra gap
        y: firstTile.y + Math.max(firstDims.height, TILE_H) + GAP * 4,
        // Horizontal tile pointing left (for odd rows going right to left)
        rotation: isDouble ? 0 : 270
      }
    }

    // Continue left - horizontal
    return {
      x: newX,
      y: firstTile.y,
      rotation: isDouble ? 0 : 270
    }
  }
}

// ============================================================
// CALCULATE TILE VALUES
// ============================================================
function calculateTileValues(
  tile: DominoTile,
  connectValue: number,
  isLeft: boolean
): { top: number; bottom: number; flipped: boolean } {

  if (isLeft) {
    // Placing on LEFT end
    // Matching number → BOTTOM (connected to chain on right)
    // Open number → TOP (facing left, outward)
    if (tile.bottom === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  } else {
    // Placing on RIGHT end
    // Matching number → TOP (connected to chain on left)
    // Open number → BOTTOM (facing right, outward)
    if (tile.top === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  }
}

// ============================================================
// PLAY TILE - Fixed with proper snake layout
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  const isDouble = tile.top === tile.bottom

  // Calculate position using Snake Layout
  const position = calculateNextPosition(state.board, end, isDouble)

  // Calculate values
  let tileTop: number, tileBottom: number

  if (state.board.length === 0) {
    tileTop = tile.top
    tileBottom = tile.bottom
  } else if (end === 'left') {
    const connectValue = state.board[0].top
    const values = calculateTileValues(tile, connectValue, true)
    tileTop = values.top
    tileBottom = values.bottom
  } else {
    const connectValue = state.board[state.board.length - 1].bottom
    const values = calculateTileValues(tile, connectValue, false)
    tileTop = values.top
    tileBottom = values.bottom
  }

  const playedTile: BoardTile = {
    ...tile,
    x: position.x,
    y: position.y,
    rotation: position.rotation,
    isLeft: end === 'left',
    top: tileTop,
    bottom: tileBottom,
  }

  const newBoard = end === 'left'
    ? [playedTile, ...state.board]
    : [...state.board, playedTile]

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
// AI
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

      if (tile.top === tile.bottom) score += 5
      score += tile.top + tile.bottom

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

  validMoves.sort((a, b) => b.score - a.score)

  if (difficulty === 'hard') {
    return { tileIndex: validMoves[0].tileIndex, end: validMoves[0].end }
  }

  const topMoves = validMoves.slice(0, Math.min(3, validMoves.length))
  return topMoves[Math.floor(Math.random() * topMoves.length)]
}

// ============================================================
// GAME BLOCKED
// ============================================================
export const isGameBlocked = (state: GameState): boolean => {
  if (state.stock.length > 0) return false
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