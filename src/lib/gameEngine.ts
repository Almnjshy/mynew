import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS
// ============================================================
const TILE_W = 40   // Width of narrow side (half tile)
const TILE_H = 80   // Height/length of tile
const CHAIN_GAP = 0 // No gap - tiles touch each other

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

  // Left end: exposed value of first tile
  const leftTile = board[0]
  const leftValue = leftTile.isLeft ? leftTile.top : leftTile.bottom

  // Right end: exposed value of last tile
  const rightTile = board[board.length - 1]
  const rightValue = rightTile.isLeft ? leftTile.bottom : leftTile.top

  return { leftValue, rightValue }
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
// CHAIN LAYOUT - PROPER DOMINO ALGORITHM
// ============================================================

// Track chain state for proper snake layout
interface ChainState {
  x: number
  y: number
  direction: 'right' | 'left' | 'up' | 'down'
  row: number  // Which row in snake (0, 1, 2...)
}

function getInitialChainState(): ChainState {
  return { x: 0, y: 0, direction: 'right', row: 0 }
}

function getNextPosition(state: ChainState, isDouble: boolean): { x: number; y: number; newState: ChainState } {
  const tileLength = isDouble ? TILE_W : TILE_H

  let newX = state.x
  let newY = state.y
  let newDirection = state.direction
  let newRow = state.row

  // Move in current direction
  switch (state.direction) {
    case 'right':
      newX += tileLength + CHAIN_GAP
      break
    case 'left':
      newX -= tileLength + CHAIN_GAP
      break
    case 'down':
      newY += TILE_H + CHAIN_GAP
      break
    case 'up':
      newY -= TILE_H + CHAIN_GAP
      break
  }

  return {
    x: newX,
    y: newY,
    newState: { x: newX, y: newY, direction: newDirection, row: newRow }
  }
}

function shouldTurn(state: ChainState, screenWidth: number = 800): boolean {
  // Turn when we reach screen edge
  const margin = TILE_H * 3
  if (state.direction === 'right' && state.x + TILE_H > screenWidth - margin) return true
  if (state.direction === 'left' && state.x - TILE_H < margin) return true
  return false
}

function turnDirection(state: ChainState): ChainState {
  // Snake pattern: right -> down -> left -> down -> right...
  const newRow = state.row + 1

  if (state.direction === 'right') {
    return { x: state.x, y: state.y + TILE_H, direction: 'down', row: newRow }
  } else if (state.direction === 'down') {
    if (state.row % 2 === 1) {
      // After odd row, go right
      return { x: state.x, y: state.y, direction: 'right', row: newRow }
    } else {
      // After even row, go left
      return { x: state.x, y: state.y, direction: 'left', row: newRow }
    }
  } else if (state.direction === 'left') {
    return { x: state.x, y: state.y + TILE_H, direction: 'down', row: newRow }
  }

  return state
}

// Calculate rotation for a tile
function calculateRotation(direction: 'right' | 'left' | 'up' | 'down', isDouble: boolean): 0 | 90 | 180 | 270 {
  if (isDouble) {
    // Doubles are always vertical (perpendicular to chain)
    switch (direction) {
      case 'right':
      case 'left':
        return 0  // vertical
      case 'down':
      case 'up':
        return 90  // horizontal
    }
  } else {
    // Regular tiles follow chain direction
    switch (direction) {
      case 'right': return 90   // horizontal, pointing right
      case 'left': return 270  // horizontal, pointing left
      case 'down': return 0    // vertical, pointing down
      case 'up': return 180    // vertical, pointing up
    }
  }
  return 0
}

// Determine if tile needs flipping and which values go where
function calculateTileValues(
  tile: DominoTile,
  connectValue: number,
  isLeft: boolean
): { top: number; bottom: number; flipped: boolean } {
  // The matching number should be on the side that connects to the chain
  // For left end: matching number goes to top (connects to previous tile's top)
  // For right end: matching number goes to bottom (connects to previous tile's bottom)

  if (tile.top === connectValue) {
    // No flip needed - top matches
    return { top: tile.top, bottom: tile.bottom, flipped: false }
  } else {
    // Flip needed - bottom matches
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  }
}

