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
// BOARD ENDS - FIXED: Correctly identifies exposed values
// ============================================================
export const getBoardEnds = (board: BoardTile[]): { leftValue: number; rightValue: number } => {
  if (board.length === 0) return { leftValue: -1, rightValue: -1 }

  // Left end: exposed value of first tile (the side NOT connected to the next tile)
  // For a BoardTile, the side facing OUT is determined by isLeft flag
  const leftTile = board[0]
  const leftValue = leftTile.isLeft ? leftTile.top : leftTile.bottom

  // Right end: exposed value of last tile
  // FIXED: Was using leftTile instead of rightTile
  const rightTile = board[board.length - 1]
  const rightValue = rightTile.isLeft ? rightTile.bottom : rightTile.top

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
  row: number
}

function getInitialChainState(): ChainState {
  return { x: 0, y: 0, direction: 'right', row: 0 }
}

function shouldTurn(state: ChainState, screenWidth: number = 800): boolean {
  const margin = TILE_H * 3
  if (state.direction === 'right' && state.x + TILE_H > screenWidth - margin) return true
  if (state.direction === 'left' && state.x - TILE_H < margin) return true
  return false
}

function turnDirection(state: ChainState): ChainState {
  const newRow = state.row + 1
  if (state.direction === 'right') {
    return { x: state.x, y: state.y + TILE_H, direction: 'down', row: newRow }
  } else if (state.direction === 'down') {
    if (state.row % 2 === 1) {
      return { x: state.x, y: state.y, direction: 'right', row: newRow }
    } else {
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
    switch (direction) {
      case 'right':
      case 'left':
        return 0
      case 'down':
      case 'up':
        return 90
    }
  } else {
    switch (direction) {
      case 'right': return 90
      case 'left': return 270
      case 'down': return 0
      case 'up': return 180
    }
  }
  return 0
}

// ============================================================
// FIXED: calculateTileValues - Correct matching logic
// ============================================================
function calculateTileValues(
  tile: DominoTile,
  connectValue: number,
  isLeft: boolean
): { top: number; bottom: number; flipped: boolean } {
  // For LEFT end: the matching number goes to BOTTOM (connects to previous tile's TOP)
  // For RIGHT end: the matching number goes to TOP (connects to previous tile's BOTTOM)

  if (isLeft) {
    // Left extension: matching number at BOTTOM
    if (tile.bottom === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  } else {
    // Right extension: matching number at TOP
    if (tile.top === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  }
}

// ============================================================
// PLAY TILE - FIXED: Correct board insertion and value assignment
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
    const connectValue = firstTile.isLeft ? firstTile.top : firstTile.bottom

    const values = calculateTileValues(tile, connectValue, true)
    tileTop = values.top
    tileBottom = values.bottom

    const tileLength = isDouble ? TILE_W : TILE_H
    x = firstTile.x - tileLength - CHAIN_GAP
    y = firstTile.y
    rotation = calculateRotation('left', isDouble)
  } else {
    // Extend right
    const lastTile = state.board[state.board.length - 1]
    const connectValue = lastTile.isLeft ? lastTile.bottom : lastTile.top

    const values = calculateTileValues(tile, connectValue, false)
    tileTop = values.top
    tileBottom = values.bottom

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

  // FIXED: Use unshift for left, push for right
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
      // Simulate the move to calculate score
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
// GAME BLOCKED - FIXED: Proper blocked game detection
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
