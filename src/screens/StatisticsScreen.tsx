import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Trophy, Gamepad2, Target, Clock, Flame, Award } from 'lucide-react'

export default function StatisticsScreen() {
  const { setScreen, statistics } = useGameStore()

  const winRate = statistics.gamesPlayed > 0
    ? Math.round((statistics.gamesWon / statistics.gamesPlayed) * 100)
    : 0

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}س ${mins}د`
    return `${mins}د`
  }

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent mb-4">الإحصائيات</h2>

        <div className="w-full bg-white/10 rounded-xl p-6 space-y-4">
          <StatRow
            icon={<Gamepad2 size={20} className="text-blue-400" />}
            label="إجمالي الألعاب"
            value={statistics.gamesPlayed}
          />
          <StatRow
            icon={<Trophy size={20} className="text-yellow-400" />}
            label="الألعاب المربوحة"
            value={statistics.gamesWon}
          />
          <StatRow
            icon={<Target size={20} className="text-red-400" />}
            label="الألعاب المخسورة"
            value={statistics.gamesLost}
          />
          <div className="border-t border-white/10 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60">نسبة الفوز</span>
              <span className="text-2xl font-bold text-green-400">{winRate}%</span>
            </div>
          </div>
          <StatRow
            icon={<Award size={20} className="text-purple-400" />}
            label="التعادلات"
            value={statistics.draws}
          />
          <StatRow
            icon={<Flame size={20} className="text-orange-400" />}
            label="أفضل سلسلة فوز"
            value={statistics.bestWinStreak}
          />
          <StatRow
            icon={<Trophy size={20} className="text-yellow-400" />}
            label="أعلى نقاط"
            value={statistics.highestScore}
          />
          <StatRow
            icon={<Clock size={20} className="text-cyan-400" />}
            label="إجمالي الوقت"
            value={formatTime(statistics.totalTime)}
          />
          {statistics.bestTime > 0 && (
            <StatRow
              icon={<Clock size={20} className="text-green-400" />}
              label="أفضل وقت"
              value={formatTime(statistics.bestTime)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-white/70">{label}</span>
      </div>
      <span className="text-white font-bold text-lg">{value}</span>
    </div>
  )
}
