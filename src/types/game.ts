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

export interface DominoTile {
  top: number
  bottom: number
  id: string
}

export type TileEnd = 'left' | 'right'

export interface GameState {
  board: DominoTile[]
  players: {
    name: string
    avatar: string
    hand: DominoTile[]
    score: number
  }[]
  currentPlayer: number
  stock: DominoTile[]
  isGameOver: boolean
  winner: number | null
  leftEnd: number
  rightEnd: number
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
