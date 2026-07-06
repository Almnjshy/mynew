import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Globe, Wifi } from 'lucide-react'

export default function OnlineGameScreen() {
  const { setScreen } = useGameStore()

  // Auto-redirect to WiFi after 2 seconds with a message
  useEffect(() => {
    const timer = setTimeout(() => {
      // User can manually navigate, no auto-redirect to avoid confusion
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="screen-container title-bg">
      <button 
        onClick={() => setScreen('menu')} 
        className="absolute top-4 left-4 text-white p-2"
      >
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Globe size={64} className="gold-accent" />
        <h2 className="text-3xl font-bold text-white">لعب أونلاين</h2>

        <div className="w-full bg-white/10 rounded-xl p-6 flex flex-col gap-4">
          <div className="text-center mb-4">
            <p className="text-white/70 text-sm">
              وضع اللعب أونلاين عبر الإنترنت قيد التطوير
            </p>
            <p className="text-yellow-400 text-xs mt-2">
              يمكنك استخدام وضع WiFi للعب مع الأصدقاء على نفس الشبكة
            </p>
          </div>

          <button 
            onClick={() => setScreen('wifiGame')} 
            className="game-btn game-btn-primary w-full gap-3"
          >
            <Wifi size={24} /> الانتقال للعب عبر WiFi
          </button>

          <button 
            onClick={() => setScreen('menu')} 
            className="game-btn game-btn-secondary w-full gap-3"
          >
            <ArrowLeft size={24} /> العودة للقائمة
          </button>
        </div>

        <div className="text-center">
          <p className="text-white/40 text-xs">
            سيتم إضافة اللعب أونلاين في التحديث القادم
          </p>
        </div>
      </div>
    </div>
  )
}