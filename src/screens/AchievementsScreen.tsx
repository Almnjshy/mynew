import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Lock, Trophy } from 'lucide-react'
import { getRarityColor, getRarityBorder, getRarityLabel } from '@/lib/achievements'

export default function AchievementsScreen() {
  const { achievements, setScreen } = useGameStore()

  const unlockedCount = achievements.filter(a => a.unlockedAt).length
  const totalCount = achievements.length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('statistics')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm mt-12">
        <Trophy size={48} className="gold-accent" />
        <h2 className="text-3xl font-bold gold-accent">الإنجازات</h2>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-xl p-4 mb-2">
          <div className="flex justify-between text-white mb-2">
            <span>التقدم</span>
            <span className="font-bold">{unlockedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-center text-yellow-400 text-sm mt-1">{progressPercent}%</div>
        </div>

        {/* Achievements list */}
        <div className="w-full flex flex-col gap-3 overflow-y-auto max-h-[60vh] pb-4">
          {achievements.map((ach) => {
            const isUnlocked = !!ach.unlockedAt
            const rarityColor = getRarityColor(ach.rarity)
            const rarityBorder = getRarityBorder(ach.rarity)
            const rarityLabel = getRarityLabel(ach.rarity)

            return (
              <div
                key={ach.id}
                className={`relative w-full rounded-xl p-4 transition-all ${
                  isUnlocked 
                    ? 'bg-white/15 border-2 ' + rarityBorder 
                    : 'bg-white/5 border-2 border-gray-700 opacity-60'
                }`}
              >
                {/* Rarity badge */}
                <div className={`absolute top-2 left-2 ${rarityColor} text-white text-xs px-2 py-0.5 rounded-full`}>
                  {rarityLabel}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`text-4xl ${isUnlocked ? '' : 'grayscale'}`}>
                    {isUnlocked ? ach.icon : <Lock size={32} className="text-gray-500" />}
                  </div>

                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                      {ach.title}
                    </h3>
                    <p className={`text-sm ${isUnlocked ? 'text-white/70' : 'text-gray-500'}`}>
                      {ach.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar for locked achievements */}
                {!isUnlocked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>التقدم</span>
                      <span>{ach.progress}/{ach.maxProgress}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-500 rounded-full transition-all"
                        style={{ width: `${(ach.progress / ach.maxProgress) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {isUnlocked && (
                  <div className="mt-2 text-green-400 text-sm text-right">
                    ✅ مُنجز — {new Date(ach.unlockedAt!).toLocaleDateString('ar-SA')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}