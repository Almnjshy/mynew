import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile, Direction, PathHead, BoardBounds } from '@/types/game'

const TILE_W = 36
const TILE_H = 72
const GAP = 6
const AVAILABLE_W = 360 // عرض اللوحة المسموح به قبل الالتفاف

// ... دالة createDominoSet, shuffle, createPlayers, sortPlayerHand, dealTiles تظل كما هي ...

export const getBoardEnds = (board: BoardTile[]): { leftValue: number; rightValue: number; leftIsDouble: boolean; rightIsDouble: boolean } => {
  if (board.length === 0) return { leftValue: -1, rightValue: -1, leftIsDouble: false, rightIsDouble: false }
  const leftTile = board[0]
  const rightTile = board[board.length - 1]
  return {
    leftValue: leftTile.startValue,
    rightValue: rightTile.endValue,
    leftIsDouble: leftTile.top === leftTile.bottom,
    rightIsDouble: rightTile.top === rightTile.bottom,
  }
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

// تحديث ديناميكي لحدود اللوحة لتبني الـ Canvas أبعادها عليها
function updateBounds(currentBounds: BoardBounds, x: number, y: number, isHorizontal: boolean): BoardBounds {
  const w = isHorizontal ? TILE_H : TILE_W
  const h = isHorizontal ? TILE_W : TILE_H
  const padding = 100 // مساحة أمان إضافية حول الأطراف

  return {
    minX: Math.min(currentBounds.minX, x - w / 2 - padding),
    maxX: Math.max(currentBounds.maxX, x + w / 2 + padding),
    minY: Math.min(currentBounds.minY, y - h / 2 - padding),
    maxY: Math.max(currentBounds.maxY, y + h / 2 + padding),
  }
}

// محرك الالتفاف الأفعواني الذكي (S-Shape Pattern Engine)
function calculateNextPosition(
  state: GameState,
  tile: DominoTile,
  end: TileEnd,
  isDouble: boolean
): { x: number; y: number; rotation: 0 | 90 | 180 | 270; newHead: PathHead } {
  
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

  // حساب الدوران المتوقع وهل هي أفقية أم عمودية
  const expectedRotation = isDouble 
    ? (currentDir === 'up' || currentDir === 'down' ? 90 : 0) 
    : (currentDir === 'up' || currentDir === 'down' ? 0 : 90)

  const isHorizontal = expectedRotation === 90 || expectedRotation === 270
  const tileWidth = isHorizontal ? TILE_H : TILE_W
  const tileHeight = isHorizontal ? TILE_W : TILE_H

  const targetCurrentWidth = (targetTile.rotation === 90 || targetTile.rotation === 270) ? TILE_H : TILE_W
  const targetCurrentHeight = (targetTile.rotation === 90 || targetTile.rotation === 270) ? TILE_W : TILE_H

  // حساب المسافة بدقة من السنتر للسنتر
  let spacing = GAP
  if (currentDir === 'right' || currentDir === 'left') {
    spacing += (targetCurrentWidth / 2) + (tileWidth / 2)
  } else {
    spacing += (targetCurrentHeight / 2) + (tileHeight / 2)
  }

  // تطبيق الخطوة خطياً أولاً
  if (currentDir === 'right') nextX += spacing
  else if (currentDir === 'left') nextX -= spacing
  else if (currentDir === 'down') nextY += spacing

  // فحص حواف اللوحة للالتفاف الذكي بناءً على رقم الصف
  const outOfRightBound = currentDir === 'right' && nextX + (tileWidth / 2) > AVAILABLE_W
  const outOfLeftBound = currentDir === 'left' && nextX - (tileWidth / 2) < -AVAILABLE_W

  if (outOfRightBound || outOfLeftBound) {
    currentRow += 1 // الانتقال لصف جديد
    newDir = 'down' // النزول لأسفل خطوة واحدة
    nextX = targetTile.x // النزول من نفس محاذاة القطعة الأخيرة تماماً لعمل زاوية قائمة
    nextY = targetTile.y + GAP + (targetCurrentHeight / 2) + (isHorizontal ? TILE_W / 2 : TILE_H / 2)
  } 
  // إذا نزلنا بالفعل خطوة واحدة في اللعب السابق، نحدد الاتجاه الأفقي الجديد بناءً على كون الصف زوجي أم فردي
  else if (currentDir === 'down') {
    newDir = currentRow % 2 === 0 ? 'right' : 'left'
  }

  // الدبل يوضع متعامداً دائماً
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

export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'قطعة غير صالحة' }
  if (!canPlayTile(tile, state.board, end)) return { valid: false, message: 'حركة غير قانونية' }

  const isDouble = tile.top === tile.bottom
  const position = calculateNextPosition(state, tile, end, isDouble)

  let startVal: number, endVal: number
  if (state.board.length === 0) {
    startVal = tile.top
    endVal = tile.bottom
  } else if (end === 'left') {
    const { leftValue } = getBoardEnds(state.board)
    startVal = tile.top === leftValue ? tile.bottom : tile.top
    endVal = leftValue 
  } else {
    const { rightValue } = getBoardEnds(state.board)
    startVal = rightValue
    endVal = tile.top === rightValue ? tile.bottom : tile.top
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

  if (calculateAllFivesScore(newBoard) > 0) {
    newPlayers[playerIndex].score += calculateAllFivesScore(newBoard)
  }

  const isGameOver = newHand.length === 0

  let updatedLeftHead = state.leftHead
  let updatedRightHead = state.rightHead

  if (state.board.length === 0) {
    // إعداد أولي للرؤوس باتجاهات متعاكسة أفقياً
    updatedLeftHead = { x: 0, y: 0, direction: 'left', row: 0 }
    updatedRightHead = { x: 0, y: 0, direction: 'right', row: 0 }
  } else if (end === 'left') {
    updatedLeftHead = position.newHead
  } else {
    updatedRightHead = position.newHead
  }

  // تحديث أبعاد الـ Canvas ديناميكياً لتفادي مشكلة الـ Absolute
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

// ... بقية دوال السحب والألعاب الافتراضية كما هي ...

export const createInitialState = (playerNames: string[], playerAvatars: string[]): GameState => {
  const stock = createDominoSet()
  const players = createPlayers(playerNames, playerAvatars)
  const { players: dealtPlayers, stock: remainingStock } = dealTiles(players, stock)

  return {
    board: [],
    players: dealtPlayers,
    currentPlayerIndex: 0,
    stock: remainingStock,
    round: 1,
    isGameOver: false,
    winner: null,
    lastMove: null,
    isBlocked: false,
    leftHead: { x: 0, y: 0, direction: 'left', row: 0 },
    rightHead: { x: 0, y: 0, direction: 'right', row: 0 },
    bounds: { minX: -400, maxX: 400, minY: -300, maxY: 300 } // حدود افتراضية أولية مريحة
  }
}
