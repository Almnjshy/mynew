import type {
  TournamentSize,
  TournamentPlayer,
  TournamentMatch,
  TournamentRound,
  TournamentState,
} from '@/types/tournament'

/**
 * Generate a unique tournament ID
 */
export function generateTournamentId(): string {
  return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate AI player names
 */
export function generateAIPlayers(count: number, difficulty: 'easy' | 'medium' | 'hard'): TournamentPlayer[] {
  const aiNames = [
    'الأسطورة', 'البطل', 'المحارب', 'الفارس', 'الصقر',
    'النمر', 'الأسد', 'الذئب', 'الصياد', 'الفهد',
    'العقاب', 'الشبح', 'الرعد', 'البرق', 'العاصفة',
  ]

  const shuffled = [...aiNames].sort(() => Math.random() - 0.5)

  return Array.from({ length: count }, (_, i) => ({
    id: `ai_${i}`,
    name: shuffled[i % shuffled.length],
    avatar: '/assets/avatar_ai.png',
    seed: i + 2,
    isAI: true,
    aiDifficulty: difficulty,
  }))
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Create tournament bracket with proper seeding
 */
export function createBracket(
  players: TournamentPlayer[],
  size: TournamentSize,
): TournamentRound[] {
  const rounds: TournamentRound[] = []
  let currentPlayers = [...players]

  // Pad with byes if needed
  while (currentPlayers.length < size) {
    currentPlayers.push({
      id: `bye_${currentPlayers.length}`,
      name: '---',
      avatar: '',
      seed: currentPlayers.length + 1,
      isAI: true,
    })
  }

  // Shuffle for random bracket placement (optional: use seeding)
  currentPlayers = shuffle(currentPlayers)

  let roundNumber = 1
  let remainingPlayers = size

  while (remainingPlayers > 1) {
    const matches: TournamentMatch[] = []
    const matchesInRound = remainingPlayers / 2

    for (let i = 0; i < matchesInRound; i++) {
      const p1 = currentPlayers[i * 2] || null
      const p2 = currentPlayers[i * 2 + 1] || null

      matches.push({
        id: `match_${roundNumber}_${i}`,
        round: roundNumber,
        matchNumber: i,
        player1: p1,
        player2: p2,
        winner: null,
        status: p1?.name === '---' || p2?.name === '---' ? 'bye' : 'pending',
        player1Score: 0,
        player2Score: 0,
        targetScore: 100,
      })
    }

    rounds.push({
      roundNumber,
      roundName: getRoundName(roundNumber, size),
      matches,
    })

    roundNumber++
    remainingPlayers /= 2
  }

  return rounds
}

/**
 * Get round name based on tournament size and round number
 */
function getRoundName(round: number, size: TournamentSize): string {
  const totalRounds = Math.log2(size)
  const remaining = totalRounds - round + 1

  if (remaining === 1) return 'النهائي'
  if (remaining === 2) return 'نصف النهائي'
  if (remaining === 3) return 'ربع النهائي'
  if (remaining === 4) return 'دور الـ16'
  return `الجولة ${round}`
}

/**
 * Simulate AI vs AI match
 */
export function simulateAIMatch(
  player1: TournamentPlayer,
  player2: TournamentPlayer,
  difficulty: 'easy' | 'medium' | 'hard',
): { winner: TournamentPlayer; p1Score: number; p2Score: number } {
  // Simple simulation based on difficulty
  const p1Skill = player1.aiDifficulty === 'hard' ? 0.7 : player1.aiDifficulty === 'medium' ? 0.5 : 0.3
  const p2Skill = player2.aiDifficulty === 'hard' ? 0.7 : player2.aiDifficulty === 'medium' ? 0.5 : 0.3

  // Add randomness
  const p1Roll = Math.random() * p1Skill
  const p2Roll = Math.random() * p2Skill

  const winner = p1Roll > p2Roll ? player1 : player2
  const p1Score = Math.floor(Math.random() * 100) + 50
  const p2Score = Math.floor(Math.random() * 100) + 50

  return { winner, p1Score, p2Score }
}

/**
 * Advance tournament to next match
 */
export function advanceTournament(state: TournamentState): TournamentState {
  const newState = { ...state }

  // Find current match
  const currentRound = newState.rounds[newState.currentRound]
  if (!currentRound) return newState

  const currentMatch = currentRound.matches[newState.currentMatch]
  if (!currentMatch) return newState

  // If it's a bye, auto-advance
  if (currentMatch.status === 'bye') {
    currentMatch.winner = currentMatch.player1?.name !== '---' ? currentMatch.player1 : currentMatch.player2
    currentMatch.status = 'completed'
  }

  // Move to next match
  newState.currentMatch++

  // If round complete, create next round
  if (newState.currentMatch >= currentRound.matches.length) {
    const winners = currentRound.matches.map(m => m.winner).filter(Boolean) as TournamentPlayer[]

    if (winners.length === 1) {
      // Tournament complete
      newState.champion = winners[0]
      newState.stage = 'champion'
      newState.completedAt = new Date().toISOString()
    } else {
      // Create next round
      newState.currentRound++
      newState.currentMatch = 0

      const nextMatches: TournamentMatch[] = []
      for (let i = 0; i < winners.length / 2; i++) {
        nextMatches.push({
          id: `match_${newState.currentRound}_${i}`,
          round: newState.currentRound,
          matchNumber: i,
          player1: winners[i * 2],
          player2: winners[i * 2 + 1],
          winner: null,
          status: 'pending',
          player1Score: 0,
          player2Score: 0,
          targetScore: newState.targetScore,
        })
      }

      newState.rounds.push({
        roundNumber: newState.currentRound,
        roundName: getRoundName(newState.currentRound + 1, newState.size),
        matches: nextMatches,
      })
    }
  }

  return newState
}

/**
 * Get opponent for current match
 */
export function getCurrentOpponent(state: TournamentState): TournamentPlayer | null {
  const currentRound = state.rounds[state.currentRound]
  if (!currentRound) return null

  const currentMatch = currentRound.matches[state.currentMatch]
  if (!currentMatch) return null

  // Return the opponent (not the player)
  if (currentMatch.player1?.id === 'player_0') return currentMatch.player2
  if (currentMatch.player2?.id === 'player_0') return currentMatch.player1

  return null
}

/**
 * Check if current match is player's turn
 */
export function isPlayerMatch(state: TournamentState): boolean {
  const currentRound = state.rounds[state.currentRound]
  if (!currentRound) return false

  const currentMatch = currentRound.matches[state.currentMatch]
  if (!currentMatch) return false

  return currentMatch.player1?.id === 'player_0' || currentMatch.player2?.id === 'player_0'
}
