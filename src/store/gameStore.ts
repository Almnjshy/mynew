import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Preferences } from '@capacitor/preferences'
import type {
  GameSettings,
  Statistics,
  Achievement,
  HistoryEntry,
  LeaderboardEntry,
  MatchState,
  Screen,
  GameRecord,
  AchievementProgress,
} from '@/types/game'
import { DEFAULT_ACHIEVEMENTS } from '@/lib/achievements'

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  difficulty: 'medium',
  showHints: false,
  gameMode: 'classic',
  targetScore: 100,
  timerMode: 'off',
  customTime: 60,
  aiCount: 1,
}

const defaultStatistics: Statistics = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  totalScore: 0,
  highestScore: 0,
  totalTime: 0,
  bestTime: 0,
  draws: 0,
  winStreak: 0,
  bestWinStreak: 0,
}

// Custom storage adapter using Capacitor Preferences
const capacitorStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const { value } = await Preferences.get({ key: name })
      return value
    } catch {
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await Preferences.set({ key: name, value })
    } catch {
      // Silently fail - app should work without persistence
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await Preferences.remove({ key: name })
    } catch {
      // Silently fail
    }
  },
}

export interface GameStore {
  screen: Screen
  setScreen: (screen: Screen) => void
  previousScreen: Screen | null
  playerName: string
  playerAvatar: string
  setPlayerName: (name: string) => void
  setPlayerAvatar: (avatar: string) => void
  settings: GameSettings
  updateSettings: (settings: Partial<GameSettings>) => void
  statistics: Statistics
  updateStatistics: (stats: Partial<Statistics>) => void
  resetStatistics: () => void
  achievements: Achievement[]
  updateAchievementProgress: (id: string, progress: number) => void
  unlockAchievement: (id: string) => void
  checkAndUnlockAchievements: (progress: AchievementProgress) => string[]
  gameHistory: GameRecord[]
  addHistoryEntry: (entry: GameRecord) => void
  clearHistory: () => void
  leaderboard: LeaderboardEntry[]
  addLeaderboardEntry: (entry: LeaderboardEntry) => void
  matchState: MatchState | null
  initMatchState: (targetScore: number) => void
  addRoundScore: (playerScore: number, aiScore: number) => void
  resetMatchState: () => void
  // Navigation history for back button
  screenHistory: Screen[]
  pushScreen: (screen: Screen) => void
  popScreen: () => Screen | null
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'title',
      previousScreen: null,
      setScreen: (screen) => {
        const current = get().screen
        if (current !== screen) {
          set({ previousScreen: current, screen })
        }
      },
      playerName: 'لاعب',
      playerAvatar: '/assets/avatar_player.png',
      setPlayerName: (name) => set({ playerName: name }),
      setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      statistics: defaultStatistics,
      // FIXED: Now properly increments instead of replacing
      updateStatistics: (stats) =>
        set((state) => {
          const current = state.statistics
          const updated: Statistics = {
            gamesPlayed: current.gamesPlayed + (stats.gamesPlayed || 0),
            gamesWon: current.gamesWon + (stats.gamesWon || 0),
            gamesLost: current.gamesLost + (stats.gamesLost || 0),
            totalScore: current.totalScore + (stats.totalScore || 0),
            highestScore: Math.max(current.highestScore, stats.highestScore || 0),
            totalTime: current.totalTime + (stats.totalTime || 0),
            bestTime: stats.bestTime
              ? current.bestTime === 0
                ? stats.bestTime
                : Math.min(current.bestTime, stats.bestTime)
              : current.bestTime,
            draws: current.draws + (stats.draws || 0),
            winStreak: stats.gamesWon ? current.winStreak + stats.gamesWon : 0,
            bestWinStreak: Math.max(current.bestWinStreak, 
              stats.gamesWon ? current.winStreak + stats.gamesWon : current.winStreak),
          }
          return { statistics: updated }
        }),
      resetStatistics: () => set({ statistics: defaultStatistics }),
      achievements: DEFAULT_ACHIEVEMENTS,
      updateAchievementProgress: (id, progress) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id ? { ...a, progress: Math.min(progress, a.maxProgress) } : a
          ),
        })),
      unlockAchievement: (id) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id && !a.unlockedAt
              ? { ...a, unlockedAt: new Date().toISOString() }
              : a
          ),
        })),
      // NEW: Check achievements based on progress
      checkAndUnlockAchievements: (progress) => {
        const state = get()
        const newlyUnlocked: string[] = []

        state.achievements.forEach((achievement) => {
          if (achievement.unlockedAt) return // Already unlocked

          let shouldUnlock = false
          const condition = achievement.condition

          switch (condition.type) {
            case 'wins':
              shouldUnlock = progress.totalWins >= condition.value
              break
            case 'games_played':
              shouldUnlock = progress.totalGames >= condition.value
              break
            case 'streak':
              shouldUnlock = progress.bestStreak >= condition.value
              break
            case 'clean_win':
              shouldUnlock = progress.cleanWins >= condition.value
              break
            case 'crushing_win':
              shouldUnlock = progress.crushingWins >= condition.value
              break
            case 'moves':
              shouldUnlock = progress.fastestWinMoves > 0 && progress.fastestWinMoves <= condition.value
              break
            case 'draws':
              shouldUnlock = progress.totalDraws >= condition.value
              break
            case 'comeback':
              shouldUnlock = progress.comebacks >= condition.value
              break
          }

          if (shouldUnlock) {
            get().unlockAchievement(achievement.id)
            newlyUnlocked.push(achievement.id)
          }

          // Update progress
          let newProgress = achievement.progress
          switch (condition.type) {
            case 'wins': newProgress = progress.totalWins; break
            case 'games_played': newProgress = progress.totalGames; break
            case 'streak': newProgress = progress.bestStreak; break
            case 'clean_win': newProgress = progress.cleanWins; break
            case 'crushing_win': newProgress = progress.crushingWins; break
            case 'draws': newProgress = progress.totalDraws; break
            case 'comeback': newProgress = progress.comebacks; break
          }
          get().updateAchievementProgress(achievement.id, newProgress)
        })

        return newlyUnlocked
      },
      gameHistory: [],
      addHistoryEntry: (entry) =>
        set((state) => ({
          gameHistory: [entry, ...state.gameHistory].slice(0, 50), // Keep last 50 games
        })),
      clearHistory: () => set({ gameHistory: [] }),
      leaderboard: [],
      addLeaderboardEntry: (entry) =>
        set((state) => ({
          leaderboard: [...state.leaderboard, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 20), // Keep top 20
        })),
      matchState: null,
      initMatchState: (targetScore) =>
        set({
          matchState: {
            round: 1,
            playerScore: 0,
            aiScore: 0,
            targetScore,
            scores: [],
            playerTotal: 0,
            opponentTotal: 0,
            isMatchOver: false,
            matchWinner: null,
          },
        }),
      addRoundScore: (playerScore, aiScore) =>
        set((state) => {
          if (!state.matchState) return state
          const newPlayerTotal = state.matchState.playerTotal + playerScore
          const newAiTotal = state.matchState.opponentTotal + aiScore
          const isMatchOver = newPlayerTotal >= state.matchState.targetScore || newAiTotal >= state.matchState.targetScore
          const matchWinner = isMatchOver
            ? newPlayerTotal > newAiTotal
              ? state.playerName
              : newAiTotal > newPlayerTotal
                ? 'الكمبيوتر'
                : null
            : null

          return {
            matchState: {
              ...state.matchState,
              round: state.matchState.round + 1,
              playerScore,
              aiScore,
              scores: [...state.matchState.scores, { player: playerScore, ai: aiScore }],
              playerTotal: newPlayerTotal,
              opponentTotal: newAiTotal,
              isMatchOver,
              matchWinner,
            },
          }
        }),
      resetMatchState: () => set({ matchState: null }),
      // Navigation history
      screenHistory: [],
      pushScreen: (screen) =>
        set((state) => ({
          screenHistory: [...state.screenHistory, screen],
        })),
      popScreen: () => {
        const history = get().screenHistory
        if (history.length === 0) return null
        const previous = history[history.length - 1]
        set({ screenHistory: history.slice(0, -1), screen: previous })
        return previous
      },
    }),
    {
      name: 'domino-game-storage',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({
        playerName: state.playerName,
        playerAvatar: state.playerAvatar,
        settings: state.settings,
        statistics: state.statistics,
        achievements: state.achievements,
        gameHistory: state.gameHistory,
        leaderboard: state.leaderboard,
      }),
    }
  )
)
