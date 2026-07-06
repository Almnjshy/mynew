import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useTournamentStore } from '@/store/tournamentStore'
import { soundEngine } from '@/lib/soundEngine'
import { ArrowLeft, Trophy, Users, Swords, Crown, ChevronRight } from 'lucide-react'
import type { TournamentMatch } from '@/types/tournament'

export default function TournamentBracketScreen() {
  const { setScreen } = useGameStore()
  const { activeTournament, simulateAIMatches } = useTournamentStore()

  useEffect(() => {
    if (activeTournament && activeTournament.stage === 'bracket') {
      // Auto-simulate AI matches in current round
      simulateAIMatches()
    }
  }, [activeTournament?.currentRound])

  if (!activeTournament) {
    return (
      <div className="screen-container wood-bg">
        <button onClick={() => setScreen('tournamentMenu')} className="absolute top-4 left-4 text-white p-2">
          <ArrowLeft size={28} />
        </button>
        <div className="text-white/60">لا توجد بطولة نشطة</div>
      </div>
    )
  }

  const { name, size, rounds, currentRound, currentMatch, stage, champion } = activeTournament

  const handlePlayMatch = () => {
    soundEngine.playClick()
    setScreen('tournamentGame')
  }

  const handleBack = () => {
    soundEngine.playClick()
    if (stage === 'champion') {
      setScreen('tournamentMenu')
    } else {
      setScreen('menu')
    }
  }

  // Check if it's player's turn
  const isPlayerTurn = () => {
    if (stage !== 'bracket') return false
    const match = rounds[currentRound]?.matches[currentMatch]
    if (!match) return false
    return match.player1?.id === 'player_0' || match.player2?.id === 'player_0'
  }

  // Get current match info
  const getCurrentMatch = (): TournamentMatch | null => {
    return rounds[currentRound]?.matches[currentMatch] || null
  }

  const currentMatchData = getCurrentMatch()

  return (
    <div className="screen-container wood-bg">
      <button onClick={handleBack} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm overflow-y-auto pb-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold gold-accent">{name}</h1>
          <div className="flex items-center justify-center gap-2 text-white/60 text-sm mt-1">
            <Users size={14} />
            <span>{size} لاعبين</span>
            <span className="mx-1">•</span>
            <span>الجولة {currentRound + 1} من {rounds.length}</span>
          </div>
        </div>

        {/* Champion Display */}
        {stage === 'champion' && champion && (
          <div className="w-full bg-yellow-500/20 border-2 border-yellow-500 rounded-xl p-6 text-center">
            <Crown size={48} className="text-yellow-400 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">🏆 الفائز 🏆</h2>
            <div className="text-3xl font-bold text-white mb-2">{champion.name}</div>
            <p className="text-white/60 text-sm">مبروك على الفوز بالبطولة!</p>
            <button 
              onClick={() => setScreen('tournamentMenu')}
              className="game-btn game-btn-primary w-full mt-4"
            >
              <Trophy size={20} /> العودة للبطولات
            </button>
          </div>
        )}

        {/* Current Match Card */}
        {stage !== 'champion' && currentMatchData && (
          <div className="w-full bg-white/10 rounded-xl p-4 border border-yellow-500/30">
            <div className="text-center mb-3">
              <span className="text-yellow-400 font-bold text-sm">
                {rounds[currentRound]?.roundName}
              </span>
              <span className="text-white/40 text-xs mx-2">
                مباراة {currentMatch + 1} من {rounds[currentRound]?.matches.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              {/* Player 1 */}
              <div className={`text-center flex-1 ${currentMatchData.player1?.id === 'player_0' ? 'text-yellow-400' : 'text-white'}`}>
                <div className="w-12 h-12 rounded-full bg-white/10 mx-auto mb-2 flex items-center justify-center overflow-hidden">
                  {currentMatchData.player1?.avatar ? (
                    <img src={currentMatchData.player1.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={24} className="text-white/40" />
                  )}
                </div>
                <div className="text-sm font-medium truncate">{currentMatchData.player1?.name || '---'}</div>
                {currentMatchData.status === 'completed' && (
                  <div className="text-lg font-bold">{currentMatchData.player1Score}</div>
                )}
              </div>

              {/* VS */}
              <div className="px-4">
                <Swords size={24} className="text-white/40" />
              </div>

              {/* Player 2 */}
              <div className={`text-center flex-1 ${currentMatchData.player2?.id === 'player_0' ? 'text-yellow-400' : 'text-white'}`}>
                <div className="w-12 h-12 rounded-full bg-white/10 mx-auto mb-2 flex items-center justify-center overflow-hidden">
                  {currentMatchData.player2?.avatar ? (
                    <img src={currentMatchData.player2.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={24} className="text-white/40" />
                  )}
                </div>
                <div className="text-sm font-medium truncate">{currentMatchData.player2?.name || '---'}</div>
                {currentMatchData.status === 'completed' && (
                  <div className="text-lg font-bold">{currentMatchData.player2Score}</div>
                )}
              </div>
            </div>

            {/* Play Button */}
            {isPlayerTurn() && currentMatchData.status !== 'completed' && (
              <button 
                onClick={handlePlayMatch}
                className="game-btn game-btn-primary w-full mt-4 gap-2"
              >
                <Swords size={20} /> اللعب الآن
              </button>
            )}

            {currentMatchData.status === 'completed' && (
              <div className="text-center mt-3">
                <span className="text-yellow-400 font-bold">
                  الفائز: {currentMatchData.winner?.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bracket Overview */}
        <div className="w-full">
          <h3 className="text-white/60 text-sm mb-3 text-right">جدول البطولة</h3>
          <div className="space-y-3">
            {rounds.map((round, rIndex) => (
              <div 
                key={round.roundNumber} 
                className={`rounded-xl p-3 ${
                  rIndex === currentRound && stage !== 'champion'
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-white/5'
                }`}
              >
                <div className="text-white/60 text-xs mb-2">{round.roundName}</div>
                <div className="space-y-2">
                  {round.matches.map((match, mIndex) => (
                    <div 
                      key={match.id}
                      className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                        match.status === 'completed'
                          ? 'bg-white/5'
                          : match.status === 'bye'
                          ? 'bg-white/5 opacity-50'
                          : 'bg-white/10'
                      }`}
                    >
                      <div className={`flex-1 text-right truncate ${
                        match.winner?.id === match.player1?.id ? 'text-yellow-400 font-bold' : 'text-white/60'
                      }`}>
                        {match.player1?.name || '---'}
                      </div>
                      <div className="text-white/30">
                        {match.status === 'completed' ? `${match.player1Score}-${match.player2Score}` : 'VS'}
                      </div>
                      <div className={`flex-1 truncate ${
                        match.winner?.id === match.player2?.id ? 'text-yellow-400 font-bold' : 'text-white/60'
                      }`}>
                        {match.player2?.name || '---'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abandon Button */}
        {stage !== 'champion' && (
          <button 
            onClick={() => {
              soundEngine.playClick()
              if (confirm('هل أنت متأكد من مغادرة البطولة؟')) {
                useTournamentStore.getState().abandonTournament()
                setScreen('tournamentMenu')
              }
            }}
            className="text-red-400 text-sm py-2"
          >
            مغادرة البطولة
          </button>
        )}
      </div>
    </div>
  )
}