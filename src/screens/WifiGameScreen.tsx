import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Wifi, Users, Radio } from 'lucide-react'

export default function WifiGameScreen() {
  const { setScreen } = useGameStore()

  return (
    <div className="screen-container table-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>
      
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <Wifi size={64} className="gold-accent" />
        <h2 className="text-3xl font-bold text-white">لعب عبر WiFi</h2>
        
        <div className="w-full bg-white/10 rounded-xl p-6 flex flex-col gap-4">
          <button className="game-btn game-btn-primary w-full gap-3">
            <Radio size={24} /> إنشاء غرفة (Host)
          </button>
          
          <div className="text-center text-white/60 text-sm">— أو —</div>
          
          <button className="game-btn game-btn-secondary w-full gap-3">
            <Users size={24} /> الانضمام لغرفة
          </button>
        </div>
        
        <p className="text-white/50 text-center text-sm">
          قريباً: سيتم إضافة هذه الميزة في التحديث القادم
        </p>
      </div>
    </div>
  )
}
