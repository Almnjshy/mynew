export type TileEnd = 'left' | 'right'
export type Direction = 'right' | 'left' | 'up' | 'down'

export interface DominoTile {
  id: string
  top: number
  bottom: number
}

export interface BoardTile extends DominoTile {
  x: number
  y: number
  rotation: 0 | 90 | 180 | 270
  isLeft: boolean
  startValue: number
  endValue: number
}

export interface PathHead {
  x: number
  y: number
  direction: Direction
  row: number // تتبع رقم الصف الحالي للالتفاف اللانهائي الصحيح
}

export interface BoardBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface Player {
  id: string
  name: string
  avatar: string
  hand: DominoTile[]
  score: number
  isAI: boolean
}

export interface GameState {
  board: BoardTile[]
  players: Player[]
  currentPlayerIndex: number
  stock: DominoTile[]
  round: number
  isGameOver: boolean
  winner: Player | null
  lastMove: { playerId: string; tile: BoardTile; end: TileEnd } | null
  isBlocked: boolean
  leftHead: PathHead
  rightHead: PathHead
  bounds: BoardBounds // لحل مشكلة الـ Canvas والديناميكية
}

export interface MoveResult {
  valid: boolean
  message?: string
  newState?: GameState
}
