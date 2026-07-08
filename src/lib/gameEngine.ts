import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile, PathHead, BoardBounds } from '@/types/game'

const TILE_W = 36
const TILE_H = 72
const GAP = 4
const BOARD_MARGIN = 40

// Unicode domino characters base (U+1F030 to U+1F093)
const UNICODE_DOMINO_BASE = 0x1F030

/**
 * Get Unicode character for a domino tile
 * This is more visually appealing than drawing dots manually
 */
export function getUnicodeTile(top: number, bottom: number, isHorizontal: boolean = false): string {
  // Calculate Unicode offset: horizontal tiles start at 0x1F030, vertical at 0x1F062
  const base = isHorizontal ? 0x1F030 : 0x1F062
  // The offset is calculated as: top * 7 + bottom (for top <= bottom)
  // For rotated tiles (top > bottom), we use the reverse
  const normalizedTop = Math.min(top, bottom)
  const normalizedBottom = Math.max(top, bottom)
  const offset = normalizedTop * 7 + normalizedBottom
  return String.fromCodePoint(base + offset)
}

/**
 * Get Unicode for a face-down tile
 */
export function getUnicodeBack(isHorizontal: boolean = false): string {
  return isHorizontal ? String.fromCodePoint(0x1F030) : String.fromCodePoint(0x1F062)
}

export const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

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

export function sortPlayerHand(hand: DominoTile[]): DominoTile[] {
  const normalized = hand.map(tile => {
    if (tile.top > tile.bottom) return { ...tile, top: tile.bottom, bottom: tile.top }
    return tile
  })
  return normalized.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top
    return a.bottom - b.bottom
  })
}

export const dealTiles = (players: Player[], stock: DominoTile[]): { players: Player[]; stock: DominoTile[] } => {
  const newPlayers = players.map(p => ({ ...p, hand: [] as DominoTile[] }))
  const newStock = [...stock]
  const tilesPerPlayer = players.length <= 2 ? 7 : players.length <= 4 ? 6 : 5

  for (let i = 0; i < tilesPerPlayer; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      if (newStock.length > 0) newPlayers[j].hand.push(newStock.pop()!)
    }
  }
  for (const player of newPlayers) player.hand = sortPlayerHand(player.hand)
  return { players: newPlayers, stock: newStock }
}

export const getBoardEnds = (board: BoardTile[]): { leftValue: number; rightValue: number } => {
  if (board.length === 0) return { leftValue: -1, rightValue: -1 }
  return { leftValue: board[0].startValue, rightValue: board[board.length - 1].endValue }
}

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

function updateBounds(currentBounds: BoardBounds, x: number, y: number, isHorizontal: boolean): BoardBounds {
  const w = isHorizontal ? TILE_H : TILE_W
  const h = isHorizontal ? TILE_W : TILE_H
  const padding = 40
  return {
    minX: Math.min(currentBounds.minX, x - w / 2 - padding),
    maxX: Math.max(currentBounds.maxX, x + w / 2 + padding),
    minY: Math.min(currentBounds.minY, y - h / 2 - padding),
    maxY: Math.max(currentBounds.maxY, y + h / 2 + padding),
  }
}

/**
 * Calculate the position for a new tile to be placed on the board.
 * The tile is positioned so it CONNECTS to the existing chain.
 * Uses snake layout to prevent board overflow.
 */
