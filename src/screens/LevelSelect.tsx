import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Bot } from 'lucide-react'

export default function LevelSelect() {
  const { setScreen, updateSettings } = useGameStore()

  const selectDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
    updateSettings({ difficulty: diff })
    setScreen('game')
  }

  return (
    <div className="screen-container table-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <Bot size={64} className="gold-accent" />
        <h2 className="text-3xl font-bold text-white mb-4">اختر المستوى</h2>

        <button onClick={() => selectDifficulty('easy')} className="game-btn game-btn-secondary w-full text-lg">
          سهل
        </button>
        <button onClick={() => selectDifficulty('medium')} className="game-btn game-btn-primary w-full text-lg">
          متوسط
        </button>
        <button onClick={() => selectDifficulty('hard')} className="game-btn game-btn-secondary w-full text-lg">
          صعب
        </button>
      </div>
    </div>
  )
}