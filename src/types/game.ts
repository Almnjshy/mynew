export type TileEnd = 'left' | 'right'
export type Direction = 'right' | 'left' | 'up' | 'down'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameMode = 'classic' | 'points' | 'block' | 'allFives' | 'draw'
export type TimerMode = 'off' | 'standard' | 'fast' | 'blitz' | 'custom'

export type Screen = 
  | 'title' 
  | 'menu' 
  | 'levelSelect' 
  | 'game' 
  | 'matchEnd' 
  | 'settings' 
  | 'statistics' 
  | 'achievements' 
  | 'history' 
  | 'profile' 
  | 'leaderboard' 
  | 'wifiGame' 
  | 'onlineGame'
  | 'tournamentMenu'
  | 'tournamentCreate'
  | 'tournamentBracket'
  | 'tournamentGame'
  | 'tournamentHistory'

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

export interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  difficulty: Difficulty
  showHints: boolean
  gameMode: GameMode
  targetScore: number
  timerMode: TimerMode
  customTime: number
  aiCount: number
}

export interface Statistics {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  totalScore: number
  highestScore: number
  totalTime: number
  bestTime: number
  draws: number
  winStreak: number
  bestWinStreak: number
}

export interface GameRecord {
  id: string
  date: string
  playerName: string
  opponentName: string
  playerScore: number
  opponentScore: number
  won: boolean
  gameMode: GameMode
  moves: number
  duration: number
}

export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  score: number
  date: string
  gameMode: GameMode
}

export interface MatchState {
  round: number
  playerScore: number
  aiScore: number
  targetScore: number
  scores: { player: number; ai: number }[]
  playerTotal: number
  opponentTotal: number
  isMatchOver: boolean
  matchWinner: string | null
}

export const TIMER_CONFIG: Record<TimerMode, { label: string; time: number; icon?: string }> = {
  off: { label: 'بدون مؤقت', time: 0, icon: '⏸️' },
  standard: { label: 'قياسي', time: 60, icon: '⏱️' },
  fast: { label: 'سريع', time: 30, icon: '⚡' },
  blitz: { label: 'خاطف', time: 15, icon: '🔥' },
  custom: { label: 'مخصص', time: 60, icon: '⚙️' },
}

export const GAME_MODE_CONFIG: Record<GameMode, { label: string; icon: string; description: string }> = {
  classic: { label: 'كلاسيك', icon: '🎯', description: 'العب حتى نفاذ القطع.' },
  points: { label: 'نقاط', icon: '📊', description: 'العب لعدد محدد من الجولات.' },
  block: { label: 'حظر', icon: '🚫', description: 'بدون سحب.' },
  allFives: { label: 'الخمسات', icon: '⭐', description: 'احصل على نقاط إضافية.' },
  draw: { label: 'سحب', icon: '🔄', description: 'اسحب القطع من المخزن.' },
}
