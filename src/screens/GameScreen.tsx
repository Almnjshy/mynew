import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import {
  createInitialState, playTile, drawFromStock, getValidEnds, getAIMove,
  calculateScore, isGameBlocked, getBlockedWinner, canPlayerPlay, skipTurn,
  getBoardEnds
} from '@/lib/gameEngine'
import { getBestMove, getHintMessage } from '@/lib/hintEngine'
import { GameState, DominoTile, TileEnd, TIMER_CONFIG } from '@/types/game'
import { ArrowLeft, RotateCcw, Lightbulb } from 'lucide-react'
import TimerBar from '@/components/TimerBar'
import SnakeBoard from '@/components/SnakeBoard'
import DominoTileComponent from '@/components/DominoTile'
import { soundEngine } from '@/lib/soundEngine'

export default function GameScreen() {
  const store = useGameStore()
  const setScreen = store?.setScreen || (() => {})
  const settings = store?.settings || {
    aiCount: 1,
    timerMode: 'off',
    customTime: 60,
    gameMode: 'classic',
    showHints: true,
    difficulty: 'medium'
  }
  const updateStatistics = store?.updateStatistics || (() => {})
  const checkAndUnlockAchievements = store?.checkAndUnlockAchievements || (() => [])
  const playerName = store?.playerName || 'لاعب'
  const playerAvatar = store?.playerAvatar || ''
  const addHistoryEntry = store?.addHistoryEntry || (() => {})
  const addLeaderboardEntry = store?.addLeaderboardEntry || (() => {})

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [roundEnded, setRoundEnded] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [bestMove, setBestMove] = useState<{ tileIndex: number; end: TileEnd } | null>(null)
  const [timerKey, setTimerKey] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth - 60 : 600
  )

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setAvailableWidth(containerRef.current.clientWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const moveCountRef = useRef(0)
  const playerDrawCountRef = useRef(0)
  const playerHasDrawnRef = useRef(false)

  const getTimeLimit = useCallback(() => {
    if (!settings) return 0
    if (settings.timerMode === 'off') return 0
    if (settings.timerMode === 'custom') return settings.customTime
    return TIMER_CONFIG[settings.timerMode]?.time || 0
  }, [settings])

  const getAINames = useCallback((count: number): string[] => {
    const names = ['الكمبيوتر', 'الذكي', 'المحارب', 'الأسطورة', 'البطل']
    return names.slice(0, count)
  }, [])

  const getAIAvatars = useCallback((count: number): string[] => {
    return Array(count).fill('/assets/avatar_ai.png')
  }, [])

  useEffect(() => {
    try {
      const aiCount = Math.min(Math.max(settings?.aiCount || 1, 1), 4)
      const aiNames = getAINames(aiCount)
      const aiAvatars = getAIAvatars(aiCount)

      const allNames = [playerName || 'أنت', ...aiNames]
      const allAvatars = [playerAvatar || '', ...aiAvatars]

      const state = createInitialState(allNames, allAvatars)
      setGameState(state)
      moveCountRef.current = 0
      playerDrawCountRef.current = 0
      playerHasDrawnRef.current = false
      setRoundEnded(false)
      setHintMessage('')
      setBestMove(null)
      setTimerKey(prev => prev + 1)
      setMessage('')
    } catch (error) {
      console.error('خطأ أثناء تهيئة اللعبة:', error)
      setMessage('حدث خطأ أثناء بدء اللعبة. حاول إعادة المحاولة.')
    }
  }, [playerName, playerAvatar, settings, getAINames, getAIAvatars])

  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded) {
      setHintMessage('')
      setBestMove(null)
      return
    }
    if (gameState.currentPlayerIndex === 0 && settings?.showHints) {
      try {
        const hint = getBestMove(gameState, 0)
        if (hint) {
          setBestMove({ tileIndex: hint.tileIndex, end: hint.end })
          setHintMessage(hint.reason)
        } else {
          const msg = getHintMessage(gameState, 0)
          setHintMessage(msg)
          setBestMove(null)
        }
      } catch {
        setHintMessage('')
        setBestMove(null)
      }
    } else {
      setHintMessage('')
      setBestMove(null)
    }
  }, [gameState, settings?.showHints, roundEnded])

  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded) return
    if (gameState.currentPlayerIndex === 0) return

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (!currentPlayer || !currentPlayer.isAI) return

    setSelectedTile(null)
    setAiThinking(true)

    const timer = setTimeout(() => {
      handleAITurn(currentPlayer.id, availableWidth)
    }, 1500)

    return () => clearTimeout(timer)
  }, [gameState, settings?.difficulty, roundEnded, settings?.gameMode, availableWidth])

  const handleAITurn = useCallback((playerId: string, containerWidth: number) => {
    if (!gameState) return
    const playerIndex = gameState.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return

    const currentPlayer = gameState.players[playerIndex]

    if (isGameBlocked(gameState)) {
      const blockedWinner = getBlockedWinner(gameState)
      handleRoundEnd(blockedWinner?.id === 'player-0')
      setAiThinking(false)
      return
    }

    if (settings?.gameMode === 'block' && !canPlayerPlay(gameState, playerIndex)) {
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage(`${currentPlayer.name} لا يستطيع اللعب - تخطي`)
      setAiThinking(false)
      setTimerKey(prev => prev + 1)
      return
    }

    const aiMove = getAIMove(gameState, playerIndex, settings?.difficulty || 'medium')

    if (aiMove) {
      const result = playTile(gameState, playerIndex, aiMove.tileIndex, aiMove.end, containerWidth)
      if (result.valid && result.newState) {
        moveCountRef.current += 1
        if (settings?.gameMode === 'allFives') {
          const gained = result.newState.players[playerIndex].score - (gameState.players[playerIndex]?.score || 0)
          if (gained > 0) setMessage(`${currentPlayer.name} حصل على ${gained} نقطة!`)
        }
        setGameState(result.newState)
        if (result.newState.isGameOver) handleRoundEnd(result.newState.winner?.id === 'player-0')
      }
    } else {
      if (settings?.gameMode === 'draw' && gameState.stock.length > 0) {
        let newState = drawFromStock(gameState, playerIndex)
        let drawCount = 1
        while (!canPlayerPlay(newState, playerIndex) && newState.stock.length > 0 && drawCount < 3) {
          newState = drawFromStock(newState, playerIndex)
          drawCount++
        }
        setGameState(newState)
        setMessage(`${currentPlayer.name} سحب ${drawCount} قطع`)
      } else {
        const newState = skipTurn(gameState)
        setGameState(newState)
        setMessage(`${currentPlayer.name} تخطى دوره`)
      }
    }
    setAiThinking(false)
  }, [gameState, settings])

  const handleRoundEnd = useCallback((playerWon: boolean) => {
    if (!gameState) return
    setRoundEnded(true)

    const isWin = playerWon
    const playerHand = gameState.players[0]?.hand || []
    const playerScore = calculateScore(playerHand)
    const opponentScores = gameState.players.slice(1).map(p => calculateScore(p.hand))
    const totalOpponentScore = opponentScores.reduce((a, b) => a + b, 0)

    const finalPlayerScore = settings?.gameMode === 'allFives'
      ? gameState.players[0]?.score || 0
      : (isWin ? totalOpponentScore : playerScore)

    try {
      if (typeof updateStatistics === 'function') {
        updateStatistics({
          gamesPlayed: 1,
          gamesWon: isWin ? 1 : 0,
          gamesLost: isWin ? 0 : 1,
          totalScore: finalPlayerScore,
          highestScore: finalPlayerScore,
        })
      }

      const historyEntry = {
        id: `game-${Date.now()}`,
        date: new Date().toISOString(),
        playerName: playerName,
        opponentName: gameState.players[1]?.name || 'الكمبيوتر',
        playerScore: finalPlayerScore,
        opponentScore: isWin ? 0 : totalOpponentScore,
        won: isWin,
        gameMode: settings?.gameMode || 'classic',
        moves: moveCountRef.current,
        duration: 0,
      }
      addHistoryEntry(historyEntry)

      const leaderboardEntry = {
        id: `lb-${Date.now()}`,
        name: playerName,
        avatar: playerAvatar,
        score: finalPlayerScore,
        date: new Date().toISOString(),
        gameMode: settings?.gameMode || 'classic',
      }
      addLeaderboardEntry(leaderboardEntry)

      if (typeof checkAndUnlockAchievements === 'function') {
        checkAndUnlockAchievements({
          totalWins: isWin ? 1 : 0,
          totalGames: 1,
          bestStreak: isWin ? 1 : 0,
          cleanWins: playerDrawCountRef.current === 0 && isWin ? 1 : 0,
          crushingWins: isWin && opponentScores.every(s => s === 0) ? 1 : 0,
          fastestWinMoves: isWin ? moveCountRef.current : 999,
          totalDraws: playerDrawCountRef.current,
          comebacks: 0,
        })
      }
    } catch (error) {
      console.warn('فشل تحديث الإحصائيات:', error)
    }

    setTimeout(() => setScreen('matchEnd'), 2000)
  }, [gameState, settings, playerName, playerAvatar, updateStatistics, addHistoryEntry, addLeaderboardEntry, checkAndUnlockAchievements, setScreen])

  const handleTileClick = (index: number) => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded || aiThinking) return
    if (selectedTile === index) { setSelectedTile(null); return }
    setSelectedTile(index)
    soundEngine.playClick()
  }

  const handlePlayTile = (end: TileEnd) => {
    if (selectedTile === null || !gameState || roundEnded) return
    const result = playTile(gameState, 0, selectedTile, end, availableWidth)
    if (result.valid && result.newState) {
      soundEngine.playTilePlace()
      moveCountRef.current += 1
      setGameState(result.newState)
      setSelectedTile(null)
      setMessage('')
      setTimerKey(prev => prev + 1)
      if (result.newState.isGameOver) handleRoundEnd(result.newState.winner?.id === 'player-0')
    } else {
      soundEngine.playInvalid()
      setMessage(result.message || 'لا يمكن اللعب بهذه القطعة')
    }
  }

  const handleDraw = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded) return
    if (settings?.gameMode === 'block') {
      setMessage('وضع الحظر: لا يمكن السحب!')
      soundEngine.playInvalid()
      return
    }
    const newState = drawFromStock(gameState, 0)
    setGameState(newState)
    playerDrawCountRef.current += 1
    playerHasDrawnRef.current = true
    soundEngine.playDraw()
    setMessage('سحبت قطعة من المخزن')
    setSelectedTile(null)

    if (!canPlayerPlay(newState, 0) && newState.stock.length === 0) {
      const skipped = skipTurn(newState)
      setGameState(skipped)
      setMessage('لا يمكن اللعب بعد السحب - تخطي الدور')
    }
  }

  const handlePass = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded) return
    if (canPlayerPlay(gameState, 0)) {
      setMessage('عندك قطع تقدر تلعبها!')
      soundEngine.playInvalid()
      return
    }
    const newState = skipTurn(gameState)
    setGameState(newState)
    setMessage('تخطيت دورك')
    setSelectedTile(null)
    setTimerKey(prev => prev + 1)
  }

  const handleTimerExpire = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded) return
    if (canPlayerPlay(gameState, 0)) {
      const aiMove = getAIMove(gameState, 0, 'easy')
      if (aiMove) {
        const result = playTile(gameState, 0, aiMove.tileIndex, aiMove.end, availableWidth)
        if (result.valid && result.newState) {
          setGameState(result.newState)
          setMessage('انتهى الوقت - لعبت أفضل قطعة')
          if (result.newState.isGameOver) handleRoundEnd(result.newState.winner?.id === 'player-0')
        }
      } else {
        handlePass()
      }
    } else {
      handlePass()
    }
  }

  const handleRestart = () => {
    soundEngine.playClick()
    setGameState(null)
    setSelectedTile(null)
    setMessage('')
    setAiThinking(false)
    setRoundEnded(false)
    setHintMessage('')
    setBestMove(null)
    moveCountRef.current = 0
    playerDrawCountRef.current = 0
    playerHasDrawnRef.current = false
    setTimerKey(prev => prev + 1)

    setTimeout(() => {
      try {
        const aiCount = Math.min(Math.max(settings?.aiCount || 1, 1), 4)
        const aiNames = getAINames(aiCount)
        const aiAvatars = getAIAvatars(aiCount)
        const allNames = [playerName || 'أنت', ...aiNames]
        const allAvatars = [playerAvatar || '', ...aiAvatars]
        const state = createInitialState(allNames, allAvatars)
        setGameState(state)
      } catch (error) {
        console.error('خطأ في إعادة التشغيل:', error)
      }
    }, 100)
  }

  if (!gameState) {
    return (
      <div className="screen-container table-bg flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">جاري التحميل...</div>
      </div>
    )
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const isPlayerTurn = gameState.currentPlayerIndex === 0
  const timeLimit = getTimeLimit()

  return (
    <div className="screen-container table-bg" ref={containerRef}>
      <div className="flex flex-col h-full w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-black/30 backdrop-blur-sm">
          <button onClick={() => { soundEngine.playClick(); setScreen('menu'); }} className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-center">
            <div className="text-white/60 text-xs">{currentPlayer?.name || ''}</div>
            <div className="text-yellow-400 font-bold text-sm">
              {isPlayerTurn ? 'دورك' : `دور ${currentPlayer?.name || ''}`}
            </div>
          </div>
          <button onClick={handleRestart} className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Timer */}
        {timeLimit > 0 && !roundEnded && (
          <div className="px-3 pt-2">
            <TimerBar
              key={timerKey}
              duration={timeLimit}
              isActive={isPlayerTurn && !aiThinking}
              onExpire={handleTimerExpire}
            />
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mx-3 mt-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-300 text-sm text-center">
            {message}
          </div>
        )}

        {/* AI Thinking */}
        {aiThinking && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 text-white/60 text-sm">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {currentPlayer?.name} يفكر...
            </div>
          </div>
        )}

        {/* Board */}
        <div className="flex-1 min-h-0 px-3 py-2">
          <SnakeBoard
            state={gameState}
            onPlayTile={handlePlayTile}
            selectedTileIndex={selectedTile}
          />
        </div>

        {/* Hint */}
        {hintMessage && !roundEnded && (
          <div className="mx-3 mb-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-300 text-xs text-center flex items-center justify-center gap-2">
            <Lightbulb size={14} />
            {hintMessage}
          </div>
        )}

        {/* Player Hand */}
        <div className="bg-black/40 backdrop-blur-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-sm font-bold">{playerName}</div>
            <div className="text-white/60 text-xs">
              {gameState.players[0]?.hand?.length || 0} قطع
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {gameState.players[0]?.hand?.map((tile, index) => {
              const isSelected = selectedTile === index
              const isPlayable = isPlayerTurn && !roundEnded && !aiThinking && getValidEnds(tile, gameState.board).length > 0
              const isBestMove = bestMove?.tileIndex === index

              return (
                <div
                  key={tile.id}
                  onClick={() => handleTileClick(index)}
                  className={`flex-shrink-0 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'scale-110 -translate-y-2' : ''
                  } ${isBestMove && !isSelected ? 'ring-2 ring-yellow-400 rounded-lg' : ''}`}
                >
                  <DominoTileComponent
                    tile={tile}
                    selected={isSelected}
                    playable={isPlayable}
                    size="sm"
                  />
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          {isPlayerTurn && !roundEnded && !aiThinking && (
            <div className="flex gap-2 mt-2">
              {selectedTile !== null && (
                <>
                  <button
                    onClick={() => handlePlayTile('left')}
                    className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold text-sm transition-colors"
                  >
                    ⬅️ يسار
                  </button>
                  <button
                    onClick={() => handlePlayTile('right')}
                    className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold text-sm transition-colors"
                  >
                    يمين ➡️
                  </button>
                </>
              )}
              {selectedTile === null && (
                <>
                  <button
                    onClick={handleDraw}
                    disabled={settings?.gameMode === 'block'}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                      settings?.gameMode === 'block'
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    📦 سحب
                  </button>
                  <button
                    onClick={handlePass}
                    className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold text-sm transition-colors"
                  >
                    ⏭️ تخطي
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
