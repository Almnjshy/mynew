import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Trophy, RotateCcw, Home, Star, Award } from 'lucide-react'
import AchievementToast from '@/components/AchievementToast'

export default function MatchEndScreen() {
  const { setScreen, statistics, playerName, achievements } = useGameStore()
  const [showToast, setShowToast] = useState(false)
  const [newAchievement, setNewAchievement] = useState<typeof achievements[0] | null>(null)

  const winner = sessionStorage.getItem('lastWinner') || 'الكمبيوتر'
  const points = sessionStorage.getItem('lastRoundPoints') || '0'
  const moves = sessionStorage.getItem('movesCount') || '0'
  const isPlayerWin = winner === playerName

  // Check for newly unlocked achievements
  useEffect(() => {
    const stored = sessionStorage.getItem('newAchievements')
    if (stored) {
      try {
        const unlockedIds: string[] = JSON.parse(stored)
        if (unlockedIds.length > 0) {
          // Show first achievement
          const ach = achievements.find(a => a.id === unlockedIds[0])
          if (ach) {
            setNewAchievement(ach)
            setShowToast(true)
          }
          // Clear the stored achievements
          sessionStorage.removeItem('newAchievements')
        }
      } catch {
        sessionStorage.removeItem('newAchievements')
      }
    }
  }, [achievements])

  const handlePlayAgain = () => {
    setScreen('levelSelect')
  }

  const handleMainMenu = () => {
    setScreen('menu')
  }

  return (
    <div className="screen-container wood-bg">
      {/* Achievement Toast */}
      {showToast && newAchievement && (
        <AchievementToast
          achievement={newAchievement}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className={`p-6 rounded-full ${isPlayerWin ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
          <Trophy size={64} className={isPlayerWin ? 'text-yellow-400' : 'text-red-400'} />
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isPlayerWin ? 'فوز! 🎉' : 'خسارة 😔'}
          </h2>
          <p className="text-white/70">
            {isPlayerWin ? `مبروك ${winner}!` : `الفائز: ${winner}`}
          </p>
        </div>

        <div className="w-full bg-white/10 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/60">النقاط المكتسبة</span>
            <span className="text-2xl font-bold text-yellow-400">{points}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60">عدد الحركات</span>
            <span className="text-xl font-bold text-white">{moves}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60">إجمالي الألعاب</span>
            <span className="text-xl font-bold text-white">{statistics.gamesPlayed}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60">الإنجازات</span>
            <span className="text-xl font-bold text-yellow-400">
              {achievements.filter(a => a.unlockedAt).length}/{achievements.length}
            </span>
          </div>
        </div>

        {/* Show newly unlocked achievements */}
        {achievements.filter(a => {
          const unlocked = a.unlockedAt
          if (!unlocked) return false
          // Show if unlocked in the last minute
          const unlockTime = new Date(unlocked).getTime()
          return Date.now() - unlockTime < 60000
        }).length > 0 && (
          <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award size={20} className="text-yellow-400" />
              <span className="text-yellow-400 font-bold">إنجازات جديدة!</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.filter(a => {
                const unlocked = a.unlockedAt
                if (!unlocked) return false
                const unlockTime = new Date(unlocked).getTime()
                return Date.now() - unlockTime < 60000
              }).map(a => (
                <div key={a.id} className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                  <Star size={14} className="text-yellow-400" />
                  <span className="text-white text-xs">{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button onClick={handlePlayAgain} className="game-btn game-btn-primary w-full gap-3">
            <RotateCcw size={24} /> لعب مرة أخرى
          </button>
          <button onClick={handleMainMenu} className="game-btn game-btn-secondary w-full gap-3">
            <Home size={24} /> القائمة الرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}