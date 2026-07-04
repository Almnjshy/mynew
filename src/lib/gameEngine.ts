import { DominoTile, Player, GameState, TileEnd, MoveResult } from '@/types/game'

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

export const createPlayers = (count: number): Player[] => {
  const names = ['أنت', 'الكمبيوتر 1', 'الكمبيوتر 2', 'الكمبيوتر 3']
  const avatars = [
    '/assets/avatar_player.png',
    '/assets/avatar_ai.png',
    '/assets/avatar_ai.png',
    '/assets/avatar_ai.png'
  ]
  
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: names[i] || `لاعب ${i + 1}`,
    avatar: avatars[i] || '/assets/avatar_ai.png',
    hand: [],
    isAI: i !== 0,
    score: 0,
  }))
}

export const dealTiles = (players: Player[], stock: DominoTile[]): { players: Player[]; stock: DominoTile[] } => {
  const newPlayers = players.map(p => ({ ...p, hand: [] as DominoTile[] }))
  const newStock = [...stock]
  
  const tilesPerPlayer = players.length === 2 ? 7 : players.length === 3 ? 6 : 5
  
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

export const canPlayTile = (tile: DominoTile, board: DominoTile[], end: TileEnd): boolean => {
  if (board.length === 0) return true
  
  const leftEnd = board[0].top
  const rightEnd = board[board.length - 1].bottom
  
  if (end === 'left') {
    return tile.top === leftEnd || tile.bottom === leftEnd
  } else {
    return tile.top === rightEnd || tile.bottom === rightEnd
  }
}

export const getValidEnds = (tile: DominoTile, board: DominoTile[]): TileEnd[] => {
  if (board.length === 0) return ['left']
  const ends: TileEnd[] = []
  if (canPlayTile(tile, board, 'left')) ends.push('left')
  if (canPlayTile(tile, board, 'right')) ends.push('right')
  return ends
}

export const playTile = (state: GameState, playerIndex: number, tileIndex: number, end: TileEnd): MoveResult => {
  const player = state.players[playerIndex]
  const tile = player.hand[tileIndex]
  
  if (!tile) return { valid: false, message: 'Invalid tile' }
  
  if (!canPlayTile(tile, state.board, end)) {
    return { valid: false, message: 'لا يمكن اللعب بهذه القطعة هنا' }
  }
  
  const newBoard = [...state.board]
  const newHand = [...player.hand]
  const playedTile = newHand.splice(tileIndex, 1)[0]
  
  if (newBoard.length === 0) {
    newBoard.push(playedTile)
  } else if (end === 'left') {
    const leftEnd = newBoard[0].top
    if (playedTile.bottom !== leftEnd) {
      const temp = playedTile.top
      playedTile.top = playedTile.bottom
      playedTile.bottom = temp
    }
    newBoard.unshift(playedTile)
  } else {
    const rightEnd = newBoard[newBoard.length - 1].bottom
    if (playedTile.top !== rightEnd) {
      const temp = playedTile.top
      playedTile.top = playedTile.bottom
      playedTile.bottom = temp
    }
    newBoard.push(playedTile)
  }
  
  const newPlayers = [...state.players]
  newPlayers[playerIndex] = { ...player, hand: newHand }
  
  if (newHand.length === 0) {
    return {
      valid: true,
      newState: {
        ...state,
        board: newBoard,
        players: newPlayers,
        isGameOver: true,
        winner: newPlayers[playerIndex],
      }
    }
  }
  
  const nextPlayer = (playerIndex + 1) % state.players.length
  
  return {
    valid: true,
    newState: {
      ...state,
      board: newBoard,
      players: newPlayers,
      currentPlayerIndex: nextPlayer,
      lastMove: { playerId: player.id, tile: playedTile, end }
    }
  }
}

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

export const calculateScore = (hand: DominoTile[]): number => {
  return hand.reduce((sum, tile) => sum + tile.top + tile.bottom, 0)
}

export const createInitialState = (playerCount: number): GameState => {
  const stock = createDominoSet()
  const players = createPlayers(playerCount)
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
  }
}

export const getAIMove = (state: GameState, difficulty: string, playerIndex: number): { tileIndex: number; end: TileEnd } | null => {
  const ai = state.players[playerIndex]
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
  
  validMoves.sort((a, b) => {
    const tileA = ai.hand[a.tileIndex]
    const tileB = ai.hand[b.tileIndex]
    const scoreA = (tileA.top === tileA.bottom ? 10 : 0) + tileA.top + tileA.bottom
    const scoreB = (tileB.top === tileB.bottom ? 10 : 0) + tileB.top + tileB.bottom
    return scoreB - scoreA
  })
  
  return difficulty === 'hard' ? validMoves[0] : validMoves[Math.floor(Math.random() * Math.min(3, validMoves.length))]
}

export const checkBlockedGame = (state: GameState): boolean => {
  if (state.stock.length > 0) return false
  
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (getValidEnds(tile, state.board).length > 0) {
        return false
      }
    }
  }
  
  return true
}

export const getWinnerByScore = (state: GameState): Player => {
  return state.players.reduce((best, player) => {
    const bestScore = calculateScore(best.hand)
    const playerScore = calculateScore(player.hand)
    return playerScore < bestScore ? player : best
  })
}
