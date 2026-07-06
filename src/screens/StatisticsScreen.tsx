import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Trophy, Gamepad2, Swords, Target, Medal, History } from 'lucide-react'

function StatRow({ icon, label, value, color = 'text-white' }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-yellow-500">{icon}</div>
        <span className="text-white/80">{label}</span>
      </div>
      <span className={`font-bold text-lg ${color}`}>{value}</span>
    </div>
  )
}

export default function StatisticsScreen() {
  const { statistics, setScreen } = useGameStore()
  const winRate = statistics.gamesPlayed > 0 ? Math.round((statistics.gamesWon / statistics.gamesPlayed) * 100) : 0

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent mb-4">الإحصائيات</h2>

        <div className="w-full bg-white/10 rounded-xl p-6 flex flex-col gap-5">
          <StatRow icon={<Gamepad2 size={24} />} label="الألعاب" value={statistics.gamesPlayed} />
          <StatRow icon={<Trophy size={24} />} label="الفوز" value={statistics.gamesWon} color="text-green-400" />
          <StatRow icon={<Swords size={24} />} label="الخسارة" value={statistics.gamesLost} color="text-red-400" />
          <StatRow icon={<Target size={24} />} label="نسبة الفوز" value={`${winRate}%`} color="text-yellow-400" />
          <StatRow icon={<Trophy size={24} />} label="أعلى نتيجة" value={statistics.highestScore} color="text-yellow-400" />
          <StatRow icon={<Target size={24} />} label="السلسلة" value={statistics.winStreak} />
        </div>

        <button 
          onClick={() => setScreen('achievements')}
          className="game-btn game-btn-primary w-full gap-3"
        >
          <Medal size={24} /> الإنجازات
        </button>

        <button 
          onClick={() => setScreen('history')}
          className="game-btn game-btn-secondary w-full gap-3"
        >
          <History size={24} /> السجل
        </button>
      </div>
    </div>
  )
}
