import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS
// ============================================================
const TILE_WIDTH = 40   // Narrow side (width of tile)
const TILE_HEIGHT = 80  // Long side (height of tile)
const CHAIN_GAP = 2     // Gap between connected tiles
const SCREEN_PADDING = 20  // Padding from screen edges

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
  const leftValue = leftTile.exposedValue

  const rightTile = board[board.length - 1]
  const rightValue = rightTile.exposedValue

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
// CHAIN LAYOUT - COMPLETELY REWRITTEN
// ============================================================

// Chain direction: 0=right, 1=down, 2=left, 3=up
// This follows the snake pattern: right -> down -> left -> down -> right ...

interface ChainState {
  x: number
  y: number
  direction: number  // 0=right, 1=down, 2=left, 3=up
}

function getNextChainState(state: ChainState, isDouble: boolean): ChainState {
  const tileLength = isDouble ? TILE_WIDTH : TILE_HEIGHT

  let newX = state.x
  let newY = state.y
  let newDirection = state.direction

  // Move in current direction
  switch (state.direction) {
    case 0: // right
      newX += tileLength + CHAIN_GAP
      break
    case 1: // down
      newY += tileLength + CHAIN_GAP
      break
    case 2: // left
      newX -= tileLength + CHAIN_GAP
      break
    case 3: // up
      newY -= tileLength + CHAIN_GAP
      break
  }

  return { x: newX, y: newY, direction: newDirection }
}

// Check if we need to turn (reached screen edge)
function shouldTurn(state: ChainState, screenWidth: number, screenHeight: number): boolean {
  const margin = SCREEN_PADDING + TILE_HEIGHT

  switch (state.direction) {
    case 0: return state.x + TILE_HEIGHT + margin > screenWidth
    case 1: return state.y + TILE_HEIGHT + margin > screenHeight
    case 2: return state.x - TILE_HEIGHT - margin < 0
    case 3: return state.y - TILE_HEIGHT - margin < 0
  }
  return false
}

// Turn direction (right -> down -> left -> up -> right ...)
function turnDirection(currentDir: number): number {
  // Snake pattern: right -> down -> left -> down -> right ...
  // Actually: right -> down -> left -> down -> right (zigzag)
  if (currentDir === 0) return 1  // right -> down
  if (currentDir === 1) return 2  // down -> left
  if (currentDir === 2) return 3  // left -> up
  return 0  // up -> right
}

// Calculate rotation for a tile based on chain direction and whether it's a double
function calculateTileRotation(direction: number, isDouble: boolean): number {
  if (isDouble) {
    // Doubles are perpendicular to chain direction
    switch (direction) {
      case 0: return 0    // vertical double in horizontal chain
      case 1: return 90   // horizontal double in vertical chain
      case 2: return 0    // vertical double in horizontal chain
      case 3: return 90   // horizontal double in vertical chain
    }
  } else {
    // Regular tiles follow chain direction
    switch (direction) {
      case 0: return 90   // pointing right
      case 1: return 0    // pointing down
      case 2: return 270  // pointing left
      case 3: return 180  // pointing up
    }
  }
  return 0
}

