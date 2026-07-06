import { useGameStore } from '@/store/gameStore'
import { soundEngine } from '@/lib/soundEngine'
import { Trophy, Settings, BarChart3, Play, Wifi, Globe, User, Crown, Swords } from 'lucide-react'

export default function MainMenu() {
  const { setScreen, playerName, playerAvatar } = useGameStore()

  const handleNavigate = (screen: any) => {
    soundEngine.playClick()
    setScreen(screen)
  }

  return (
    <div className="screen-container wood-bg">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Player Profile Preview */}
        <button 
          onClick={() => handleNavigate('profile')}
          className="flex items-center gap-3 bg-white/10 rounded-xl p-3 w-full transition-all hover:bg-white/20"
        >
          <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
            <img 
              src={playerAvatar} 
              alt="Player" 
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.style.backgroundColor = '#3498db'
                  parent.innerText = playerName.charAt(0) || 'أ'
                  parent.style.fontSize = '1.2rem'
                  parent.style.fontWeight = 'bold'
                }
              }}
            />
          </div>
          <div className="text-right flex-1">
            <div className="text-white/60 text-xs">مرحباً</div>
            <div className="text-white font-bold text-lg">{playerName}</div>
          </div>
          <User size={20} className="text-white/40" />
        </button>

        <img src="./assets/trophy.png" alt="Trophy" className="trophy-img" />
        <h1 className="text-4xl font-bold gold-accent mb-2">DOMINO</h1>

        <button onClick={() => handleNavigate('levelSelect')} className="game-btn game-btn-primary w-full gap-3">
          <Play size={24} /> ابدأ اللعب
        </button>

        <button onClick={() => handleNavigate('tournamentMenu')} className="game-btn game-btn-primary w-full gap-3 border-2 border-yellow-500/50">
          <Swords size={24} /> البطولات
        </button>

        <button onClick={() => handleNavigate('leaderboard')} className="game-btn game-btn-secondary w-full gap-3">
          <Crown size={24} /> لوحة المتصدرين
        </button>

        <button onClick={() => handleNavigate('wifiGame')} className="game-btn game-btn-secondary w-full gap-3">
          <Wifi size={24} /> لعب مع الأصدقاء (WiFi)
        </button>

        <button onClick={() => handleNavigate('onlineGame')} className="game-btn game-btn-secondary w-full gap-3 opacity-50">
          <Globe size={24} /> لعب أونلاين (قريباً)
        </button>

        <button onClick={() => handleNavigate('statistics')} className="game-btn game-btn-secondary w-full gap-3">
          <BarChart3 size={24} /> الإحصائيات
        </button>

        <button onClick={() => handleNavigate('settings')} className="game-btn game-btn-secondary w-full gap-3">
          <Settings size={24} /> الإعدادات
        </button>
      </div>
    </div>
  )
}