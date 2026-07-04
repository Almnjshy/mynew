export interface DominoTile {
  top: number
  bottom: number
  id: string
}

export interface Player {
  id: string
  name: string
  avatar: string
  hand: DominoTile[]
  isAI: boolean
  score: number
}

export interface GameState {
  board: DominoTile[]
  players: Player[]
  currentPlayerIndex: number
  stock: DominoTile[]
  round: number
  isGameOver: boolean
  winner: Player | null
  lastMove: { playerId: string; tile: DominoTile; end: 'left' | 'right' } | null
  isBlocked: boolean
}

export type GameScreen = 
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

export type Difficulty = 'easy' | 'medium' | 'hard'

export type GameMode = 'classic' | 'points' | 'block' | 'allFives' | 'draw'

export type TimerMode = 'off' | 'blitz' | 'rapid' | 'custom'

export interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  difficulty: Difficulty
  showHints: boolean
  gameMode: GameMode
  targetScore: number
  timerMode: TimerMode
  customTime: number
}

export interface GameStatistics {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  totalScore: number
  highestScore: number
  streak: number
}

export interface MatchScore {
  round: number
  playerScore: number
  opponentScore: number
}

export interface MatchState {
  scores: MatchScore[]
  playerTotal: number
  opponentTotal: number
  targetScore: number
  isMatchOver: boolean
  matchWinner: string | null
}

export interface GameRecord {
  id: string
  date: string
  playerName: string
  opponentName: string
  result: 'win' | 'loss' | 'draw'
  gameMode: GameMode
  difficulty: Difficulty
  rounds: number
  playerScore: number
  opponentScore: number
  targetScore?: number
  duration?: number
}

export interface LeaderboardEntry {
  id: string
  playerName: string
  playerAvatar: string
  score: number
  gameMode: GameMode
  difficulty: Difficulty
  date: string
  moves: number
  winStreak: number
}

export type TileEnd = 'left' | 'right'

export interface MoveResult {
  valid: boolean
  message?: string
  newState?: GameState
}

export const TIMER_CONFIG: Record<TimerMode, { label: string; time: number; icon: string }> = {
  off: { label: 'بدون زمن', time: 0, icon: '∞' },
  blitz: { label: 'سريع (30 ث)', time: 30, icon: '⚡' },
  rapid: { label: 'متوسط (60 ث)', time: 60, icon: '⏱️' },
  custom: { label: 'مخصص', time: 0, icon: '⚙️' },
}

export const GAME_MODE_CONFIG: Record<GameMode, { label: string; desc: string; icon: string }> = {
  classic: { label: 'كلاسيكي', desc: 'جولة واحدة = فوز', icon: '🎯' },
  points: { label: 'بالنقاط', desc: 'الوصول للهدف أولاً', icon: '🏆' },
  block: { label: 'الحظر', desc: 'لا سحب - تخطي الدور', icon: '🚫' },
  allFives: { label: 'الخمسات', desc: 'نقاط عند مجموع 5', icon: '5️⃣' },
  draw: { label: 'السحب', desc: 'سحب حتى اللعب', icon: '🎲' },
}
