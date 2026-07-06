import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useTournamentStore } from '@/store/tournamentStore'
import { soundEngine } from '@/lib/soundEngine'
import { ArrowLeft, Users, Trophy, Target, Gamepad2, ChevronRight } from 'lucide-react'
import type { TournamentSize } from '@/types/tournament'
import { TOURNAMENT_SIZE_CONFIG } from '@/types/tournament'

export default function TournamentCreateScreen() {
  const { setScreen, playerName, playerAvatar, settings } = useGameStore()
  const { createTournament } = useTournamentStore()

  const [name, setName] = useState(`بطولة ${playerName}`)
  const [size, setSize] = useState<TournamentSize>(4)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(settings.difficulty)
  const [gameMode, setGameMode] = useState<'classic' | 'points' | 'block' | 'allFives' | 'draw'>(settings.gameMode)
  const [targetScore, setTargetScore] = useState(settings.targetScore)

  const handleCreate = () => {
    soundEngine.playClick()

    const tournament = createTournament({
      name: name.trim() || `بطولة ${playerName}`,
      size,
      playerName,
      playerAvatar,
      difficulty,
      gameMode,
      targetScore,
    })

    setScreen('tournamentBracket')
  }

  const sizeOptions: { value: TournamentSize; label: string; icon: string }[] = [
    { value: 4, label: '4 لاعبين', icon: '👥' },
    { value: 8, label: '8 لاعبين', icon: '🏆' },
    { value: 16, label: '16 لاعب', icon: '👑' },
  ]

  const difficultyOptions = [
    { value: 'easy' as const, label: 'سهل', color: 'text-green-400' },
    { value: 'medium' as const, label: 'متوسط', color: 'text-yellow-400' },
    { value: 'hard' as const, label: 'صعب', color: 'text-red-400' },
  ]

  const gameModeOptions = [
    { value: 'classic' as const, label: 'كلاسيك', desc: 'أول من ينتهي يفوز' },
    { value: 'points' as const, label: 'نقاط', desc: 'جمع النقاط حتى الهدف' },
    { value: 'block' as const, label: 'حظر', desc: 'لا سحب من المخزن' },
    { value: 'allFives' as const, label: 'كل الخمسات', desc: 'نقاط على مضاعفات 5' },
    { value: 'draw' as const, label: 'سحب', desc: 'السحب الإجباري' },
  ]

  return (
    <div className="screen-container wood-bg">
      <button 
        onClick={() => { soundEngine.playClick(); setScreen('tournamentMenu') }}
        className="absolute top-4 left-4 text-white p-2"
      >
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm overflow-y-auto pb-4">
        <div className="p-3 bg-yellow-500/20 rounded-full">
          <Trophy size={36} className="text-yellow-400" />
        </div>

        <h1 className="text-2xl font-bold gold-accent">بطولة جديدة</h1>

        {/* Tournament Name */}
        <div className="w-full">
          <label className="text-white/60 text-sm mb-2 block text-right">اسم البطولة</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-right"
            placeholder="اسم البطولة"
            maxLength={30}
          />
        </div>

        {/* Tournament Size */}
        <div className="w-full">
          <label className="text-white/60 text-sm mb-2 block text-right">عدد اللاعبين</label>
          <div className="grid grid-cols-3 gap-2">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => { soundEngine.playClick(); setSize(option.value) }}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  size === option.value
                    ? 'border-yellow-500 bg-yellow-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className="text-white text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="w-full">
          <label className="text-white/60 text-sm mb-2 block text-right">مستوى الصعوبة</label>
          <div className="flex gap-2">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => { soundEngine.playClick(); setDifficulty(option.value) }}
                className={`flex-1 py-2 rounded-xl border-2 transition-all ${
                  difficulty === option.value
                    ? 'border-yellow-500 bg-yellow-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <span className={`font-medium ${option.color}`}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode */}
        <div className="w-full">
          <label className="text-white/60 text-sm mb-2 block text-right">وضع اللعب</label>
          <div className="space-y-2">
            {gameModeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => { soundEngine.playClick(); setGameMode(option.value) }}
                className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                  gameMode === option.value
                    ? 'border-yellow-500 bg-yellow-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="text-right">
                  <div className="text-white font-medium">{option.label}</div>
                  <div className="text-white/40 text-xs">{option.desc}</div>
                </div>
                <Gamepad2 size={20} className="text-white/40" />
              </button>
            ))}
          </div>
        </div>

        {/* Target Score (for points mode) */}
        {(gameMode === 'points' || gameMode === 'allFives') && (
          <div className="w-full">
            <label className="text-white/60 text-sm mb-2 block text-right">
              <Target size={14} className="inline ml-1" />
              هدف النقاط
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-white font-bold w-16 text-center">{targetScore}</span>
            </div>
          </div>
        )}

        {/* Rounds Preview */}
        <div className="w-full bg-white/5 rounded-xl p-4">
          <div className="text-white/60 text-sm mb-2 text-right">مراحل البطولة</div>
          <div className="flex items-center gap-2 flex-wrap">
            {TOURNAMENT_SIZE_CONFIG[size].rounds.map((round, i) => (
              <span key={round} className="text-white/80 text-sm">
                {round}
                {i < TOURNAMENT_SIZE_CONFIG[size].rounds.length - 1 && (
                  <ChevronRight size={14} className="inline mx-1 text-white/30" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button 
          onClick={handleCreate}
          className="game-btn game-btn-primary w-full gap-3"
        >
          <Trophy size={24} /> إنشاء البطولة
        </button>
      </div>
    </div>
  )
}