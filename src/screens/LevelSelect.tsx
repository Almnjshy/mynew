import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Users, Target, Zap, Timer, Lock } from 'lucide-react'
import type { GameMode, Difficulty, TimerMode } from '@/types/game'
import { TIMER_CONFIG, GAME_MODE_CONFIG } from '@/types/game'

export default function LevelSelect() {
  const { setScreen, updateSettings, settings } = useGameStore()
  const [playerCount, setPlayerCount] = useState(2)
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty)
  const [gameMode, setGameMode] = useState<GameMode>(settings.gameMode)
  const [targetScore, setTargetScore] = useState(settings.targetScore)
  const [timerMode, setTimerMode] = useState<TimerMode>(settings.timerMode)
  const [customTime, setCustomTime] = useState(settings.customTime)

  const startGame = () => {
    updateSettings({ difficulty, gameMode, targetScore, timerMode, customTime })
    sessionStorage.setItem('playerCount', String(playerCount))

    if (gameMode === 'points') {
      const { initMatchState } = useGameStore.getState()
      initMatchState(targetScore)
    }

    setScreen('game')
  }

  const playerOptions = [
    { count: 2, label: 'لاعبين', desc: 'أنت ضد الكمبيوتر' },
    { count: 3, label: '3 لاعبين', desc: 'أنت + 2 كمبيوتر' },
    { count: 4, label: '4 لاعبين', desc: 'أنت + 3 كمبيوتر' },
  ]

  const diffOptions = [
    { value: 'easy' as const, label: 'سهل', color: 'bg-green-600' },
    { value: 'medium' as const, label: 'متوسط', color: 'bg-yellow-600' },
    { value: 'hard' as const, label: 'صعب', color: 'bg-red-600' },
  ]

  const modeOptions: GameMode[] = ['classic', 'points', 'block', 'allFives', 'draw']
  const timerOptions: TimerMode[] = ['off', 'blitz', 'rapid', 'custom']
  const targetOptions = [50, 100, 200, 500]
  const customTimeOptions = [15, 30, 45, 60, 90, 120, 180, 300]

  return (
    <div className="screen-container table-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-5 w-full max-w-sm overflow-y-auto py-4">
        <Users size={48} className="gold-accent" />
        <h2 className="text-2xl font-bold text-white">اختر عدد اللاعبين</h2>

        <div className="w-full flex flex-col gap-3">
          {playerOptions.map((opt) => (
            <button
              key={opt.count}
              onClick={() => setPlayerCount(opt.count)}
              className={`game-btn w-full text-lg flex flex-col gap-1 ${
                playerCount === opt.count ? 'game-btn-primary' : 'game-btn-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users size={20} />
                {opt.label}
              </span>
              <span className="text-sm opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>

        {/* Game Mode Selection */}
        <div className="w-full">
          <h3 className="text-white text-center mb-3">نمط اللعب</h3>
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map((mode) => {
              const config = GAME_MODE_CONFIG[mode]
              const isLocked = mode === 'allFives' || mode === 'draw'

              return (
                <button
                  key={mode}
                  onClick={() => !isLocked && setGameMode(mode)}
                  disabled={isLocked}
                  className={`game-btn py-3 text-sm flex flex-col gap-1 relative ${
                    gameMode === mode ? 'game-btn-primary' : 'game-btn-secondary'
                  } ${isLocked ? 'opacity-40' : ''}`}
                >
                  {isLocked && (
                    <div className="absolute top-1 right-1">
                      <Lock size={12} className="text-white/50" />
                    </div>
                  )}
                  <span className="text-lg">{config.icon}</span>
                  <span>{config.label}</span>
                  <span className="text-xs opacity-60">{config.desc}</span>
                </button>
              )
            })}
          </div>
          {(gameMode === 'allFives' || gameMode === 'draw') && (
            <p className="text-yellow-400/60 text-xs text-center mt-2">
              قريباً: سيتم إضافة هذا النمط في التحديث القادم
            </p>
          )}
        </div>

        {/* Target Score (only for points mode) */}
        {gameMode === 'points' && (
          <div className="w-full">
            <h3 className="text-white text-center mb-3">الهدف (نقطة)</h3>
            <div className="flex gap-2">
              {targetOptions.map((score) => (
                <button
                  key={score}
                  onClick={() => setTargetScore(score)}
                  className={`flex-1 py-2 rounded-lg font-bold text-white transition-all ${
                    targetScore === score ? 'bg-yellow-600 ring-2 ring-white' : 'bg-gray-700'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timer Selection */}
        <div className="w-full">
          <h3 className="text-white text-center mb-3 flex items-center justify-center gap-2">
            <Timer size={20} className="gold-accent" />
            الزمن
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {timerOptions.map((mode) => (
              <button
                key={mode}
                onClick={() => setTimerMode(mode)}
                className={`game-btn py-2 text-sm flex flex-col gap-1 ${
                  timerMode === mode ? 'game-btn-primary' : 'game-btn-secondary'
                }`}
              >
                <span className="text-lg">{TIMER_CONFIG[mode].icon}</span>
                <span>{TIMER_CONFIG[mode].label}</span>
              </button>
            ))}
          </div>

          {timerMode === 'custom' && (
            <div className="mt-3">
              <h4 className="text-white/70 text-sm mb-2 text-center">اختر الوقت (ثانية)</h4>
              <div className="flex gap-2 flex-wrap justify-center">
                {customTimeOptions.map((time) => (
                  <button
                    key={time}
                    onClick={() => setCustomTime(time)}
                    className={`py-1.5 px-3 rounded-lg font-bold text-sm transition-all ${
                      customTime === time ? 'bg-yellow-600 text-white ring-2 ring-white' : 'bg-gray-700 text-white/70'
                    }`}
                  >
                    {time}ث
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full">
          <h3 className="text-white text-center mb-3">مستوى الصعوبة</h3>
          <div className="flex gap-2">
            {diffOptions.map((diff) => (
              <button
                key={diff.value}
                onClick={() => setDifficulty(diff.value)}
                className={`flex-1 py-2 rounded-lg font-bold text-white transition-all ${
                  difficulty === diff.value ? diff.color + ' ring-2 ring-white' : 'bg-gray-700'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startGame} className="game-btn game-btn-primary w-full text-xl mt-4">
          ابدأ اللعب
        </button>
      </div>
    </div>
  )
}
