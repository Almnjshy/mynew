import { useGameStore } from '@/store/gameStore'
import { Trophy, Home, RotateCcw, Target, BarChart3, History, Crown } from 'lucide-react'

export default function MatchEndScreen() {
  const { setScreen, statistics, matchState, settings, resetMatchState, addHistoryEntry, addLeaderboardEntry, playerName, playerAvatar } = useGameStore()

  const winnerName = sessionStorage.getItem('lastWinner') || 'الكمبيوتر'
  const isPlayerWin = winnerName === playerName
  const lastRoundPoints = Number(sessionStorage.getItem('lastRoundPoints') || 0)
  const movesCount = Number(sessionStorage.getItem('movesCount') || '0')

  const handlePlayAgain = () => {
    resetMatchState()
    if (settings.gameMode === 'points') {
      const { initMatchState } = useGameStore.getState()
      initMatchState(settings.targetScore)
    }
    setScreen('game')
  }

  const handleMenu = () => {
    saveGameRecord()
    saveLeaderboardEntry()
    resetMatchState()
    setScreen('menu')
  }

  const handleStatistics = () => {
    saveGameRecord()
    saveLeaderboardEntry()
    setScreen('statistics')
  }

  const saveGameRecord = () => {
    const startTime = sessionStorage.getItem('gameStartTime')
    const duration = startTime ? Math.floor((Date.now() - Number(startTime)) / 1000) : undefined

    const record = {
      id: `game-${Date.now()}`,
      date: new Date().toISOString(),
      playerName,
      opponentName: 'الكمبيوتر',
      result: isPlayerWin ? 'win' as const : 'loss' as const,
      gameMode: settings.gameMode,
      difficulty: settings.difficulty,
      rounds: matchState?.scores?.length || 1,
      playerScore: matchState?.playerTotal || (isPlayerWin ? lastRoundPoints : 0),
      opponentScore: matchState?.opponentTotal || (isPlayerWin ? 0 : lastRoundPoints),
      targetScore: settings.gameMode === 'points' ? settings.targetScore : undefined,
      duration,
    }

    addHistoryEntry(record)
  }

  const saveLeaderboardEntry = () => {
    if (!isPlayerWin) return

    const score = matchState?.playerTotal || lastRoundPoints
    addLeaderboardEntry({
      name: playerName,
      score,
      avatar: playerAvatar,
      date: new Date().toISOString(),
    })
  }

  return (
    <div className="screen-container title-bg flex flex-col items-center justify-center gap-6 p-8">
      <Crown size={64} className={isPlayerWin ? 'text-yellow-400' : 'text-gray-400'} />
      <h2 className="text-4xl font-bold text-white">
        {isPlayerWin ? '🎉 فوز!' : '😔 خسارة'}
      </h2>
      
      <div className="w-full max-w-sm bg-white/10 rounded-xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-white/70">الفائز</span>
          <span className="text-white font-bold">{winnerName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/70">النقاط</span>
          <span className="text-yellow-400 font-bold">{lastRoundPoints}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/70">الحركات</span>
          <span className="text-white font-bold">{movesCount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button onClick={handlePlayAgain} className="game-btn game-btn-primary w-full gap-3">
          <RotateCcw size={24} /> لعب مرة أخرى
        </button>
        <button onClick={handleStatistics} className="game-btn game-btn-secondary w-full gap-3">
          <BarChart3 size={24} /> الإحصائيات
        </button>
        <button onClick={handleMenu} className="game-btn game-btn-secondary w-full gap-3">
          <Home size={24} /> القائمة الرئيسية
        </button>
      </div>
    </div>
  )
}
