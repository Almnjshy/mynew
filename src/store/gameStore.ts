import { create } from 'zustand'
import { GameScreen, GameSettings, GameStatistics, Difficulty } from '@/types/game'

interface GameStore {
  screen: GameScreen
  settings: GameSettings
  statistics: GameStatistics
  setScreen: (screen: GameScreen) => void
  updateSettings: (settings: Partial<GameSettings>) => void
  updateStatistics: (stats: Partial<GameStatistics>) => void
  resetStatistics: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  screen: 'title',
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    difficulty: 'medium' as Difficulty,
    showHints: true,
  },
  statistics: {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalScore: 0,
    highestScore: 0,
    streak: 0,
  },
  setScreen: (screen) => set({ screen }),
  updateSettings: (newSettings) => 
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  updateStatistics: (newStats) => 
    set((state) => ({ statistics: { ...state.statistics, ...newStats } })),
  resetStatistics: () => 
    set({ statistics: { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalScore: 0, highestScore: 0, streak: 0 } }),
}))