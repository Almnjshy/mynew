import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameSettings,
  Statistics,
  Achievement,
  HistoryEntry,
  LeaderboardEntry,
  MatchState,
  Screen,
  GameRecord,
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

export interface GameStore {
  screen: Screen
  setScreen: (screen: Screen) => void
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
  gameHistory: GameRecord[]
  addHistoryEntry: (entry: GameRecord) => void
  clearHistory: () => void
  leaderboard: LeaderboardEntry[]
  addLeaderboardEntry: (entry: LeaderboardEntry) => void
  matchState: MatchState | null
  initMatchState: (targetScore: number) => void
  addRoundScore: (playerScore: number, aiScore: number) => void
  resetMatchState: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'title',
      setScreen: (screen) => set({ screen }),
      playerName: 'لاعب',
      playerAvatar: '/assets/avatar_default.png',
      setPlayerName: (name) => set({ playerName: name }),
      setPlayerAvatar: (avatar) => set({ playerAvatar: avatar }),
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      statistics: defaultStatistics,
      updateStatistics: (stats) =>
        set((state) => ({
          statistics: { ...state.statistics, ...stats },
        })),
      resetStatistics: () => set({ statistics: defaultStatistics }),
      achievements: DEFAULT_ACHIEVEMENTS,
      updateAchievementProgress: (id, progress) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id ? { ...a, progress } : a
          ),
        })),
      unlockAchievement: (id) =>
        set((state) => ({
          achievements: state.achievements.map((a) =>
            a.id === id ? { ...a, unlockedAt: new Date().toISOString() } : a
          ),
        })),
      gameHistory: [],
      addHistoryEntry: (entry) =>
        set((state) => ({
          gameHistory: [entry, ...state.gameHistory].slice(0, 100),
        })),
      clearHistory: () => set({ gameHistory: [] }),
      leaderboard: [],
      addLeaderboardEntry: (entry) =>
        set((state) => ({
          leaderboard: [...state.leaderboard, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 50),
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
          },
        }),
      addRoundScore: (playerScore, aiScore) =>
        set((state) => {
          if (!state.matchState) return state
          const newScores = [...state.matchState.scores, { player: playerScore, ai: aiScore }]
          const playerTotal = newScores.reduce((sum, s) => sum + s.player, 0)
          const opponentTotal = newScores.reduce((sum, s) => sum + s.ai, 0)
          return {
            matchState: {
              ...state.matchState,
              round: state.matchState.round + 1,
              playerScore,
              aiScore,
              scores: newScores,
              playerTotal,
              opponentTotal,
            },
          }
        }),
      resetMatchState: () => set({ matchState: null }),
    }),
    {
      name: 'domino-storage',
    }
  )
)
