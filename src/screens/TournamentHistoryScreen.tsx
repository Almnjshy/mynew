import { useGameStore } from '@/store/gameStore'
import { useTournamentStore } from '@/store/tournamentStore'
import { soundEngine } from '@/lib/soundEngine'
import { ArrowLeft, Trophy, Calendar, Users, Trash2 } from 'lucide-react'

export default function TournamentHistoryScreen() {
  const { setScreen, playerName } = useGameStore()
  const { tournamentHistory, clearHistory } = useTournamentStore()

  const handleBack = () => {
    soundEngine.playClick()
    setScreen('tournamentMenu')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="screen-container wood-bg">
      <button onClick={handleBack} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="p-4 bg-yellow-500/20 rounded-full">
          <Trophy size={48} className="text-yellow-400" />
        </div>

        <h1 className="text-2xl font-bold gold-accent">سجل البطولات</h1>

        {tournamentHistory.length === 0 ? (
          <div className="text-center text-white/40 py-12">
            <Trophy size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">لا توجد بطولات مسجلة</p>
            <p className="text-sm mt-2">شارك في بطولة لترى سجلك هنا</p>
          </div>
        ) : (
          <>
            <div className="w-full space-y-3 max-h-96 overflow-y-auto">
              {tournamentHistory.map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-white/10 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-right">
                      <div className="text-white font-bold">{entry.name}</div>
                      <div className="text-white/40 text-xs flex items-center gap-1 mt-1">
                        <Calendar size={12} />
                        {formatDate(entry.completedAt)}
                      </div>
                    </div>
                    <div className={`p-2 rounded-full ${
                      entry.champion === playerName 
                        ? 'bg-yellow-500/20' 
                        : 'bg-white/5'
                    }`}>
                      <Trophy size={20} className={
                        entry.champion === playerName 
                          ? 'text-yellow-400' 
                          : 'text-white/30'
                      } />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-white/60">
                      <Users size={14} />
                      <span>{entry.size} لاعب</span>
                    </div>
                    <div className="text-white/60">
                      {entry.totalMatches} مباراة
                    </div>
                  </div>

                  <div className={`mt-2 text-sm font-medium ${
                    entry.champion === playerName 
                      ? 'text-yellow-400' 
                      : 'text-white/60'
                  }`}>
                    {entry.champion === playerName 
                      ? '🏆 أنت الفائز!' 
                      : `الفائز: ${entry.champion}`}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                soundEngine.playClick()
                if (confirm('هل أنت متأكد من حذف سجل البطولات؟')) {
                  clearHistory()
                }
              }}
              className="flex items-center gap-2 text-red-400 text-sm py-2"
            >
              <Trash2 size={16} />
              مسح السجل
            </button>
          </>
        )}
      </div>
    </div>
  )
}