// Calculate the position and rotation for a new tile
function calculateTilePlacement(
  board: BoardTile[],
  end: TileEnd,
  tile: DominoTile,
  screenWidth: number = 800,
  screenHeight: number = 600
): { x: number; y: number; rotation: number; isLeft: boolean; flipped: boolean; chainDirection: 'right' | 'left' | 'up' | 'down'; connectedValue: number; exposedValue: number } {

  const isDouble = tile.top === tile.bottom

  if (board.length === 0) {
    // First tile - center, vertical
    return {
      x: screenWidth / 2,
      y: screenHeight / 2,
      rotation: isDouble ? 0 : 90,
      isLeft: true,
      flipped: false,
      chainDirection: 'right',
      connectedValue: tile.top,
      exposedValue: tile.bottom
    }
  }

  if (end === 'left') {
    // Extend left - reverse direction
    const firstTile = board[0]
    const chainDir = firstTile.chainDirection

    // Reverse direction
    let reverseDir: number
    switch (chainDir) {
      case 'right': reverseDir = 2; break
      case 'left': reverseDir = 0; break
      case 'up': reverseDir = 1; break
      case 'down': reverseDir = 3; break
    }

    // Check if we need to turn
    const state = { x: firstTile.x, y: firstTile.y, direction: reverseDir }
    if (shouldTurn(state, screenWidth, screenHeight)) {
      reverseDir = turnDirection(reverseDir)
    }

    const tileLength = isDouble ? TILE_WIDTH : TILE_HEIGHT
    let x = firstTile.x
    let y = firstTile.y

    switch (reverseDir) {
      case 0: x += tileLength + CHAIN_GAP; break
      case 1: y += tileLength + CHAIN_GAP; break
      case 2: x -= tileLength + CHAIN_GAP; break
      case 3: y -= tileLength + CHAIN_GAP; break
    }

    const { leftValue } = getBoardEnds(board)
    const flipped = tile.top !== leftValue
    const connectedValue = flipped ? tile.bottom : tile.top
    const exposedValue = flipped ? tile.top : tile.bottom

    const dirMap: Record<number, 'right' | 'left' | 'up' | 'down'> = {
      0: 'right', 1: 'down', 2: 'left', 3: 'up'
    }

    return {
      x, y,
      rotation: calculateTileRotation(reverseDir, isDouble),
      isLeft: true,
      flipped,
      chainDirection: dirMap[reverseDir],
      connectedValue,
      exposedValue
    }
  } else {
    // Extend right - continue direction
    const lastTile = board[board.length - 1]
    const chainDir = lastTile.chainDirection

    let dirNum: number
    switch (chainDir) {
      case 'right': dirNum = 0; break
      case 'left': dirNum = 2; break
      case 'up': dirNum = 3; break
      case 'down': dirNum = 1; break
    }

    // Check if we need to turn
    const state = { x: lastTile.x, y: lastTile.y, direction: dirNum }
    if (shouldTurn(state, screenWidth, screenHeight)) {
      dirNum = turnDirection(dirNum)
    }

    const tileLength = isDouble ? TILE_WIDTH : TILE_HEIGHT
    let x = lastTile.x
    let y = lastTile.y

    switch (dirNum) {
      case 0: x += tileLength + CHAIN_GAP; break
      case 1: y += tileLength + CHAIN_GAP; break
      case 2: x -= tileLength + CHAIN_GAP; break
      case 3: y -= tileLength + CHAIN_GAP; break
    }

    const { rightValue } = getBoardEnds(board)
    const flipped = tile.top !== rightValue
    const connectedValue = flipped ? tile.bottom : tile.top
    const exposedValue = flipped ? tile.top : tile.bottom

    const dirMap: Record<number, 'right' | 'left' | 'up' | 'down'> = {
      0: 'right', 1: 'down', 2: 'left', 3: 'up'
    }

    return {
      x, y,
      rotation: calculateTileRotation(dirNum, isDouble),
      isLeft: false,
      flipped,
      chainDirection: dirMap[dirNum],
      connectedValue,
      exposedValue
    }
  }
}

// ============================================================
// PLAY TILE - COMPLETELY REWRITTEN
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  // Calculate placement with chain algorithm
  const placement = calculateTilePlacement(state.board, end, tile)

  const playedTile: BoardTile = {
    ...tile,
    x: placement.x,
    y: placement.y,
    rotation: placement.rotation,
    isLeft: placement.isLeft,
    chainEnd: end,
    flipped: placement.flipped,
    chainDirection: placement.chainDirection,
    connectedValue: placement.connectedValue,
    exposedValue: placement.exposedValue,
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
// AI - ORIGINAL (unchanged)
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

  // Medium/Hard: prefer high value tiles and doubles
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
