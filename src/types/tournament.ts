export type TournamentSize = 4 | 8 | 16
export type TournamentStage = 'registration' | 'bracket' | 'match' | 'result' | 'champion'
export type MatchStatus = 'pending' | 'playing' | 'completed' | 'bye'

export interface TournamentPlayer {
  id: string
  name: string
  avatar: string
  seed: number
  isAI: boolean
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

export interface TournamentMatch {
  id: string
  round: number
  matchNumber: number
  player1: TournamentPlayer | null
  player2: TournamentPlayer | null
  winner: TournamentPlayer | null
  status: MatchStatus
  player1Score: number
  player2Score: number
  targetScore: number
}

export interface TournamentRound {
  roundNumber: number
  roundName: string
  matches: TournamentMatch[]
}

export interface TournamentState {
  id: string
  name: string
  size: TournamentSize
  stage: TournamentStage
  players: TournamentPlayer[]
  rounds: TournamentRound[]
  currentRound: number
  currentMatch: number
  champion: TournamentPlayer | null
  createdAt: string
  completedAt: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  gameMode: 'classic' | 'points' | 'block' | 'allFives' | 'draw'
  targetScore: number
}

export interface TournamentHistoryEntry {
  id: string
  name: string
  size: TournamentSize
  champion: string
  completedAt: string
  totalMatches: number
  playerMatches: number
  playerWins: number
}

export const TOURNAMENT_SIZE_CONFIG: Record<TournamentSize, { label: string; rounds: string[] }> = {
  4: {
    label: 'بطولة 4 لاعبين',
    rounds: ['نصف النهائي', 'النهائي'],
  },
  8: {
    label: 'بطولة 8 لاعبين',
    rounds: ['دور الـ8', 'نصف النهائي', 'النهائي'],
  },
  16: {
    label: 'بطولة 16 لاعب',
    rounds: ['دور الـ16', 'ربع النهائي', 'نصف النهائي', 'النهائي'],
  },
}