// ============================================================
// PLAY TILE - PROPER DOMINO CHAIN
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
    rotation = isDouble ? 0 : 0  // Both vertical
    tileTop = tile.top
    tileBottom = tile.bottom
  } else if (end === 'left') {
    // Extend left
    const firstTile = state.board[0]
    const connectValue = firstTile.top === firstTile.bottom 
      ? firstTile.top 
      : (firstTile.isLeft ? firstTile.top : firstTile.bottom)

    const values = calculateTileValues(tile, connectValue, true)
    tileTop = values.top
    tileBottom = values.bottom

    // Position: to the left of first tile
    const tileLength = isDouble ? TILE_W : TILE_H
    x = firstTile.x - tileLength - CHAIN_GAP
    y = firstTile.y

    // Direction is opposite of first tile's chain direction
    // For simplicity, assume chain goes right, so left extension goes left
    rotation = calculateRotation('left', isDouble)
  } else {
    // Extend right
    const lastTile = state.board[state.board.length - 1]
    const connectValue = lastTile.top === lastTile.bottom
      ? lastTile.top
      : (lastTile.isLeft ? lastTile.bottom : lastTile.top)

    const values = calculateTileValues(tile, connectValue, false)
    tileTop = values.top
    tileBottom = values.bottom

    // Position: to the right of last tile
    const tileLength = isDouble ? TILE_W : TILE_H
    x = lastTile.x + tileLength + CHAIN_GAP
    y = lastTile.y

    rotation = calculateRotation('right', isDouble)
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

  const newBoard = end === 'left' 
    ? [playedTile, ...state.board]
    : [...state.board, playedTile]

  // Remove tile from hand WITHOUT re-sorting
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
// AI - ORIGINAL
// ============================================================
export const getAIMove = (state: GameState, playerIndex: number, difficulty: string): { tileIndex: number; end: TileEnd } | null => {
  const ai = state.players[playerIndex]
  if (!ai || !ai.isAI) return null

  const validMoves: { tileIndex: number; end: TileEnd }[] = []
  for (let i = 0; i < ai.hand.length; i++) {
    const ends = getValidEnds(ai.hand[i], state.board)
    for (const end of ends) {
      validMoves.push({ tileIndex: i, end })
    }
  }

  if (validMoves.length === 0) return null
  if (difficulty === 'easy') return validMoves[Math.floor(Math.random() * validMoves.length)]

  validMoves.sort((a, b) => {
    const tileA = ai.hand[a.tileIndex]
    const tileB = ai.hand[b.tileIndex]
    const baseA = (tileA.top === tileA.bottom ? 10 : 0) + tileA.top + tileA.bottom
    const baseB = (tileB.top === tileB.bottom ? 10 : 0) + tileB.top + tileB.bottom
    return baseB - baseA
  })

  return difficulty === 'hard' ? validMoves[0] : validMoves[Math.floor(Math.random() * Math.min(3, validMoves.length))]
}

// ============================================================
// GAME BLOCKED
// ============================================================
export const isGameBlocked = (state: GameState): boolean => {
  for (let i = 0; i < state.players.length; i++) {
    for (const tile of state.players[i].hand) {
      if (getValidEnds(tile, state.board).length > 0) return false
    }
  }
  return state.stock.length === 0
}

export const getBlockedWinner = (state: GameState): Player | null => {
  let winner = state.players[0]
  let minScore = calculateScore(winner.hand)
  for (let i = 1; i < state.players.length; i++) {
    const score = calculateScore(state.players[i].hand)
    if (score < minScore) {
      minScore = score
      winner = state.players[i]
    }
  }
  return winner
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
