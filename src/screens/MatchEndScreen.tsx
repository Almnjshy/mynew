import { useGameStore } from '@/store/gameStore'
import { Trophy, Home, RotateCcw } from 'lucide-react'

export default function MatchEndScreen() {
  const { setScreen, statistics } = useGameStore()
  
  const winnerName = sessionStorage.getItem('lastWinner') || 'الكمبيوتر'
  const isPlayerWin = winnerName === 'أنت'

  return (
    <div className="screen-container title-bg">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <img 
          src={isPlayerWin ? "/assets/trophy.png" : "/assets/avatar_ai.png"} 
          alt={isPlayerWin ? "Trophy" : "AI"} 
          className="trophy-img animate-bounce" 
        />
        
        <h2 className="text-3xl font-bold gold-accent">
          {isPlayerWin ? 'مبروك!' : 'انتهت اللعبة'}
        </h2>
        
        <p className="text-white text-xl">
          {isPlayerWin ? 'أنت الفائز!' : `الفائز: ${winnerName}`}
        </p>
        
        <div className="bg-white/10 rounded-xl p-4 w-full">
          <div className="flex justify-between text-white mb-2">
            <span>الألعاب:</span>
            <span className="font-bold">{statistics.gamesPlayed}</span>
          </div>
          <div className="flex justify-between text-green-400 mb-2">
            <span>الفوز:</span>
            <span className="font-bold">{statistics.gamesWon}</span>
          </div>
          <div className="flex justify-between text-red-400">
            <span>الخسارة:</span>
            <span className="font-bold">{statistics.gamesLost}</span>
          </div>
        </div>
        
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
