import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Preferences } from '@capacitor/preferences'
import type {
  TournamentSize,
  TournamentState,
  TournamentHistoryEntry,
} from '@/types/tournament'
import {
  generateTournamentId,
  generateAIPlayers,
  createBracket,
  simulateAIMatch,
  advanceTournament,
} from '@/lib/tournamentEngine'

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
      // Silently fail
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

interface TournamentStore {
  // Active tournament
  activeTournament: TournamentState | null

  // History
  tournamentHistory: TournamentHistoryEntry[]

  // Actions
  createTournament: (options: {
    name: string
    size: TournamentSize
    playerName: string
    playerAvatar: string
    difficulty: 'easy' | 'medium' | 'hard'
    gameMode: 'classic' | 'points' | 'block' | 'allFives' | 'draw'
    targetScore: number
  }) => TournamentState

  startTournament: () => void
  completeMatch: (playerWon: boolean, playerScore: number, opponentScore: number) => void
  simulateAIMatches: () => void
  abandonTournament: () => void

  // History
  addToHistory: (entry: TournamentHistoryEntry) => void
  clearHistory: () => void
}

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      activeTournament: null,
      tournamentHistory: [],

      createTournament: (options) => {
        const aiCount = options.size - 1
        const aiPlayers = generateAIPlayers(aiCount, options.difficulty)

        const player: TournamentPlayer = {
          id: 'player_0',
          name: options.playerName,
          avatar: options.playerAvatar,
          seed: 1,
          isAI: false,
        }

        const allPlayers = [player, ...aiPlayers]
        const rounds = createBracket(allPlayers, options.size)

        const tournament: TournamentState = {
          id: generateTournamentId(),
          name: options.name,
          size: options.size,
          stage: 'registration',
          players: allPlayers,
          rounds,
          currentRound: 0,
          currentMatch: 0,
          champion: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
          difficulty: options.difficulty,
          gameMode: options.gameMode,
          targetScore: options.targetScore,
        }

        set({ activeTournament: tournament })
        return tournament
      },

      startTournament: () => {
        set((state) => {
          if (!state.activeTournament) return state
          return {
            activeTournament: {
              ...state.activeTournament,
              stage: 'bracket',
            },
          }
        })
      },

      completeMatch: (playerWon, playerScore, opponentScore) => {
        set((state) => {
          if (!state.activeTournament) return state

          const tournament = { ...state.activeTournament }
          const currentRound = tournament.rounds[tournament.currentRound]
          const currentMatch = currentRound.matches[tournament.currentMatch]

          // Update match result
          currentMatch.status = 'completed'
          currentMatch.player1Score = playerScore
          currentMatch.player2Score = opponentScore
          currentMatch.winner = playerWon
            ? (currentMatch.player1?.id === 'player_0' ? currentMatch.player1 : currentMatch.player2)
            : (currentMatch.player1?.id === 'player_0' ? currentMatch.player2 : currentMatch.player1)

          // Advance tournament
          const updated = advanceTournament(tournament)

          // If tournament complete, add to history
          if (updated.stage === 'champion') {
            const entry: TournamentHistoryEntry = {
              id: updated.id,
              name: updated.name,
              size: updated.size,
              champion: updated.champion?.name || '---',
              completedAt: updated.completedAt || new Date().toISOString(),
              totalMatches: updated.rounds.reduce((sum, r) => sum + r.matches.length, 0),
              playerMatches: 0, // Calculate based on actual play
              playerWins: 0,
            }

            return {
              activeTournament: updated,
              tournamentHistory: [entry, ...state.tournamentHistory].slice(0, 20),
            }
          }

          return { activeTournament: updated }
        })
      },

      simulateAIMatches: () => {
        set((state) => {
          if (!state.activeTournament) return state

          const tournament = { ...state.activeTournament }
          const currentRound = tournament.rounds[tournament.currentRound]

          // Simulate all AI vs AI matches in current round
          currentRound.matches.forEach((match, index) => {
            if (match.status !== 'pending') return
            if (match.player1?.id === 'player_0' || match.player2?.id === 'player_0') return

            const result = simulateAIMatch(
              match.player1!,
              match.player2!,
              tournament.difficulty,
            )

            match.winner = result.winner
            match.player1Score = result.p1Score
            match.player2Score = result.p2Score
            match.status = 'completed'
          })

          return { activeTournament: tournament }
        })
      },

      abandonTournament: () => {
        set({ activeTournament: null })
      },

      addToHistory: (entry) =>
        set((state) => ({
          tournamentHistory: [entry, ...state.tournamentHistory].slice(0, 20),
        })),

      clearHistory: () => set({ tournamentHistory: [] }),
    }),
    {
      name: 'domino-tournament-storage',
      storage: createJSONStorage(() => capacitorStorage),
      partialize: (state) => ({
        tournamentHistory: state.tournamentHistory,
      }),
    }
  )
)

// Import TournamentPlayer type
import type { TournamentPlayer } from '@/types/tournament'
