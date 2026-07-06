import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS
// ============================================================
const TILES_PER_ROW = 6  // Number of tiles before turning

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
  return { players: newPlayers, stock: newStock }
}

// ============================================================
// BOARD ENDS
// ============================================================
export const getBoardEnds = (board: BoardTile[]): { leftValue: number; rightValue: number } => {
  if (board.length === 0) return { leftValue: -1, rightValue: -1 }

  const leftTile = board[0]
  const leftValue = leftTile.isLeft ? leftTile.top : leftTile.bottom

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
// SNAKE LAYOUT - FIXED with proper rotation
// ============================================================

interface SnakeState {
  row: number
  col: number
  direction: 'right' | 'left'
}

function getCurrentSnakeState(board: BoardTile[]): SnakeState {
  if (board.length === 0) {
    return { row: 0, col: 0, direction: 'right' }
  }

  const lastTile = board[board.length - 1]
  const direction: 'right' | 'left' = lastTile.row % 2 === 0 ? 'right' : 'left'

  return {
    row: lastTile.row,
    col: lastTile.col,
    direction
  }
}

function calculateNextPosition(board: BoardTile[], end: TileEnd): { row: number; col: number; isLeft: boolean } {
  if (board.length === 0) {
    return { row: 0, col: 0, isLeft: true }
  }

  const state = getCurrentSnakeState(board)

  if (end === 'left') {
    const firstTile = board[0]
    const firstState: SnakeState = {
      row: firstTile.row,
      col: firstTile.col,
      direction: firstTile.row % 2 === 0 ? 'right' : 'left'
    }

    if (firstState.direction === 'right') {
      const newCol = firstTile.col - 1
      if (newCol < 0) {
        return { row: firstTile.row - 1, col: 0, isLeft: true }
      }
      return { row: firstTile.row, col: newCol, isLeft: true }
    } else {
      const newCol = firstTile.col + 1
      if (newCol >= TILES_PER_ROW) {
        return { row: firstTile.row - 1, col: TILES_PER_ROW - 1, isLeft: true }
      }
      return { row: firstTile.row, col: newCol, isLeft: true }
    }
  } else {
    const newCol = state.direction === 'right' ? state.col + 1 : state.col - 1

    if (state.direction === 'right' && newCol >= TILES_PER_ROW) {
      return { row: state.row + 1, col: state.col, isLeft: false }
    }

    if (state.direction === 'left' && newCol < 0) {
      return { row: state.row + 1, col: 0, isLeft: false }
    }

    return { row: state.row, col: newCol, isLeft: false }
  }
}

// FIXED: Calculate rotation based on snake direction and position
function calculateRotation(board: BoardTile[], end: TileEnd, position: { row: number; col: number; isLeft: boolean }): number {
  if (board.length === 0) return 0 // First tile: vertical
  
  const state = getCurrentSnakeState(board)
  
  if (end === 'left') {
    // Left end extends opposite to first tile's direction
    const firstTile = board[0]
    const firstDirection = firstTile.row % 2 === 0 ? 'right' : 'left'
    // If extending in same row: horizontal (90°)
    // If wrapping to new row: vertical (0°)
    if (position.row !== firstTile.row) {
      return 0 // Vertical for wrap-around
    }
    return 90 // Horizontal
  } else {
    // Right end extends in current direction
    if (position.row !== state.row) {
      return 0 // Vertical for turn-down
    }
    return 90 // Horizontal
  }
}

// ============================================================
// PLAY TILE - FIXED with rotation
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  // Calculate position
  const position = calculateNextPosition(state.board, end)

  // Determine if we need to flip the tile
  const { leftValue, rightValue } = getBoardEnds(state.board)
  const connectValue = end === 'left' ? leftValue : rightValue
  const needsFlip = tile.top !== connectValue

  // FIXED: Calculate proper rotation
  const rotation = calculateRotation(state.board, end, position)

  const playedTile: BoardTile = {
    ...tile,
    row: position.row,
    col: position.col,
    rotation, // FIXED: Now dynamic based on layout
    isLeft: position.isLeft,
    top: needsFlip ? tile.bottom : tile.top,
    bottom: needsFlip ? tile.top : tile.bottom,
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
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    hand: [...newPlayers[playerIndex].hand, tile]
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
// AI - FIXED with blocking and counting strategies
// ============================================================

// NEW: Check if any opponent can play after a move
function canAnyOpponentPlay(board: BoardTile[], players: Player[], currentPlayerIndex: number): boolean {
  const { leftValue, rightValue } = getBoardEnds(board)
  const boardEnds = [leftValue, rightValue]
  
  for (let i = 0; i < players.length; i++) {
    if (i === currentPlayerIndex) continue // Skip current player
    for (const tile of players[i].hand) {
      if (boardEnds.includes(tile.top) || boardEnds.includes(tile.bottom)) {
        return true
      }
    }
  }
  return false
}

// NEW: Count how many of each number are still in play (including stock)
function countNumbersInPlay(state: GameState, playerIndex: number): Map<number, number> {
  const counts = new Map<number, number>()
  for (let i = 0; i <= 6; i++) counts.set(i, 0)
  
  // Count in stock
  for (const tile of state.stock) {
    counts.set(tile.top, (counts.get(tile.top) || 0) + 1)
    counts.set(tile.bottom, (counts.get(tile.bottom) || 0) + 1)
  }
  
  // Count in all players' hands (including AI)
  for (const player of state.players) {
    for (const tile of player.hand) {
      counts.set(tile.top, (counts.get(tile.top) || 0) + 1)
      counts.set(tile.bottom, (counts.get(tile.bottom) || 0) + 1)
    }
  }
  
  return counts
}

// NEW: Score a move based on strategy
function scoreMove(state: GameState, playerIndex: number, move: { tileIndex: number; end: TileEnd }, difficulty: string): number {
  const tile = state.players[playerIndex].hand[move.tileIndex]
  const { leftValue, rightValue } = getBoardEnds(state.board)
  const connectValue = move.end === 'left' ? leftValue : rightValue
  
  let score = 0
  
  // Base: prefer high-value tiles and doubles
  score += (tile.top === tile.bottom ? 15 : 0) + tile.top + tile.bottom
  
  if (difficulty === 'hard') {
    // Simulate the move
    const newBoard = move.end === 'left'
      ? [{ ...tile, row: 0, col: 0, rotation: 0, isLeft: true, top: tile.top === connectValue ? tile.top : tile.bottom, bottom: tile.top === connectValue ? tile.bottom : tile.top }, ...state.board]
      : [...state.board, { ...tile, row: 0, col: 0, rotation: 0, isLeft: false, top: tile.top === connectValue ? tile.top : tile.bottom, bottom: tile.top === connectValue ? tile.bottom : tile.top }]
    
    // Blocking bonus: if move blocks opponents
    if (!canAnyOpponentPlay(newBoard as BoardTile[], state.players, playerIndex)) {
      score += 50 // High bonus for blocking
    }
    
    // End control: prefer moves that leave useful ends
    const newEnds = getBoardEnds(newBoard as BoardTile[])
    const numberCounts = countNumbersInPlay(state, playerIndex)
    const endCount = (numberCounts.get(newEnds.leftValue) || 0) + (numberCounts.get(newEnds.rightValue) || 0)
    score += endCount * 2 // More tiles matching the ends = better control
    
    // Penalize leaving doubles if possible (doubles are harder to play)
    if (tile.top === tile.bottom) {
      score -= 5 // Slight penalty for playing doubles (save them)
    }
  }
  
  return score
}

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

  // FIXED: Score each move and pick the best
  validMoves.sort((a, b) => {
    const scoreB = scoreMove(state, playerIndex, b, difficulty)
    const scoreA = scoreMove(state, playerIndex, a, difficulty)
    return scoreB - scoreA
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
