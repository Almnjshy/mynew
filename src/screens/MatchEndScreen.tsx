import { useGameStore } from '@/store/gameStore'
import { Trophy, Home, RotateCcw } from 'lucide-react'

export default function MatchEndScreen() {
  const { setScreen } = useGameStore()

  return (
    <div className="screen-container title-bg">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <img src="/assets/trophy.png" alt="Trophy" className="trophy-img animate-bounce" />
        <h2 className="text-3xl font-bold gold-accent">انتهت اللعبة!</h2>
        <p className="text-white text-xl">الفائز: الكمبيوتر</p>

        <button onClick={() => setScreen('game')} className="game-btn game-btn-primary w-full gap-3">
          <RotateCcw size={24} /> لعب مرة أخرى
        </button>
        <button onClick={() => setScreen('menu')} className="game-btn game-btn-secondary w-full gap-3">
          <Home size={24} /> القائمة الرئيسية
        </button>
      </div>
    </div>
  )
}