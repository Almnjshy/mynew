import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'

// Capacitor storage adapter
const capacitorStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      const { value } = await Preferences.get({ key: name })
      return value
    } catch {
      return localStorage.getItem(name)
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.set({ key: name, value })
    } catch {
      localStorage.setItem(name, value)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.remove({ key: name })
    } catch {
      localStorage.removeItem(name)
    }
  },
}

// Types
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameMode = 'classic' | 'points' | 'block'
export type TimerMode = 'off' | 'blitz' | 'rapid' | 'custom'
export type Screen = 
  | 'title' | 'menu' | 'levelSelect' | 'game' | 'matchEnd'
  | 'settings' | 'statistics' | 'achievements' | 'history'
  | 'profile' | 'leaderboard' | 'wifiGame' | 'onlineGame'

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

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  progress: number
  target: number
  unlockedAt?: string
}

export interface HistoryEntry {
  id: string
  date: string
  mode: GameMode
  difficulty: Difficulty
  result: 'win' | 'loss' | 'draw'
  score: number
  opponentScore: number
  duration: number
}

export interface LeaderboardEntry {
  name: string
  score: number
  avatar: string
  date: string
}

export interface MatchState {
  round: number
  playerScore: number
  aiScore: number
  targetScore: number
}

export interface GameStore {
  // Navigation
  screen: Screen
  setScreen: (screen: Screen) => void
  
  // Player
  playerName: string
  playerAvatar: string
  setPlayerName: (name: string) => void
  setPlayerAvatar: (avatar: string) => void
  
  // Settings
  settings: GameSettings
  updateSettings: (settings: Partial<GameSettings>) => void
  
  // Statistics
  statistics: Statistics
  updateStatistics: (stats: Partial<Statistics>) => void
  resetStatistics: () => void
  
  // Achievements
  achievements: Achievement[]
  updateAchievementProgress: (id: string, progress: number) => void
  unlockAchievement: (id: string) => void
  
  // History
  history: HistoryEntry[]
  addHistoryEntry: (entry: HistoryEntry) => void
  clearHistory: () => void
  
  // Leaderboard
  leaderboard: LeaderboardEntry[]
  addLeaderboardEntry: (entry: LeaderboardEntry) => void
  
  // Match State
  matchState: MatchState | null
  initMatchState: (targetScore: number) => void
  addRoundScore: (playerScore: number, aiScore: number) => void
  resetMatchState: () => void
}

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  difficulty: 'medium',
  showHints: false,
  gameMode: 'classic',
  targetScore: 100,
  timerMode: 'off',
  customTime: 120,
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

const defaultAchievements: Achievement[] = [
  {
    id: 'first_win',
    name: 'أول فوز',
    description: 'اربح مبارتك الأولى',
    icon: 'trophy',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'win_streak_3',
    name: 'الفوز المتتالي',
    description: 'اربح 3 مباريات متتالية',
    icon: 'zap',
    unlocked: false,
    progress: 0,
    target: 3,
  },
  {
    id: 'score_100',
    name: 'المائة الذهبية',
    description: 'اجمع 100 نقطة في مباراة واحدة',
    icon: 'target',
    unlocked: false,
    progress: 0,
    target: 100,
  },
  {
    id: 'games_10',
    name: 'المحترف',
    description: 'العب 10 مباريات',
    icon: 'gamepad',
    unlocked: false,
    progress: 0,
    target: 10,
  },
  {
    id: 'speed_demon',
    name: 'السريع',
    description: 'اربح مباراة في أقل من دقيقتين',
    icon: 'timer',
    unlocked: false,
    progress: 0,
    target: 1,
  },
  {
    id: 'perfect_game',
    name: 'اللعبة المثالية',
    description: 'اربح بدون أن يسجل الخصم أي نقطة',
    icon: 'crown',
    unlocked: false,
    progress: 0,
    target: 1,
  },
]

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Navigation
      screen: 'title',
      setScreen: (screen) => set({ screen }),
      
      // Player
      playerName: 'لاعب',
      playerAvatar: '/assets/avatar_player.png',
      setPlayerName: (playerName) => set({ playerName }),
      setPlayerAvatar: (playerAvatar) => set({ playerAvatar }),
      
      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      // Statistics
      statistics: defaultStatistics,
      updateStatistics: (newStats) =>
        set((state) => ({
          statistics: { ...state.statistics, ...newStats },
        })),
      resetStatistics: () => set({ statistics: defaultStatistics }),
      
      // Achievements
      achievements: defaultAchievements,
      updateAchievementProgress: (id, progress) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id
              ? {
                  ...a,
                  progress: Math.min(progress, a.target),
                  unlocked: progress >= a.target && !a.unlocked,
                  unlockedAt:
                    progress >= a.target && !a.unlocked
                      ? new Date().toISOString()
                      : a.unlockedAt,
                }
              : a
          ),
        })),
      unlockAchievement: (id) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id && !a.unlocked
              ? {
                  ...a,
                  unlocked: true,
                  progress: a.target,
                  unlockedAt: new Date().toISOString(),
                }
              : a
          ),
        })),
      
      // History
      history: [],
      addHistoryEntry: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 50), // Keep last 50
        })),
      clearHistory: () => set({ history: [] }),
      
      // Leaderboard
      leaderboard: [],
      addLeaderboardEntry: (entry) =>
        set((state) => ({
          leaderboard: [...state.leaderboard, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 20), // Top 20
        })),
      
      // Match State
      matchState: null,
      initMatchState: (targetScore) =>
        set({
          matchState: {
            round: 1,
            playerScore: 0,
            aiScore: 0,
            targetScore,
          },
        }),
      addRoundScore: (playerScore, aiScore) =>
        set((state) => {
          if (!state.matchState) return {}
          return {
            matchState: {
              ...state.matchState,
              round: state.matchState.round + 1,
              playerScore: state.matchState.playerScore + playerScore,
              aiScore: state.matchState.aiScore + aiScore,
            },
          }
        }),
      resetMatchState: () => set({ matchState: null }),
    }),
    {
      name: 'domino-game-storage',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({
        // Persist only these fields (not screen or matchState)
        playerName: state.playerName,
        playerAvatar: state.playerAvatar,
        settings: state.settings,
        statistics: state.statistics,
        achievements: state.achievements,
        history: state.history,
        leaderboard: state.leaderboard,
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure achievements array exists after rehydration
        if (state && !state.achievements) {
          state.achievements = defaultAchievements
        }
        if (state && !state.leaderboard) {
          state.leaderboard = []
        }
        if (state && !state.history) {
          state.history = []
        }
      },
    }
  )
)
