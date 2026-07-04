import { useGameStore } from '@/store/gameStore'
import { Trophy, Home, RotateCcw, Target, BarChart3, History, Crown } from 'lucide-react'

export default function MatchEndScreen() {
  const { setScreen, statistics, matchState, settings, resetMatchState, addGameRecord, addLeaderboardEntry, playerName, playerAvatar } = useGameStore()

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
      rounds: matchState?.scores.length || 1,
      playerScore: matchState?.playerTotal || (isPlayerWin ? lastRoundPoints : 0),
      opponentScore: matchState?.opponentTotal || (isPlayerWin ? 0 : lastRoundPoints),
      targetScore: settings.gameMode === 'points' ? settings.targetScore : undefined,
      duration,
    }

    addGameRecord(record)
  }

  const saveLeaderboardEntry = () => {
    if (!isPlayerWin) return

    const score = matchState?.playerTotal || lastRoundPoints
    const winStreak = statistics.streak + 1

    const entry = {
      id: `lb-${Date.now()}`,
      playerName,
      playerAvatar,
      score,
      gameMode: settings.gameMode,
      difficulty: settings.difficulty,
      date: new Date().toISOString(),
      moves: movesCount,
      winStreak,
    }

    addLeaderboardEntry(entry)
  }

  return (
    <div className="screen-container title-bg">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <img 
          src={isPlayerWin ? "/assets/trophy.png" : "/assets/avatar_ai.png"} 
          alt={isPlayerWin ? "Trophy" : "AI"} 
          className="trophy-img animate-bounce" 
        />

        <h2 className="text-3xl font-bold gold-accent">
          {isPlayerWin ? 'مبروك!' : 'انتهت اللعبة'}
        </h2>

        <p className="text-white text-xl">
          {isPlayerWin ? 'أنت الفائز!' : `الفائز: ${winnerName}`}
        </p>

        {/* New high score notification */}
        {isPlayerWin && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3 flex items-center gap-2">
            <Crown size={20} className="text-yellow-400" />
            <span className="text-yellow-200 text-sm">تم حفظ نتيجتك في لوحة المتصدرين!</span>
          </div>
        )}

        {/* Points mode summary */}
        {settings.gameMode === 'points' && matchState && (
          <div className="w-full bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={20} className="gold-accent" />
              <span className="text-white font-bold">ملخص المباراة</span>
            </div>

            <div className="flex justify-between text-white mb-2">
              <span>الهدف:</span>
              <span className="font-bold gold-accent">{matchState.targetScore} نقطة</span>
            </div>

            <div className="flex justify-between text-green-400 mb-2">
              <span>نقاطك:</span>
              <span className="font-bold">{matchState.playerTotal}</span>
            </div>

            <div className="flex justify-between text-red-400 mb-2">
              <span>نقاط الخصم:</span>
              <span className="font-bold">{matchState.opponentTotal}</span>
            </div>

            <div className="flex justify-between text-yellow-400 mb-2">
              <span>عدد الجولات:</span>
              <span className="font-bold">{matchState.scores.length}</span>
            </div>

            <div className="flex justify-between text-white">
              <span>آخر جولة:</span>
              <span className="font-bold">+{lastRoundPoints} نقطة</span>
            </div>

            {matchState.scores.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-white/70 text-sm mb-2">تفاصيل الجولات:</div>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                  {matchState.scores.map((round, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-white/60">جولة {round.round}</span>
                      <span className={round.playerScore > round.opponentScore ? 'text-green-400' : 'text-red-400'}>
                        {round.playerScore} - {round.opponentScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Classic mode stats */}
        {settings.gameMode === 'classic' && (
          <div className="bg-white/10 rounded-xl p-4 w-full">
            <div className="flex justify-between text-white mb-2">
              <span>الألعاب:</span>
              <span className="font-bold">{statistics.gamesPlayed}</span>
            </div>
            <div className="flex justify-between text-green-400 mb-2">
              <span>الفوز:</span>
              <span className="font-bold">{statistics.gamesWon}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>الخسارة:</span>
              <span className="font-bold">{statistics.gamesLost}</span>
            </div>
          </div>
        )}

        <button onClick={handlePlayAgain} className="game-btn game-btn-primary w-full gap-3">
          <RotateCcw size={24} /> لعب مرة أخرى
        </button>

        <button onClick={handleStatistics} className="game-btn game-btn-secondary w-full gap-3">
          <BarChart3 size={24} /> الإحصائيات
        </button>

        <button onClick={() => { saveGameRecord(); saveLeaderboardEntry(); setScreen('history'); }} className="game-btn game-btn-secondary w-full gap-3">
          <History size={24} /> السجل
        </button>

        <button onClick={handleMenu} className="game-btn game-btn-secondary w-full gap-3">
          <Home size={24} /> القائمة الرئيسية
        </button>
      </div>
    </div>
  )
}
