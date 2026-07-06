import type {
  TournamentSize,
  TournamentPlayer,
  TournamentMatch,
  TournamentRound,
  TournamentState,
} from '@/types/game'

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
 * Simulate AI vs AI match - FIXED with proper skill weighting
 */
export function simulateAIMatch(
  player1: TournamentPlayer,
  player2: TournamentPlayer,
  difficulty: 'easy' | 'medium' | 'hard',
): { winner: TournamentPlayer; p1Score: number; p2Score: number } {
  // FIXED: Better skill calculation with weighted randomness
  const skillMap = { easy: 0.3, medium: 0.5, hard: 0.7 }
  const p1Skill = skillMap[player1.aiDifficulty || 'medium']
  const p2Skill = skillMap[player2.aiDifficulty || 'medium']

  // Weighted random: skill determines probability of winning
  // Higher skill = higher chance to win, but not guaranteed
  const p1Advantage = p1Skill - p2Skill
  const p1WinChance = 0.5 + p1Advantage * 0.4 // Range: 0.1 to 0.9
  
  const roll = Math.random()
  const winner = roll < p1WinChance ? player1 : player2

  // FIXED: Scores based on skill difference
  const baseScore = 100
  const p1Score = Math.floor(baseScore + (p1Skill - 0.5) * 50 + Math.random() * 30)
  const p2Score = Math.floor(baseScore + (p2Skill - 0.5) * 50 + Math.random() * 30)

  return { winner, p1Score, p2Score }
}

/**
 * Set match result and advance - NEW FUNCTION
 */
export function setMatchResult(
  state: TournamentState,
  matchId: string,
  winnerId: string,
  p1Score: number,
  p2Score: number,
): TournamentState {
  const newState = { ...state }
  
  // Find the match
  for (const round of newState.rounds) {
    const match = round.matches.find(m => m.id === matchId)
    if (match) {
      match.winner = match.player1?.id === winnerId ? match.player1 : match.player2
      match.player1Score = p1Score
      match.player2Score = p2Score
      match.status = 'completed'
      break
    }
  }
  
  return newState
}

/**
 * Advance tournament to next match - FIXED
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

  // Check if current match is completed before advancing
  if (currentMatch.status !== 'completed' && currentMatch.status !== 'bye') {
    return newState // Don't advance if match not done
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
        roundName: getRoundName(newState.currentRound, newState.size),
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

/**
 * Get current match info - NEW HELPER
 */
export function getCurrentMatch(state: TournamentState): TournamentMatch | null {
  const currentRound = state.rounds[state.currentRound]
  if (!currentRound) return null
  return currentRound.matches[state.currentMatch] || null
}
