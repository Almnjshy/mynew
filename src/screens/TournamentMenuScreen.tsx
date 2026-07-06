import { useGameStore } from '@/store/gameStore'
import { useTournamentStore } from '@/store/tournamentStore'
import { soundEngine } from '@/lib/soundEngine'
import { Trophy, Plus, History, ArrowLeft, Crown, Users } from 'lucide-react'

export default function TournamentMenuScreen() {
  const { setScreen, playerName } = useGameStore()
  const { activeTournament, tournamentHistory } = useTournamentStore()

  const handleNavigate = (screen: any) => {
    soundEngine.playClick()
    setScreen(screen)
  }

  const handleContinue = () => {
    soundEngine.playClick()
    if (activeTournament?.stage === 'bracket' || activeTournament?.stage === 'match') {
      setScreen('tournamentBracket')
    }
  }

  return (
    <div className="screen-container wood-bg">
      <button 
        onClick={() => handleNavigate('menu')} 
        className="absolute top-4 left-4 text-white p-2"
      >
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="p-4 bg-yellow-500/20 rounded-full">
          <Trophy size={48} className="text-yellow-400" />
        </div>

        <h1 className="text-3xl font-bold gold-accent">البطولات</h1>

        {/* Continue Active Tournament */}
        {activeTournament && activeTournament.stage !== 'champion' && (
          <div className="w-full bg-white/10 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 font-bold">{activeTournament.name}</span>
              <Crown size={20} className="text-yellow-400" />
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
              <Users size={16} />
              <span>{activeTournament.size} لاعبين</span>
              <span className="mx-1">•</span>
              <span>الجولة {activeTournament.currentRound + 1}</span>
            </div>
            <button 
              onClick={handleContinue}
              className="game-btn game-btn-primary w-full"
            >
              متابعة البطولة
            </button>
          </div>
        )}

        {/* Create New Tournament */}
        <button 
          onClick={() => handleNavigate('tournamentCreate')}
          className="game-btn game-btn-primary w-full gap-3"
        >
          <Plus size={24} /> بطولة جديدة
        </button>

        {/* Tournament History */}
        {tournamentHistory.length > 0 && (
          <div className="w-full">
            <h3 className="text-white/60 text-sm mb-3 text-right">سجل البطولات</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tournamentHistory.map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="text-right">
                    <div className="text-white font-medium text-sm">{entry.name}</div>
                    <div className="text-white/40 text-xs">
                      {entry.size} لاعبين • الفائز: {entry.champion}
                    </div>
                  </div>
                  <Trophy 
                    size={20} 
                    className={entry.champion === playerName ? 'text-yellow-400' : 'text-white/20'} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tournamentHistory.length === 0 && !activeTournament && (
          <div className="text-center text-white/40 py-8">
            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لم تشارك في أي بطولة بعد</p>
            <p className="text-xs mt-1">ابدأ بطولة جديدة الآن!</p>
          </div>
        )}
      </div>
    </div>
  )
}