import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile, PathHead, BoardBounds } from '@/types/game'

const TILE_W = 36
const TILE_H = 72
const GAP = 6
const BOARD_MARGIN = 40

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

function calculateNextPosition(
  state: GameState,
  tile: DominoTile,
  end: TileEnd,
  isDouble: boolean,
  containerWidth: number
): { x: number; y: number; rotation: 0 | 90 | 180 | 270; newHead: PathHead } {

  const AVAILABLE_W = Math.max(containerWidth, 300) / 2 - BOARD_MARGIN

  if (state.board.length === 0) {
    return {
      x: 0,
      y: 0,
      rotation: isDouble ? 0 : 90,
      newHead: { x: 0, y: 0, direction: 'right', row: 0 }
    }
  }

  const currentHead = end === 'right' ? state.rightHead : state.leftHead
  const targetTile = end === 'right' ? state.board[state.board.length - 1] : state.board[0]

  let currentDir = currentHead.direction
  let currentRow = currentHead.row
  let nextX = currentHead.x
  let nextY = currentHead.y
  let newDir = currentDir

  const targetIsHorizontal = targetTile.rotation === 90 || targetTile.rotation === 270
  const targetCurrentWidth = targetIsHorizontal ? TILE_H : TILE_W
  const targetCurrentHeight = targetIsHorizontal ? TILE_W : TILE_H

  const expectedRotation = isDouble
    ? (currentDir === 'up' || currentDir === 'down' ? 90 : 0)
    : (currentDir === 'up' || currentDir === 'down' ? 0 : 90)
  const isHorizontal = expectedRotation === 90 || expectedRotation === 270
  const tileWidth = isHorizontal ? TILE_H : TILE_W
  const tileHeight = isHorizontal ? TILE_W : TILE_H

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

export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd, containerWidth: number): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'قطعة غير صالحة' }
  if (!canPlayTile(tile, state.board, end)) return { valid: false, message: 'حركة غير قانونية' }

  const isDouble = tile.top === tile.bottom
  const position = calculateNextPosition(state, tile, end, isDouble, containerWidth)

  let startVal: number, endVal: number
  if (state.board.length === 0) {
    startVal = tile.top
    endVal = tile.bottom
  } else if (end === 'left') {
    const { leftValue } = getBoardEnds(state.board)
    if (tile.top === leftValue) {
      startVal = tile.bottom; endVal = tile.top;
    } else {
      startVal = tile.top; endVal = tile.bottom;
    }
  } else {
    const { rightValue } = getBoardEnds(state.board)
    if (tile.top === rightValue) {
      startVal = tile.top; endVal = tile.bottom;
    } else {
      startVal = tile.bottom; endVal = tile.top;
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
  if (state.stock.length > 0) return false
  for (let i = 0; i < state.players.length; i++) {
    if (canPlayerPlay(state, i)) return false
  }
  return true
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

export const getAIMove = (state: GameState, playerIndex: number, difficulty: string): { tileIndex: number; end: TileEnd } | null => {
  const ai = state.players[playerIndex]
  if (!ai || !ai.isAI) return null
  const validMoves: { tileIndex: number; end: TileEnd; score: number }[] = []
  for (let i = 0; i < ai.hand.length; i++) {
    const ends = getValidEnds(ai.hand[i], state.board)
    for (const end of ends) {
      let score = 0; const tile = ai.hand[i]
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
  if (difficulty === 'easy') return validMoves[Math.floor(Math.random() * validMoves.length)]
  validMoves.sort((a, b) => b.score - a.score)
  if (difficulty === 'hard') return { tileIndex: validMoves[0].tileIndex, end: validMoves[0].end }
  const topMoves = validMoves.slice(0, Math.min(3, validMoves.length))
  return topMoves[Math.floor(Math.random() * topMoves.length)]
}
