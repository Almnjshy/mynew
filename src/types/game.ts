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
}

export type GameScreen = 
  | 'title' 
  | 'menu' 
  | 'levelSelect' 
  | 'game' 
  | 'matchEnd' 
  | 'settings' 
  | 'statistics'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  difficulty: Difficulty
  showHints: boolean
}

export interface GameStatistics {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  totalScore: number
  highestScore: number
  streak: number
}

export type TileEnd = 'left' | 'right'

export interface MoveResult {
  valid: boolean
  message?: string
  newState?: GameState
}