import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { soundEngine } from '@/lib/soundEngine'
import { getRarityBorder, getRarityColor } from '@/lib/achievements'
import { Trophy, X } from 'lucide-react'

export default function AchievementToast() {
  const { lastUnlocked, achievements, clearLastUnlocked } = useGameStore()

  useEffect(() => {
    if (lastUnlocked.length > 0) {
      soundEngine.playAchievement()
      const timer = setTimeout(() => {
        clearLastUnlocked()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [lastUnlocked, clearLastUnlocked])

  if (lastUnlocked.length === 0) return null

  const unlockedAch = achievements.find(a => a.id === lastUnlocked[0])
  if (!unlockedAch) return null

  const rarityBorder = getRarityBorder(unlockedAch.rarity)
  const rarityColor = getRarityColor(unlockedAch.rarity)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className={`bg-gray-900 border-2 ${rarityBorder} rounded-xl p-4 shadow-2xl min-w-[300px]`}>
        <div className="flex items-start gap-3">
          <div className={`${rarityColor} rounded-full p-2`}>
            <Trophy size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-yellow-400 font-bold text-lg">� إنجاز جديد!</div>
            <div className="text-white font-bold">{unlockedAch.title}</div>
            <div className="text-white/70 text-sm">{unlockedAch.description}</div>
          </div>
          <button onClick={clearLastUnlocked} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
