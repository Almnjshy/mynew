import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Globe, Trophy, Zap } from 'lucide-react'

export default function OnlineGameScreen() {
  const { setScreen } = useGameStore()

  return (
    <div className="screen-container title-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>
      
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Globe size={64} className="gold-accent" />
        <h2 className="text-3xl font-bold text-white">لعب أونلاين</h2>
        
        <div className="w-full bg-white/10 rounded-xl p-6 flex flex-col gap-4">
          <button className="game-btn game-btn-primary w-full gap-3">
            <Zap size={24} /> لعب سريع (Quick Match)
          </button>
          
          <button className="game-btn game-btn-secondary w-full gap-3">
            <Trophy size={24} /> بطولة (Tournament)
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-white/50 text-sm">قريباً: سيتم إضافة هذه الميزة</p>
          <p className="text-yellow-400 text-xs mt-2">يتطلب حساب واتصال بالإنترنت</p>
        </div>
      </div>
    </div>
  )
}
