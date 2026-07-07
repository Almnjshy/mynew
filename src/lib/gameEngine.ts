import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// CONSTANTS - Board Layout
// ============================================================
const TILE_W = 36      // Width of narrow side (double tile width)
const TILE_H = 72      // Length of tile (normal tile length)
const GAP = 2          // Small gap between tiles
const BOARD_MARGIN = 40 // Margin from screen edges

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
    return { width: TILE_W, height: TILE_H }
  }
  if (rotation === 0 || rotation === 180) {
    return { width: TILE_W, height: TILE_H }
  }
  return { width: TILE_H, height: TILE_W }
}

// Helper to get tiles in same row
function getTilesInSameRow(board: BoardTile[], targetTile: BoardTile): BoardTile[] {
  return board.filter(t => Math.abs(t.y - targetTile.y) < 1)
}

// ============================================================
// SNAKE LAYOUT ENGINE - Updated with dynamic container width
// ============================================================
function calculateNextPosition(
  board: BoardTile[],
  end: TileEnd,
  isDouble: boolean,
  containerWidth: number // تم إضافة هذا ليكون ديناميكياً
): { x: number; y: number; rotation: 0 | 90 | 180 | 270 } {

  if (board.length === 0) {
    return { x: 0, y: 0, rotation: 0 }
  }

  const newTileWidth = isDouble ? TILE_W : TILE_H  
  const newTileHeight = isDouble ? TILE_H : TILE_W 
  
  // حساب العرض المتاح ديناميكياً بناءً على الـ container
  const AVAILABLE_W = containerWidth / 2 - BOARD_MARGIN

  if (end === 'right') {
    const lastTile = board[board.length - 1]
    const lastDims = getTileDimensions(lastTile.rotation, lastTile.top === lastTile.bottom)

    const newX = lastTile.x + lastDims.width / 2 + GAP + newTileWidth / 2

    if (newX + newTileWidth / 2 > AVAILABLE_W) {
      const currentRowTiles = getTilesInSameRow(board, lastTile)
      const firstTileInRow = currentRowTiles[0]

      return {
        x: firstTileInRow.x,
        y: lastTile.y + Math.max(lastDims.height, TILE_H) + GAP * 4,
        rotation: isDouble ? 0 : 90 // الدبل يوضع عمودياً بينما العادي يوضع أفقياً في المسار الجديد
      }
    }

    return {
      x: newX,
      y: lastTile.y,
      rotation: isDouble ? 0 : 90
    }
  } else {
    const firstTile = board[0]
    const firstDims = getTileDimensions(firstTile.rotation, firstTile.top === firstTile.bottom)

    const newX = firstTile.x - firstDims.width / 2 - GAP - newTileWidth / 2

    if (newX - newTileWidth / 2 < -AVAILABLE_W) {
      const currentRowTiles = getTilesInSameRow(board, firstTile)
      const lastTileInRow = currentRowTiles[currentRowTiles.length - 1]

      return {
        x: lastTileInRow.x,
        y: firstTile.y + Math.max(firstDims.height, TILE_H) + GAP * 4,
        rotation: isDouble ? 0 : 270
      }
    }

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
    if (tile.bottom === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  } else {
    if (tile.top === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  }
}

// ============================================================
// PLAY TILE
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd, containerWidth: number): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  const isDouble = tile.top === tile.bottom

  // تمرير عرض الحاوية (containerWidth) هنا
  const position = calculateNextPosition(state.board, end, isDouble, containerWidth)

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
// DRAW FROM STOCK & SCORING
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
// INITIALIZE GAME (Removed unused snake state variables)
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
  }
}

// (باقي دوال AI و isGameBlocked كما هي، لم يتم تغييرها)