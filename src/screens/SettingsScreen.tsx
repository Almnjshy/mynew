import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Volume2, Music, Eye, Trash2, Target, Zap, Lightbulb, Timer } from 'lucide-react'
import type { GameMode, TimerMode } from '@/types/game'
import { TIMER_CONFIG, GAME_MODE_CONFIG } from '@/types/game'
import { soundEngine } from '@/lib/soundEngine'

export default function SettingsScreen() {
  const { settings, updateSettings, resetStatistics, setScreen } = useGameStore()

  const timerOptions: TimerMode[] = ['off', 'blitz', 'rapid', 'custom']
  const modeOptions: GameMode[] = ['classic', 'points', 'block']
  const customTimeOptions = [15, 30, 45, 60, 90, 120, 180, 300]

  const handleSoundToggle = (enabled: boolean) => {
    updateSettings({ soundEnabled: enabled })
    soundEngine.setSoundEnabled(enabled)
    if (enabled) soundEngine.playClick()
  }

  const handleMusicToggle = (enabled: boolean) => {
    updateSettings({ musicEnabled: enabled })
    soundEngine.setMusicEnabled(enabled)
  }

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => { soundEngine.playClick(); setScreen('menu'); }} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent mb-4">الإعدادات</h2>

        <div className="w-full bg-white/10 rounded-xl p-4 flex flex-col gap-4">
          <SettingRow 
            icon={<Volume2 size={24} />} 
            label="الصوت" 
            checked={settings.soundEnabled}
            onChange={handleSoundToggle}
          />
          <SettingRow 
            icon={<Music size={24} />} 
            label="الموسيقى" 
            checked={settings.musicEnabled}
            onChange={handleMusicToggle}
          />
          <SettingRow 
            icon={<Lightbulb size={24} />} 
            label="التلميحات الذكية" 
            checked={settings.showHints}
            onChange={(v) => updateSettings({ showHints: v })}
          />
        </div>

        {/* Default Game Mode */}
        <div className="w-full bg-white/10 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Target size={20} className="gold-accent" />
            نمط اللعب الافتراضي
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {modeOptions.map((mode) => {
              const config = GAME_MODE_CONFIG[mode]
              return (
                <button
                  key={mode}
                  onClick={() => { soundEngine.playClick(); updateSettings({ gameMode: mode }); }}
                  className={`game-btn py-2 text-sm flex flex-col gap-1 ${
                    settings.gameMode === mode ? 'game-btn-primary' : 'game-btn-secondary'
                  }`}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span>{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Default Target Score */}
        {settings.gameMode === 'points' && (
          <div className="w-full bg-white/10 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3">الهدف الافتراضي</h3>
            <div className="flex gap-2">
              {[50, 100, 200, 500].map((score) => (
                <button
                  key={score}
                  onClick={() => { soundEngine.playClick(); updateSettings({ targetScore: score }); }}
                  className={`flex-1 py-2 rounded-lg font-bold text-white transition-all ${
                    settings.targetScore === score ? 'bg-yellow-600 ring-2 ring-white' : 'bg-gray-700'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Default Timer */}
        <div className="w-full bg-white/10 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Timer size={20} className="gold-accent" />
            الزمن الافتراضي
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {timerOptions.map((mode) => (
              <button
                key={mode}
                onClick={() => { soundEngine.playClick(); updateSettings({ timerMode: mode }); }}
                className={`py-2 rounded-lg font-bold text-white transition-all text-sm ${
                  settings.timerMode === mode ? 'bg-yellow-600 ring-2 ring-white' : 'bg-gray-700'
                }`}
              >
                <span className="text-lg block">{TIMER_CONFIG[mode].icon}</span>
                <span>{TIMER_CONFIG[mode].label}</span>
              </button>
            ))}
          </div>

          {settings.timerMode === 'custom' && (
            <div className="mt-3">
              <h4 className="text-white/70 text-sm mb-2 text-center">الوقت المخصص (ثانية)</h4>
              <div className="flex gap-2 flex-wrap justify-center">
                {customTimeOptions.map((time) => (
                  <button
                    key={time}
                    onClick={() => { soundEngine.playClick(); updateSettings({ customTime: time }); }}
                    className={`py-1.5 px-3 rounded-lg font-bold text-sm transition-all ${
                      settings.customTime === time ? 'bg-yellow-600 text-white ring-2 ring-white' : 'bg-gray-700 text-white/70'
                    }`}
                  >
                    {time}ث
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => { soundEngine.playClick(); resetStatistics(); }} className="game-btn game-btn-secondary w-full gap-3 text-red-400">
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