function calculateNextPosition(
  state: GameState,
  tile: DominoTile,
  end: TileEnd,
  isDouble: boolean,
  containerWidth: number
): { x: number; y: number; rotation: 0 | 90 | 180 | 270; newHead: PathHead } {

  const AVAILABLE_W = Math.max(containerWidth, 300) / 2 - BOARD_MARGIN

  // First tile - center of board
  if (state.board.length === 0) {
    return {
      x: 0,
      y: 0,
      rotation: isDouble ? 0 : 90,
      newHead: { x: 0, y: 0, direction: 'right', row: 0 }
    }
  }

  const currentHead = end === 'right' ? state.rightHead : state.leftHead
  const targetTile = end === 'right' 
    ? state.board[state.board.length - 1] 
    : state.board[0]

  let currentDir = currentHead.direction
  let currentRow = currentHead.row
  let nextX = currentHead.x
  let nextY = currentHead.y
  let newDir = currentDir

  // Calculate dimensions of the target tile (the one we're connecting to)
  const targetIsHorizontal = targetTile.rotation === 90 || targetTile.rotation === 270
  const targetCurrentWidth = targetIsHorizontal ? TILE_H : TILE_W
  const targetCurrentHeight = targetIsHorizontal ? TILE_W : TILE_H

  // Determine rotation for the new tile
  const expectedRotation = isDouble
    ? (currentDir === 'up' || currentDir === 'down' ? 90 : 0)
    : (currentDir === 'up' || currentDir === 'down' ? 0 : 90)
  const isHorizontal = expectedRotation === 90 || expectedRotation === 270
  const tileWidth = isHorizontal ? TILE_H : TILE_W
  const tileHeight = isHorizontal ? TILE_W : TILE_H

  // Calculate spacing - tile edges should TOUCH (GAP is minimal visual gap)
  let spacing = GAP
  if (currentDir === 'right' || currentDir === 'left') {
    spacing += (targetCurrentWidth / 2) + (tileWidth / 2)
    if (currentDir === 'right') nextX += spacing
    else nextX -= spacing
  } else if (currentDir === 'down' || currentDir === 'up') {
    spacing += (targetCurrentHeight / 2) + (tileHeight / 2)
    if (currentDir === 'down') nextY += spacing
    else nextY -= spacing
  }

  // Check bounds and snake if needed
  const outOfRightBound = currentDir === 'right' && nextX + (tileWidth / 2) > AVAILABLE_W
  const outOfLeftBound = currentDir === 'left' && nextX - (tileWidth / 2) < -AVAILABLE_W

  if (outOfRightBound || outOfLeftBound) {
    currentRow += 1
    newDir = 'down'
    nextX = targetTile.x
    nextY = targetTile.y + GAP + (targetCurrentHeight / 2) + (tileHeight / 2)
  } else if (currentDir === 'down') {
    newDir = currentRow % 2 === 0 ? 'right' : 'left'
  }

  let finalRotation = expectedRotation
  if (isDouble) {
    finalRotation = (newDir === 'right' || newDir === 'left') ? 0 : 90
  }

  return {
    x: nextX,
    y: nextY,
    rotation: finalRotation as 0 | 90 | 180 | 270,
    newHead: { x: nextX, y: nextY, direction: newDir, row: currentRow }
  }
}

