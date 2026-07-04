import { useGameStore } from '@/store/gameStore'
import { Trophy, Settings, BarChart3, Play, Wifi, Globe } from 'lucide-react'

export default function MainMenu() {
  const { setScreen } = useGameStore()

  return (
    <div className="screen-container wood-bg">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <img src="/assets/trophy.png" alt="Trophy" className="trophy-img" />
        <h1 className="text-4xl font-bold gold-accent mb-2">DOMINO</h1>
        
        <button onClick={() => setScreen('levelSelect')} className="game-btn game-btn-primary w-full gap-3">
          <Play size={24} /> ابدأ اللعب
        </button>
        
        <button onClick={() => setScreen('wifiGame')} className="game-btn game-btn-secondary w-full gap-3">
          <Wifi size={24} /> لعب مع الأصدقاء (WiFi)
        </button>
        
        <button onClick={() => setScreen('onlineGame')} className="game-btn game-btn-secondary w-full gap-3">
          <Globe size={24} /> لعب أونلاين
        </button>
        
        <button onClick={() => setScreen('statistics')} className="game-btn game-btn-secondary w-full gap-3">
          <BarChart3 size={24} /> الإحصائيات
        </button>
        
        <button onClick={() => setScreen('settings')} className="game-btn game-btn-secondary w-full gap-3">
          <Settings size={24} /> الإعدادات
        </button>
      </div>
    </div>
  )
}
