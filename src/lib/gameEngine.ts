import { DominoTile, Player, GameState, TileEnd, MoveResult, BoardTile } from '@/types/game'

// ============================================================
// ⚠️ ملاحظة مهمة عن الأنواع (Types)
// ============================================================
// هذا الإصلاح يحتاج حقلين اختياريين إضافيين على BoardTile في types/game.ts:
//
//   export interface BoardTile extends DominoTile {
//     x: number
//     y: number
//     rotation: 0 | 90 | 180 | 270
//     isLeft: boolean
//     runDir?: 'left' | 'right'   // اتجاه الصف الأفقي الذي تنتمي له هذه القطعة
//     isTurn?: boolean            // هل هذه قطعة "التفاف" عمودية تربط بين صفين
//   }
//
// كلا الحقلين اختياري (optional) فلن يكسر أي كود آخر يستخدم BoardTile.

// ============================================================
// CONSTANTS - Board Layout
// ============================================================
const TILE_W = 36       // عرض الجانب الضيق (عرض القطعة المزدوجة/العمودية)
const TILE_H = 72       // طول القطعة (الجانب الطويل)
const GAP = 2            // فجوة صغيرة بين القطع
const AVAILABLE_W = 140  // نصف العرض المتاح تقريبًا (محافظ، مناسب للجوال)

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

  // بعد calculateTileValues:
  // قطعة الطرف الأيسر: top = مفتوح (للخارج)، bottom = متصل بالسلسلة
  // قطعة الطرف الأيمن: top = متصل بالسلسلة، bottom = مفتوح (للخارج)
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
    // القطع المزدوجة دائمًا عمودية
    return { width: TILE_W, height: TILE_H }
  }
  if (rotation === 0 || rotation === 180) {
    // عمودية (قطعة أول اللعب أو قطعة التفاف)
    return { width: TILE_W, height: TILE_H }
  }
  // أفقية (90 أو 270)
  return { width: TILE_H, height: TILE_W }
}

// ============================================================
// SNAKE LAYOUT ENGINE (تمت إعادة كتابته بالكامل)
// ============================================================
// الفكرة: كل قطعة على الطاولة تحمل معها معلومتين توضحان "حالة" الصف الذي
// تنتمي إليه: اتجاه الحركة الأفقية الحالي (runDir) وهل هي قطعة التفاف
// عمودية تفصل بين صفّين (isTurn). بهذه الطريقة، عند حساب موضع القطعة
// التالية، لا نخمّن أي شيء أبدًا — نقرأ الحالة مباشرة من آخر قطعة على
// نفس الطرف (يسار/يمين) ونعرف بالضبط: هل نكمل نفس الصف أفقيًا، أم نلتف
// لصف جديد وننعكس الاتجاه (يمين↔يسار) — تمامًا كحركة الثعبان الحقيقية.

function getEdgeTile(board: BoardTile[], end: TileEnd): BoardTile | null {
  if (board.length === 0) return null
  return end === 'right' ? board[board.length - 1] : board[0]
}

