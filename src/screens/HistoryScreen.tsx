import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, Trophy, Calendar, Filter, Trash2, Clock, Target, Zap } from 'lucide-react'
import type { GameRecord, GameMode } from '@/types/game'

export default function HistoryScreen() {
  const { gameHistory, setScreen, clearHistory } = useGameStore()
  const [filterMode, setFilterMode] = useState<GameMode | 'all'>('all')
  const [filterResult, setFilterResult] = useState<'all' | 'win' | 'loss'>('all')

  const filtered = gameHistory.filter((record) => {
    const modeMatch = filterMode === 'all' || record.gameMode === filterMode
    const resultMatch = filterResult === 'all' || record.result === filterResult
    return modeMatch && resultMatch
  })

  const wins = filtered.filter(r => r.result === 'win').length
  const losses = filtered.filter(r => r.result === 'loss').length

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('statistics')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-4 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent">السجل</h2>

        {/* Summary */}
        <div className="w-full bg-white/10 rounded-xl p-4 flex justify-around">
          <div className="text-center">
            <div className="text-green-400 font-bold text-xl">{wins}</div>
            <div className="text-white/60 text-sm">فوز</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-bold text-xl">{losses}</div>
            <div className="text-white/60 text-sm">خسارة</div>
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-xl">{filtered.length}</div>
            <div className="text-white/60 text-sm">المجموع</div>
          </div>
        </div>

        {/* Filters */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Filter size={16} />
            <span>تصفية</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filterMode === 'all' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterMode('classic')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                filterMode === 'classic' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              <Zap size={14} /> كلاسيكي
            </button>
            <button
              onClick={() => setFilterMode('points')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                filterMode === 'points' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              <Target size={14} /> نقاط
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterResult('all')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filterResult === 'all' ? 'bg-white/20 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterResult('win')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filterResult === 'win' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              فوز
            </button>
            <button
              onClick={() => setFilterResult('loss')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filterResult === 'loss' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white/70'
              }`}
            >
              خسارة
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="w-full flex flex-col gap-2 overflow-y-auto max-h-[50vh] pb-4">
          {filtered.length === 0 ? (
            <div className="text-white/40 text-center py-8">
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              لا يوجد سجل بعد
            </div>
          ) : (
            filtered.map((record) => (
              <HistoryCard key={record.id} record={record} formatDate={formatDate} formatDuration={formatDuration} />
            ))
          )}
        </div>

        {/* Clear button */}
        {gameHistory.length > 0 && (
          <button 
            onClick={clearHistory}
            className="game-btn game-btn-secondary w-full gap-2 text-red-400 text-sm"
          >
            <Trash2 size={16} /> مسح السجل
          </button>
        )}
      </div>
    </div>
  )
}

function HistoryCard({ 
  record, 
  formatDate, 
  formatDuration 
}: { 
  record: GameRecord
  formatDate: (d: string) => string
  formatDuration: (s?: number) => string
}) {
  const isWin = record.result === 'win'

  return (
    <div className={`w-full rounded-xl p-3 border-2 ${
      isWin ? 'bg-green-900/30 border-green-600/30' : 'bg-red-900/30 border-red-600/30'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isWin ? (
            <Trophy size={18} className="text-green-400" />
          ) : (
            <span className="text-red-400 text-lg">✕</span>
          )}
          <span className={`font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
            {isWin ? 'فوز' : 'خسارة'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-white/50 text-xs">
          <Calendar size={12} />
          {formatDate(record.date)}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-white/80">
          <span className="font-bold">{record.playerName}</span>
          <span className="text-white/40 mx-1">vs</span>
          <span>{record.opponentName}</span>
        </div>
        <div className="flex items-center gap-2">
          {record.gameMode === 'points' ? (
            <span className="text-yellow-400/80 text-xs flex items-center gap-1">
              <Target size={12} /> {record.playerScore}-{record.opponentScore}
            </span>
          ) : (
            <span className="text-white/50 text-xs">{record.rounds} جولة</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
        <span className="flex items-center gap-1">
          <Zap size={10} /> {record.difficulty === 'easy' ? 'سهل' : record.difficulty === 'medium' ? 'متوسط' : 'صعب'}
        </span>
        {record.duration && (
          <span className="flex items-center gap-1">
            <Clock size={10} /> {formatDuration(record.duration)}
          </span>
        )}
        {record.targetScore && (
          <span className="flex items-center gap-1">
            <Target size={10} /> هدف: {record.targetScore}
          </span>
        )}
      </div>
    </div>
  )
}