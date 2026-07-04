import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Trophy, Medal, Crown, Trash2, Filter } from 'lucide-react'
import type { GameMode, Difficulty } from '@/types/game'
import { GAME_MODE_CONFIG } from '@/types/game'

export default function LeaderboardScreen() {
  const { leaderboard, setScreen, clearLeaderboard } = useGameStore()
  const [filterMode, setFilterMode] = useState<GameMode | 'all'>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all')

  const filtered = leaderboard.filter((entry) => {
    const modeMatch = filterMode === 'all' || entry.gameMode === filterMode
    const diffMatch = filterDifficulty === 'all' || entry.difficulty === filterDifficulty
    return modeMatch && diffMatch
  })

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={20} className="text-yellow-400" />
    if (index === 1) return <Medal size={20} className="text-gray-300" />
    if (index === 2) return <Medal size={20} className="text-amber-600" />
    return <span className="text-white/40 text-sm font-bold w-5 text-center">{index + 1}</span>
  }

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-yellow-500/20 border-yellow-500/40'
    if (index === 1) return 'bg-gray-400/10 border-gray-400/30'
    if (index === 2) return 'bg-amber-700/20 border-amber-700/40'
    return 'bg-white/5 border-white/10'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
    })
  }

  const modeOptions: GameMode[] = ['classic', 'points', 'block', 'allFives', 'draw']
  const diffOptions: Difficulty[] = ['easy', 'medium', 'hard']

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm mt-12">
        <Trophy size={48} className="gold-accent" />
        <h2 className="text-3xl font-bold gold-accent">لوحة المتصدرين</h2>

        {/* Filters */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Filter size={16} />
            <span>تصفية</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === 'all' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              الكل
            </button>
            {modeOptions.map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === mode ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-white/70'
                }`}
              >
                {GAME_MODE_CONFIG[mode].icon}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterDifficulty('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterDifficulty === 'all' ? 'bg-white/20 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              الكل
            </button>
            {diffOptions.map((diff) => (
              <button
                key={diff}
                onClick={() => setFilterDifficulty(diff)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterDifficulty === diff 
                    ? diff === 'easy' ? 'bg-green-600 text-white' 
                    : diff === 'medium' ? 'bg-yellow-600 text-white' 
                    : 'bg-red-600 text-white'
                    : 'bg-gray-700 text-white/70'
                }`}
              >
                {diff === 'easy' ? 'سهل' : diff === 'medium' ? 'متوسط' : 'صعب'}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="w-full flex flex-col gap-2 overflow-y-auto max-h-[55vh] pb-4">
          {filtered.length === 0 ? (
            <div className="text-white/40 text-center py-8">
              <Trophy size={48} className="mx-auto mb-2 opacity-50" />
              لا يوجد متصدرين بعد
              <p className="text-sm mt-2">العب وفز لدخول اللوحة!</p>
            </div>
          ) : (
            filtered.map((entry, index) => (
              <div
                key={entry.id}
                className={`w-full rounded-xl p-3 border-2 ${getRankBg(index)}`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(index)}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 border border-white/20">
                    <img
                      src={entry.playerAvatar}
                      alt={entry.playerName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.style.backgroundColor = '#3498db'
                          parent.innerText = entry.playerName.charAt(0) || 'أ'
                          parent.style.fontSize = '1rem'
                          parent.style.fontWeight = 'bold'
                          parent.style.display = 'flex'
                          parent.style.alignItems = 'center'
                          parent.style.justifyContent = 'center'
                        }
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold truncate">{entry.playerName}</span>
                      <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                        {GAME_MODE_CONFIG[entry.gameMode].icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>{entry.difficulty === 'easy' ? 'سهل' : entry.difficulty === 'medium' ? 'متوسط' : 'صعب'}</span>
                      <span>•</span>
                      <span>{entry.moves} حركة</span>
                      <span>•</span>
                      <span>{formatDate(entry.date)}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-yellow-400 font-bold text-lg">{entry.score}</div>
                    <div className="text-white/40 text-xs">نقطة</div>
                  </div>
                </div>

                {/* Win streak badge */}
                {entry.winStreak > 2 && (
                  <div className="mt-2 flex items-center gap-1 text-orange-400 text-xs">
                    <span>🔥</span>
                    <span>سلسلة فوز: {entry.winStreak}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Clear button */}
        {leaderboard.length > 0 && (
          <button 
            onClick={clearLeaderboard}
            className="game-btn game-btn-secondary w-full gap-2 text-red-400 text-sm"
          >
            <Trash2 size={16} /> مسح اللوحة
          </button>
        )}
      </div>
    </div>
  )
}