function computeNextTilePosition(
  board: BoardTile[],
  end: TileEnd,
  isDouble: boolean
): { x: number; y: number; rotation: 0 | 90 | 180 | 270; runDir: 'left' | 'right'; isTurn: boolean } {

  // أول قطعة على الطاولة: توضع في المنتصف وبشكل عمودي
  if (board.length === 0) {
    return { x: 0, y: 0, rotation: 0, runDir: end === 'right' ? 'right' : 'left', isTurn: false }
  }

  const edgeTile = getEdgeTile(board, end)!
  const edgeIsDouble = edgeTile.top === edgeTile.bottom
  const edgeDims = getTileDimensions(edgeTile.rotation, edgeIsDouble)

  // اتجاه الصف الحالي على هذا الطرف. القطعة المركزية الأولى مشتركة بين
  // الطرفين ولا تحمل runDir بعد، لذا نستخدم الاتجاه الطبيعي كقيمة افتراضية.
  const runDir: 'left' | 'right' = edgeTile.runDir ?? (end === 'right' ? 'right' : 'left')
  const sign = runDir === 'right' ? 1 : -1

  const newWidth = isDouble ? TILE_W : TILE_H
  const newHeight = isDouble ? TILE_H : TILE_W

  // إذا كانت القطعة الطرفية الحالية قطعة "التفاف" عمودية، فنحن نبدأ صفًا
  // جديدًا من هنا، بالاتجاه المخزَّن فيها (وهو الاتجاه المعكوس أصلًا).
  const startX = edgeTile.x
  const startWidthHalf = edgeDims.width / 2

  const newX = startX + sign * (startWidthHalf + GAP + newWidth / 2)
  const withinBound = Math.abs(newX) + newWidth / 2 <= AVAILABLE_W

  if (withinBound) {
    // نكمل في نفس الصف الأفقي
    return {
      x: newX,
      y: edgeTile.y,
      rotation: isDouble ? 0 : (runDir === 'right' ? 90 : 270),
      runDir,
      isTurn: false,
    }
  }

  // وصلنا لحافة العرض المتاح: ننزل صفًا جديدًا للأسفل ونعكس الاتجاه
  return {
    x: edgeTile.x,
    y: edgeTile.y + edgeDims.height / 2 + GAP + newHeight / 2,
    rotation: 0, // قطعة الالتفاف دائمًا عمودية بصريًا
    runDir: runDir === 'right' ? 'left' : 'right',
    isTurn: true,
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
    // على الطرف الأيسر: الرقم المطابق → أسفل (متصل بالسلسلة نحو اليمين)
    // الرقم المفتوح → أعلى (للخارج نحو اليسار)
    if (tile.bottom === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  } else {
    // على الطرف الأيمن: الرقم المطابق → أعلى (متصل بالسلسلة نحو اليسار)
    // الرقم المفتوح → أسفل (للخارج نحو اليمين)
    if (tile.top === connectValue) {
      return { top: tile.top, bottom: tile.bottom, flipped: false }
    }
    return { top: tile.bottom, bottom: tile.top, flipped: true }
  }
}

// ============================================================
// PLAY TILE - محرك ثعبان صحيح ومستقر
// ============================================================
export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]

  if (!tile) return { valid: false, message: 'Invalid tile' }
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }

  const isDouble = tile.top === tile.bottom

  // حساب الموضع باستخدام محرك الثعبان الجديد
  const position = computeNextTilePosition(state.board, end, isDouble)

  // حساب القيم (top/bottom) بعد التوصيل
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
    runDir: position.runDir,
    isTurn: position.isTurn,
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
    const playersWithBonus = applyGoingOutBonus(newPlayers, playerIndex)
    return {
      valid: true,
      newState: {
        ...state,
        board: newBoard,
        players: playersWithBonus,
        isGameOver: true,
        winner: playersWithBonus[playerIndex],
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

  const leftTile = board[0]
  const rightTile = board[board.length - 1]
  const leftIsDouble = leftTile.top === leftTile.bottom
  const rightIsDouble = rightTile.top === rightTile.bottom

  // في نظام All Fives: القطعة المزدوجة الواقعة على أحد الطرفين المفتوحين
  // تُحسب مرتين (كلا نصفيها مكشوف فعليًا)، وليس مرة واحدة فقط.
  const leftValue = leftTile.top * (leftIsDouble ? 2 : 1)
  const rightValue = rightTile.bottom * (rightIsDouble ? 2 : 1)

  const total = leftValue + rightValue
  return total > 0 && total % 5 === 0 ? total : 0
}

// عند إفراغ يده (domino out)، تُضاف له مجموع نقاط بقية اللاعبين كمكافأة قياسية
export const applyGoingOutBonus = (players: Player[], winnerIndex: number): Player[] => {
  const bonus = players.reduce((sum, p, i) => i === winnerIndex ? sum : sum + calculateScore(p.hand), 0)
  return players.map((p, i) => i === winnerIndex ? { ...p, score: p.score + bonus } : p)
}

// عند انسداد اللعبة: صاحب أقل مجموع نقاط في يده يفوز، ويُضاف له مجموع نقاط بقية اللاعبين
export const applyBlockedGameScoring = (state: GameState): GameState => {
  const winner = getBlockedWinner(state)
  if (!winner) return state // تعادل: لا نقاط تُضاف لأحد
  const winnerIndex = state.players.findIndex(p => p.id === winner.id)
  if (winnerIndex === -1) return state
  return { ...state, players: applyGoingOutBonus(state.players, winnerIndex) }
}

// ============================================================
// STARTING PLAYER
// ============================================================
// القاعدة الرسمية: يبدأ صاحب أعلى قطعة مزدوجة (المثالي: 6|6). إن لم تكن
// هناك أي قطعة مزدوجة في أي يد إطلاقًا (احتمال نادر لكنه وارد)، يبدأ
// صاحب أعلى مجموع نقاط في قطعة واحدة كقاعدة احتياطية بدل الافتراض التعسفي
// للاعب رقم 0.
function findStartingPlayer(players: Player[]): number {
  let starter = 0
  let highestDouble = -1
  for (let i = 0; i < players.length; i++) {
    for (const tile of players[i].hand) {
      if (tile.top === tile.bottom && tile.top > highestDouble) {
        highestDouble = tile.top
        starter = i
      }
    }
  }
  if (highestDouble >= 0) return starter

  let highestPipSum = -1
  for (let i = 0; i < players.length; i++) {
    for (const tile of players[i].hand) {
      const sum = tile.top + tile.bottom
      if (sum > highestPipSum) {
        highestPipSum = sum
        starter = i
      }
    }
  }
  return starter
}

// للجولة الأولى فقط تُطبَّق قاعدة "أعلى مزدوجة يبدأ". أما ابتداءً من
// الجولة الثانية، الفائز بالجولة السابقة هو من يبدأ (بأي قطعة يختارها).
export const createNextRoundState = (state: GameState, previousWinnerIndex: number): GameState => {
  const stock = createDominoSet()
  const { players: dealtPlayers, stock: remainingStock } = dealTiles(state.players, stock)

  return {
    ...state,
    board: [],
    players: dealtPlayers,
    currentPlayerIndex: previousWinnerIndex,
    stock: remainingStock,
    round: state.round + 1,
    isGameOver: false,
    winner: null,
    lastMove: null,
    isBlocked: false,
  }
}

// ============================================================
// INITIALIZE GAME
// ============================================================
export const createInitialState = (playerNames: string[], playerAvatars: string[]): GameState => {
  const stock = createDominoSet()
  const players = createPlayers(playerNames, playerAvatars)
  const { players: dealtPlayers, stock: remainingStock } = dealTiles(players, stock)

  const starter = findStartingPlayer(dealtPlayers)

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