/**
 * Play a tile on the board. The tile is placed at the specified end (left or right)
 * and must match the value at that end.
 * 
 * The tile is oriented so that the matching number faces the board (connected side)
 * and the other number faces outward (open end).
 */
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd, containerWidth: number): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'قطعة غير صالحة' }
  if (!canPlayTile(tile, state.board, end)) return { valid: false, message: 'حركة غير قانونية' }

  const isDouble = tile.top === tile.bottom
  const position = calculateNextPosition(state, tile, end, isDouble, containerWidth)

  // Determine how to orient the tile so matching numbers connect
  // startValue = the number facing the board (connected side)
  // endValue = the number facing outward (open end)
  let startVal: number, endVal: number
  if (state.board.length === 0) {
    // First tile - no need to match anything
    startVal = tile.top
    endVal = tile.bottom
  } else if (end === 'left') {
    // Placing on the left end
    const { leftValue } = getBoardEnds(state.board)
    if (tile.top === leftValue) {
      // tile.top matches leftValue, so tile.bottom becomes the new left end
      startVal = tile.bottom
      endVal = tile.top
    } else {
      // tile.bottom matches leftValue, so tile.top becomes the new left end
      startVal = tile.top
      endVal = tile.bottom
    }
  } else {
    // Placing on the right end
    const { rightValue } = getBoardEnds(state.board)
    if (tile.top === rightValue) {
      // tile.top matches rightValue, so tile.bottom becomes the new right end
      startVal = tile.top
      endVal = tile.bottom
    } else {
      // tile.bottom matches rightValue, so tile.top becomes the new right end
      startVal = tile.bottom
      endVal = tile.top
    }
  }

  const playedTile: BoardTile = {
    ...tile,
    x: position.x,
    y: position.y,
    rotation: position.rotation,
    isLeft: end === 'left',
    startValue: startVal,
    endValue: endVal,
  }

  const newBoard = end === 'left' ? [playedTile, ...state.board] : [...state.board, playedTile]
  const newHand = [...player.hand]
  newHand.splice(tileIndex, 1)

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = { ...player, hand: newHand }

  const allFivesScore = calculateAllFivesScore(newBoard)
  if (allFivesScore > 0) {
    newPlayers[playerIndex].score += allFivesScore
  }

  const isGameOver = newHand.length === 0

  let updatedLeftHead = state.leftHead
  let updatedRightHead = state.rightHead

  if (state.board.length === 0) {
    updatedLeftHead = { x: 0, y: 0, direction: 'left', row: 0 }
    updatedRightHead = { x: 0, y: 0, direction: 'right', row: 0 }
  } else if (end === 'left') {
    updatedLeftHead = position.newHead
  } else {
    updatedRightHead = position.newHead
  }

  const isHorizontal = position.rotation === 90 || position.rotation === 270
  const newBounds = updateBounds(state.bounds, position.x, position.y, isHorizontal)

  return {
    valid: true,
    newState: {
      ...state,
      board: newBoard,
      players: newPlayers,
      currentPlayerIndex: isGameOver ? state.currentPlayerIndex : (playerIndex + 1) % state.players.length,
      lastMove: { playerId: player.id, tile: playedTile, end },
      leftHead: updatedLeftHead,
      rightHead: updatedRightHead,
      bounds: newBounds,
      isGameOver,
      winner: isGameOver ? newPlayers[playerIndex] : null,
    }
  }
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

export const drawFromStock = (state: GameState, playerIndex: number): GameState => {
  if (state.stock.length === 0) return state
  const newStock = [...state.stock]
  const tile = newStock.pop()!
  const newPlayers = [...state.players]
  const player = { ...newPlayers[playerIndex], hand: sortPlayerHand([...newPlayers[playerIndex].hand, tile]) }
  newPlayers[playerIndex] = player
  return { ...state, stock: newStock, players: newPlayers }
}

export const skipTurn = (state: GameState): GameState => {
  return {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
  }
}

export const canPlayerPlay = (state: GameState, playerIndex: number): boolean => {
  const player = state.players[playerIndex]
  if (!player) return false
  for (const tile of player.hand) {
    if (getValidEnds(tile, state.board).length > 0) return true
  }
  return false
}

export const isGameBlocked = (state: GameState): boolean => {
  for (let i = 0; i < state.players.length; i++) {
    if (canPlayerPlay(state, i)) return false
  }
  return state.stock.length === 0
}

export const getBlockedWinner = (state: GameState): Player | null => {
  if (!isGameBlocked(state)) return null
  let minScore = Infinity
  let winner: Player | null = null
  for (const player of state.players) {
    const score = calculateScore(player.hand)
    if (score < minScore) {
      minScore = score
      winner = player
    }
  }
  return winner
}

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
    leftHead: { x: 0, y: 0, direction: 'left', row: 0 },
    rightHead: { x: 0, y: 0, direction: 'right', row: 0 },
    bounds: { minX: -400, maxX: 400, minY: -300, maxY: 300 }
  }
}
