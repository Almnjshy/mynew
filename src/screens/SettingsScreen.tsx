import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Volume2, Music, Eye, Trash2 } from 'lucide-react'

export default function SettingsScreen() {
  const { settings, updateSettings, resetStatistics, setScreen } = useGameStore()

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent mb-4">الإعدادات</h2>

        <div className="w-full bg-white/10 rounded-xl p-4 flex flex-col gap-4">
          <SettingRow 
            icon={<Volume2 size={24} />} 
            label="الصوت" 
            checked={settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
          <SettingRow 
            icon={<Music size={24} />} 
            label="الموسيقى" 
            checked={settings.musicEnabled}
            onChange={(v) => updateSettings({ musicEnabled: v })}
          />
          <SettingRow 
            icon={<Eye size={24} />} 
            label="إظهار التلميحات" 
            checked={settings.showHints}
            onChange={(v) => updateSettings({ showHints: v })}
          />
        </div>

        <button onClick={resetStatistics} className="game-btn game-btn-secondary w-full gap-3 text-red-400">
          <Trash2 size={24} /> مسح الإحصائيات
        </button>
      </div>
    </div>
  )
}

function SettingRow({ icon, label, checked, onChange }: { icon: React.ReactNode, label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between text-white">
      <div className="flex items-center gap-3">
        <span className="gold-accent">{icon}</span>
        <span>{label}</span>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-yellow-500' : 'bg-gray-600'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}