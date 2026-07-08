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
  top: number
  bottom: number
}

export interface PathHead {
  x: number
  y: number
  direction: Direction
  row: number
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
  bounds: BoardBounds
}

export interface MoveResult {
  valid: boolean
  message?: string
  newState?: GameState
}

export const TIMER_CONFIG = {
  off: { label: 'بدون مؤقت', time: 0 },
  standard: { label: 'قياسي', time: 60 },
  fast: { label: 'سريع', time: 30 },
  blitz: { label: 'خاطف', time: 15 },
  custom: { label: 'مخصص', time: 60 },
}

export const GAME_MODE_CONFIG = {
  classic: { label: 'كلاسيك', icon: '🎯', description: 'العب حتى نفاذ القطع.' },
  points: { label: 'نقاط', icon: '📊', description: 'العب لعدد محدد من الجولات.' },
  block: { label: 'حظر', icon: '🚫', description: 'بدون سحب.' },
  allFives: { label: 'الخمسات', icon: '⭐', description: 'احصل على نقاط إضافية.' },
  draw: { label: 'سحب', icon: '🔄', description: 'اسحب القطع من المخزن.' },
}