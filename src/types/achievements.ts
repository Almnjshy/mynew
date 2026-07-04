export type AchievementId =
  | 'first_win'
  | 'pro_player'
  | 'legend'
  | 'clean_win'
  | 'crushing_win'
  | 'streak_5'
  | 'warrior'
  | 'speedster'
  | 'comeback'
  | 'draw_master'

export interface Achievement {
  id: AchievementId
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
