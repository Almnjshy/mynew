export type TileEnd = 'left' | 'right'
export type Direction = 'right' | 'left' | 'up' | 'down'
export type GameMode = 'classic' | 'points' | 'block' | 'allFives' | 'draw'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type TimerMode = 'off' | 'standard' | 'fast' | 'blitz' | 'custom'

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

// ============================================================
// المفاتيح المفقودة التي كانت تسبب فشل الـ Build
// ============================================================
export const TIMER_CONFIG: Record<TimerMode, { label: string; time: number }> = {
  off: { label: 'بدون مؤقت', time: 0 },
  standard: { label: 'قياسي (60 ثانية)', time: 60 },
  fast: { label: 'سريع (30 ثانية)', time: 30 },
  blitz: { label: 'خاطف (15 ثانية)', time: 15 },
  custom: { label: 'مخصص', time: 60 },
}

export const GAME_MODE_CONFIG: Record<GameMode, { label: string; icon: string; description: string }> = {
  classic: { label: 'كلاسيك', icon: '🎯', description: 'العب حتى نفاذ القطع. الأقل نقاطاً يفوز.' },
  points: { label: 'نقاط', icon: '📊', description: 'العب لعدد محدد من الجولات.' },
  block: { label: 'حظر', icon: '🚫', description: 'بدون سحب. إذا توقفت اللعبة، يفوز الأقل نقاطاً.' },
  allFives: { label: 'الخمسات', icon: '⭐', description: 'احصل على نقاط إضافية عند جعل الأطراف من مضاعفات الرقم 5.' },
  draw: { label: 'سحب', icon: '🔄', description: 'اسحب القطع من المخزن عند عدم القدرة على اللعب.' },
}