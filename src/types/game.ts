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
  aiCount: number
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
  name: string
  score: number
  avatar: string
  date: string
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

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: AchievementCondition
  unlockedAt: string | null
  progress: number
  maxProgress: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface AchievementCondition {
  type: 'wins' | 'games_played' | 'streak' | 'clean_win' | 'crushing_win' | 'moves' | 'draws' | 'comeback'
  value: number
}

export interface AchievementProgress {
  totalWins: number
  totalGames: number
  currentStreak: number
  bestStreak: number
  cleanWins: number
  crushingWins: number
  fastestWinMoves: number
  totalDraws: number
  comebacks: number
}

export interface MatchState {
  round: number
  playerScore: number
  aiScore: number
  targetScore: number
  scores: { player: number; ai: number }[]
  playerTotal: number
  opponentTotal: number
}

// ============================================================
// CONNECTED DOMINO BOARD - Each tile connects to adjacent tiles
// startValue = the number facing the center of the chain (connected side)
// endValue = the number facing outward (open end)
// ============================================================
export interface BoardTile extends DominoTile {
  // Position on the board canvas (absolute coordinates)
  x: number
  y: number
  // Rotation: 0 = vertical, 90 = horizontal right, 180 = vertical flipped, 270 = horizontal left
  rotation: number
  // Which end of the domino chain this tile was played on
  isLeft: boolean
  // The value facing the inside of the chain (connected to adjacent tile)
  startValue: number
  // The value facing the outside of the chain (open for new connections)
  endValue: number
}

export interface DominoTile {
  top: number      // Number on top half (0-6)
  bottom: number   // Number on bottom half (0-6)
  id: string       // Unique identifier
}

export type TileEnd = 'left' | 'right'

export interface PathHead {
  x: number
  y: number
  direction: 'right' | 'left' | 'up' | 'down'
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
  // Snake layout tracking - tracks the open ends of the chain
  leftHead: PathHead
  rightHead: PathHead
  // Bounds for the board canvas
  bounds: BoardBounds
}

export interface MoveResult {
  valid: boolean
  message?: string
  newState?: GameState
}

export const TIMER_CONFIG: Record<TimerMode, { time: number; label: string }> = {
  off: { time: 0, label: 'بدون' },
  blitz: { time: 15, label: 'سريع' },
  rapid: { time: 30, label: 'متوسط' },
  custom: { time: 0, label: 'مخصص' },
}

export const GAME_MODE_CONFIG: Record<GameMode, { label: string; desc: string }> = {
  classic: { label: 'كلاسيكي', desc: 'الأول ينتهي يفوز' },
  points: { label: 'نقاط', desc: 'وصل الهدف أولاً' },
  block: { label: 'بلوك', desc: 'منع الخصم' },
  allFives: { label: 'الخمسات', desc: 'مجموع 5 يعطي نقاط' },
  draw: { label: 'السحب', desc: 'اسحب من المخزون' },
}

// Screen types including tournament screens
export type Screen = 
  | 'title' | 'menu' | 'levelSelect' | 'game' | 'matchEnd' 
  | 'settings' | 'statistics' | 'achievements' | 'history' 
  | 'profile' | 'leaderboard' | 'wifiGame' | 'onlineGame'
  | 'tournamentMenu' | 'tournamentCreate' | 'tournamentBracket' 
  | 'tournamentGame' | 'tournamentHistory'
