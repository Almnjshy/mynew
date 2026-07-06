import { DominoTile, Player, GameState, TileEnd, MoveResult, GameMode, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS
// ============================================================
const MAX_COLS_PER_ROW = 5  // Max horizontal tiles before turning down
const MAX_ROWS = 10         // Safety limit

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
// TILE DEALING - Dynamic based on player count
// ============================================================
export const dealTiles = (players: Player[], stock: DominoTile[]): { players: Player[]; stock: DominoTile[] } => {
  const newPlayers = players.map(p => ({ ...p, hand: [] as DominoTile[] }))
  const newStock = [...stock]

  // Number of tiles per player based on player count
  // 2 players: 7 tiles each
  // 3-4 players: 6 tiles each  
  // 5 players: 5 tiles each
  const tilesPerPlayer = players.length <= 2 ? 7 : players.length <= 4 ? 6 : 5

  for (let i = 0; i < tilesPerPlayer; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      if (newStock.length > 0) {
        const tile = newStock.pop()!
        newPlayers[j].hand.push(tile)
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

  // For the left end: the value that faces OUTWARD from the chain
  // The first tile was placed with isLeft=true, so its top faces left
  const leftTile = board[0]
  const leftValue = leftTile.isLeft ? leftTile.top : leftTile.bottom

  // For the right end: the last tile's outward-facing value
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

  if (end === 'left') {
    return tile.top === leftValue || tile.bottom === leftValue
  } else {
    return tile.top === rightValue || tile.bottom === rightValue
  }
}

export const getValidEnds = (tile: DominoTile, board: BoardTile[]): TileEnd[] => {
  if (board.length === 0) return ['left']
  const ends: TileEnd[] = []
  if (canPlayTile(tile, board, 'left')) ends.push('left')
  if (canPlayTile(tile, board, 'right')) ends.push('right')
  return ends
}

// ============================================================
// SNAKE LAYOUT - Proper algorithm
// ============================================================
function getSnakeDirection(board: BoardTile[]): { direction: 'right' | 'left' | 'down'; row: number; col: number } {
  if (board.length === 0) {
    return { direction: 'right', row: 0, col: 0 }
  }

  const lastTile = board[board.length - 1]

  // Determine direction based on rotation and position
  if (lastTile.rotation === 0 || lastTile.rotation === 180) {
    // Vertical tile - we're going down or just turned
    // Check previous tile to determine actual direction
    if (board.length >= 2) {
      const prevTile = board[board.length - 2]
      if (lastTile.col > prevTile.col) return { direction: 'right', row: lastTile.row, col: lastTile.col }
      if (lastTile.col < prevTile.col) return { direction: 'left', row: lastTile.row, col: lastTile.col }
    }
    return { direction: 'right', row: lastTile.row, col: lastTile.col }
  }

  // Horizontal tile
  if (lastTile.rotation === 90) {
    // Going right (normal horizontal)
    return { direction: 'right', row: lastTile.row, col: lastTile.col }
  } else {
    // Going left
    return { direction: 'left', row: lastTile.row, col: lastTile.col }
  }
}

function calculateSnakePosition(
  board: BoardTile[],
  end: TileEnd,
  tile: DominoTile
): { row: number; col: number; rotation: number; isLeft: boolean } {
  if (board.length === 0) {
    // First tile - center, vertical
    return { row: 0, col: 0, rotation: 0, isLeft: true }
  }

  const { leftValue, rightValue } = getBoardEnds(board)
  const connectValue = end === 'left' ? leftValue : rightValue

  // Check if we need to flip the tile to match
  const needsFlip = tile.top !== connectValue

  // Get current snake state from the end we're playing on
  const targetTile = end === 'left' ? board[0] : board[board.length - 1]
  const currentDir = getSnakeDirection(end === 'left' ? [targetTile] : board)

  let newRow = targetTile.row
  let newCol = targetTile.col
  let newRotation = 0
  let newDirection = currentDir.direction

  // Calculate new position based on current direction
  switch (currentDir.direction) {
    case 'right':
      if (end === 'left') {
        // Playing on the left end while going right means we need to reverse
        newCol = targetTile.col - 1
        newRotation = 90 // Horizontal, facing left
        newDirection = 'left'
      } else {
        // Continue right
        newCol = targetTile.col + 1
        newRotation = 90 // Horizontal, facing right

        // Check if we need to turn down
        const rowTiles = board.filter(t => t.row === newRow)
        if (rowTiles.length >= MAX_COLS_PER_ROW || newCol >= MAX_COLS_PER_ROW) {
          // Turn down
          newRow = targetTile.row + 1
          newCol = targetTile.col
          newRotation = 0 // Vertical
          newDirection = 'down'
        }
      }
      break

    case 'left':
      if (end === 'right') {
        // Playing on right end while going left means reverse
        newCol = targetTile.col + 1
        newRotation = 90 // Horizontal, facing right
        newDirection = 'right'
      } else {
        // Continue left
        newCol = targetTile.col - 1
        newRotation = 270 // Horizontal, facing left (flipped)

        // Check if we need to turn down
        const rowTiles = board.filter(t => t.row === newRow)
        if (rowTiles.length >= MAX_COLS_PER_ROW || newCol <= -MAX_COLS_PER_ROW) {
          // Turn down
          newRow = targetTile.row + 1
          newCol = targetTile.col
          newRotation = 0 // Vertical
          newDirection = 'down'
        }
      }
      break

    case 'down':
      if (end === 'left') {
        newDirection = 'right'
        newCol = targetTile.col + 1
        newRow = targetTile.row
        newRotation = 90 // Horizontal
      } else {
        newDirection = 'left'
        newCol = targetTile.col - 1
        newRow = targetTile.row
        newRotation = 270 // Horizontal flipped
      }
      break
  }

  return {
    row: newRow,
    col: newCol,
    rotation: newRotation,
    isLeft: end === 'left',
  }
}

// ============================================================
// PLAY TILE
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }

  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  // Calculate snake position
  const position = calculateSnakePosition(state.board, end, tile)

  // Determine if we need to flip
  const { leftValue, rightValue } = getBoardEnds(state.board)
  const connectValue = end === 'left' ? leftValue : rightValue
  const needsFlip = tile.top !== connectValue

  const playedTile: BoardTile = {
    ...tile,
    row: position.row,
    col: position.col,
    rotation: position.rotation,
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

  // Next player
  const nextPlayer = (playerIndex + 1) % state.players.length

  return {
    valid: true,
    newState: {
      ...state,
      board: newBoard,
      players: newPlayers,
      currentPlayerIndex: nextPlayer,
      lastMove: { playerId: player.id, tile: playedTile, end },
      snakeDirection: position.rotation === 0 ? 'down' : (position.rotation === 90 ? 'right' : 'left'),
      snakeRow: position.row,
      snakeCol: position.col,
      maxRow: Math.max(state.maxRow, position.row),
      minRow: Math.min(state.minRow, position.row),
      maxCol: Math.max(state.maxCol, position.col),
      minCol: Math.min(state.minCol, position.col),
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

  if (total % 5 === 0) {
    return total
  }
  return 0
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
// AI - Works for ANY player index
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

  if (difficulty === 'easy') {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }

  // Medium/Hard
  validMoves.sort((a, b) => {
    const tileA = ai.hand[a.tileIndex]
    const tileB = ai.hand[b.tileIndex]

    let scoreA = 0
    let scoreB = 0

    if (state.board.length > 0) {
      const { leftValue, rightValue } = getBoardEnds(state.board)
      const valA = a.end === 'left' ? tileA.top : tileA.bottom
      const valB = b.end === 'left' ? tileB.top : tileB.bottom

      const totalA = leftValue + rightValue + valA
      const totalB = leftValue + rightValue + valB

      if (totalA % 5 === 0) scoreA += totalA
      if (totalB % 5 === 0) scoreB += totalB
    }

    const baseA = (tileA.top === tileA.bottom ? 10 : 0) + tileA.top + tileA.bottom + scoreA
    const baseB = (tileB.top === tileB.bottom ? 10 : 0) + tileB.top + tileB.bottom + scoreB

    return baseB - baseA
  })

  return difficulty === 'hard' ? validMoves[0] : validMoves[Math.floor(Math.random() * Math.min(3, validMoves.length))]
}

// ============================================================
// GAME BLOCKED
// ============================================================
export const isGameBlocked = (state: GameState): boolean => {
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i]
    for (const tile of player.hand) {
      const ends = getValidEnds(tile, state.board)
      if (ends.length > 0) return false
    }
  }
  return state.stock.length === 0
}

// ============================================================
// BLOCKED WINNER
// ============================================================
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

// ============================================================
// CAN PLAYER PLAY
// ============================================================
export const canPlayerPlay = (state: GameState, playerIndex: number): boolean => {
  const player = state.players[playerIndex]
  for (const tile of player.hand) {
    const ends = getValidEnds(tile, state.board)
    if (ends.length > 0) return true
  }
  return false
}

// ============================================================
// SKIP TURN
// ============================================================
export const skipTurn = (state: GameState): GameState => {
  const nextPlayer = (state.currentPlayerIndex + 1) % state.players.length
  return { ...state, currentPlayerIndex: nextPlayer }
}
