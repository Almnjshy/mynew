import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Users, Bot } from 'lucide-react'

export default function LevelSelect() {
  const { setScreen, updateSettings } = useGameStore()
  const [playerCount, setPlayerCount] = useState(2)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  const startGame = () => {
    updateSettings({ difficulty })
    sessionStorage.setItem('playerCount', String(playerCount))
    setScreen('game')
  }

  const playerOptions = [
    { count: 2, label: 'لاعبين', desc: 'أنت ضد الكمبيوتر' },
    { count: 3, label: '3 لاعبين', desc: 'أنت + 2 كمبيوتر' },
    { count: 4, label: '4 لاعبين', desc: 'أنت + 3 كمبيوتر' },
  ]

  const diffOptions = [
    { value: 'easy' as const, label: 'سهل', color: 'bg-green-600' },
    { value: 'medium' as const, label: 'متوسط', color: 'bg-yellow-600' },
    { value: 'hard' as const, label: 'صعب', color: 'bg-red-600' },
  ]

  return (
    <div className="screen-container table-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>
      
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <Users size={48} className="gold-accent" />
        <h2 className="text-2xl font-bold text-white">اختر عدد اللاعبين</h2>
        
        <div className="w-full flex flex-col gap-3">
          {playerOptions.map((opt) => (
            <button
              key={opt.count}
              onClick={() => setPlayerCount(opt.count)}
              className={`game-btn w-full text-lg flex flex-col gap-1 ${
                playerCount === opt.count ? 'game-btn-primary' : 'game-btn-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users size={20} />
                {opt.label}
              </span>
              <span className="text-sm opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>

        <div className="w-full">
          <h3 className="text-white text-center mb-3">مستوى الصعوبة</h3>
          <div className="flex gap-2">
            {diffOptions.map((diff) => (
              <button
                key={diff.value}
                onClick={() => setDifficulty(diff.value)}
                className={`flex-1 py-2 rounded-lg font-bold text-white transition-all ${
                  difficulty === diff.value ? diff.color + ' ring-2 ring-white' : 'bg-gray-700'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startGame} className="game-btn game-btn-primary w-full text-xl mt-4">
          ابدأ اللعب
        </button>
      </div>
    </div>
  )
}
