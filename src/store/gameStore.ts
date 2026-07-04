import { create } from 'zustand'
import { GameScreen, GameSettings, GameStatistics, Difficulty, MatchState, GameRecord, TimerMode, LeaderboardEntry } from '@/types/game'
import { Achievement, AchievementProgress } from '@/types/achievements'
import { DEFAULT_ACHIEVEMENTS, checkAchievements } from '@/lib/achievements'

interface GameStore {
  screen: GameScreen
  settings: GameSettings
  statistics: GameStatistics
  achievements: Achievement[]
  achievementProgress: AchievementProgress
  lastUnlocked: string[]
  playerName: string
  playerAvatar: string
  matchState: MatchState | null
  gameHistory: GameRecord[]
  leaderboard: LeaderboardEntry[]

  setScreen: (screen: GameScreen) => void
  updateSettings: (settings: Partial<GameSettings>) => void
  updateStatistics: (stats: Partial<GameStatistics>) => void
  resetStatistics: () => void

  updateAchievementProgress: (progress: Partial<AchievementProgress>) => void
  clearLastUnlocked: () => void
  setPlayerName: (name: string) => void
  setPlayerAvatar: (avatar: string) => void

  initMatchState: (targetScore: number) => void
  addRoundScore: (playerScore: number, opponentScore: number) => void
  resetMatchState: () => void

  addGameRecord: (record: GameRecord) => void
  clearHistory: () => void

  addLeaderboardEntry: (entry: LeaderboardEntry) => void
  clearLeaderboard: () => void
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

const saveToStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'title',
  settings: loadFromStorage('domino_settings', {
    soundEnabled: true,
    musicEnabled: true,
    difficulty: 'medium' as Difficulty,
    showHints: false,
    gameMode: 'classic' as const,
    targetScore: 100,
    timerMode: 'off' as TimerMode,
    customTime: 120,
  }),
  statistics: loadFromStorage('domino_stats', {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalScore: 0,
    highestScore: 0,
    streak: 0,
  }),
  achievements: loadFromStorage('domino_achievements', DEFAULT_ACHIEVEMENTS),
  achievementProgress: loadFromStorage('domino_achievement_progress', {
    totalWins: 0,
    totalGames: 0,
    currentStreak: 0,
    bestStreak: 0,
    cleanWins: 0,
    crushingWins: 0,
    fastestWinMoves: 999,
    totalDraws: 0,
    comebacks: 0,
  }),
  lastUnlocked: [],
  playerName: loadFromStorage('domino_player_name', 'أنت'),
  playerAvatar: loadFromStorage('domino_player_avatar', '/assets/avatar_player.png'),
  matchState: null,
  gameHistory: loadFromStorage('domino_history', []),
  leaderboard: loadFromStorage('domino_leaderboard', []),

  setScreen: (screen) => set({ screen }),

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings }
    set({ settings: updated })
    saveToStorage('domino_settings', updated)
  },

  updateStatistics: (newStats) => {
    const current = get().statistics
    const updated = {
      ...current,
      gamesPlayed: current.gamesPlayed + (newStats.gamesPlayed || 0),
      gamesWon: current.gamesWon + (newStats.gamesWon || 0),
      gamesLost: current.gamesLost + (newStats.gamesLost || 0),
      totalScore: current.totalScore + (newStats.totalScore || 0),
      highestScore: Math.max(current.highestScore, newStats.totalScore || 0),
      streak: newStats.gamesWon ? current.streak + 1 : 0,
    }
    set({ statistics: updated })
    saveToStorage('domino_stats', updated)
  },

  resetStatistics: () => {
    const empty = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalScore: 0,
      highestScore: 0,
      streak: 0,
    }
    set({ 
      statistics: empty,
      achievements: DEFAULT_ACHIEVEMENTS,
      achievementProgress: {
        totalWins: 0,
        totalGames: 0,
        currentStreak: 0,
        bestStreak: 0,
        cleanWins: 0,
        crushingWins: 0,
        fastestWinMoves: 999,
        totalDraws: 0,
        comebacks: 0,
      },
      lastUnlocked: [],
      matchState: null,
      gameHistory: [],
      leaderboard: [],
    })
    saveToStorage('domino_stats', empty)
    saveToStorage('domino_achievements', DEFAULT_ACHIEVEMENTS)
    saveToStorage('domino_achievement_progress', {
      totalWins: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0,
      cleanWins: 0,
      crushingWins: 0,
      fastestWinMoves: 999,
      totalDraws: 0,
      comebacks: 0,
    })
    saveToStorage('domino_history', [])
    saveToStorage('domino_leaderboard', [])
  },

  updateAchievementProgress: (progressUpdate) => {
    const current = get().achievementProgress
    const updatedProgress = { ...current, ...progressUpdate }

    if (progressUpdate.totalWins !== undefined) {
      const won = progressUpdate.totalWins > current.totalWins
      updatedProgress.currentStreak = won ? current.currentStreak + 1 : 0
      updatedProgress.bestStreak = Math.max(updatedProgress.bestStreak, updatedProgress.currentStreak)
    }

    const { updated, newlyUnlocked } = checkAchievements(get().achievements, updatedProgress)

    set({
      achievementProgress: updatedProgress,
      achievements: updated,
      lastUnlocked: newlyUnlocked.length > 0 ? newlyUnlocked : get().lastUnlocked,
    })

    saveToStorage('domino_achievement_progress', updatedProgress)
    saveToStorage('domino_achievements', updated)
  },

  clearLastUnlocked: () => set({ lastUnlocked: [] }),

  setPlayerName: (name) => {
    set({ playerName: name })
    saveToStorage('domino_player_name', name)
  },

  setPlayerAvatar: (avatar) => {
    set({ playerAvatar: avatar })
    saveToStorage('domino_player_avatar', avatar)
  },

  initMatchState: (targetScore) => {
    const newMatchState: MatchState = {
      scores: [],
      playerTotal: 0,
      opponentTotal: 0,
      targetScore,
      isMatchOver: false,
      matchWinner: null,
    }
    set({ matchState: newMatchState })
  },

  addRoundScore: (playerScore, opponentScore) => {
    const current = get().matchState
    if (!current) return

    const newScores = [...current.scores, {
      round: current.scores.length + 1,
      playerScore,
      opponentScore,
    }]

    const playerTotal = current.playerTotal + playerScore
    const opponentTotal = current.opponentTotal + opponentScore

    const isMatchOver = playerTotal >= current.targetScore || opponentTotal >= current.targetScore
    const matchWinner = isMatchOver 
      ? (playerTotal >= current.targetScore ? get().playerName : 'الكمبيوتر')
      : null

    const updated: MatchState = {
      ...current,
      scores: newScores,
      playerTotal,
      opponentTotal,
      isMatchOver,
      matchWinner,
    }

    set({ matchState: updated })
  },

  resetMatchState: () => set({ matchState: null }),

  addGameRecord: (record) => {
    const current = get().gameHistory
    const updated = [record, ...current].slice(0, 100)
    set({ gameHistory: updated })
    saveToStorage('domino_history', updated)
  },

  clearHistory: () => {
    set({ gameHistory: [] })
    saveToStorage('domino_history', [])
  },

  addLeaderboardEntry: (entry) => {
    const current = get().leaderboard
    const updated = [...current, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
    set({ leaderboard: updated })
    saveToStorage('domino_leaderboard', updated)
  },

  clearLeaderboard: () => {
    set({ leaderboard: [] })
    saveToStorage('domino_leaderboard', [])
  },
}))
