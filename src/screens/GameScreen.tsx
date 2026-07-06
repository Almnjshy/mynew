import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { 
  createInitialState, playTile, drawFromStock, getValidEnds, getAIMove, 
  calculateScore, isGameBlocked, getBlockedWinner, canPlayerPlay, skipTurn,
  getBoardEnds
} from '@/lib/gameEngine'
import { getBestMove, getHintMessage, shouldDraw } from '@/lib/hintEngine'
import { GameState, DominoTile, TileEnd, TIMER_CONFIG, BoardTile, GameRecord } from '@/types/game'
import { ArrowLeft, RotateCcw, Trophy, Lightbulb, Users, User } from 'lucide-react'
import TimerBar from '@/components/TimerBar'
import SnakeBoard from '@/components/SnakeBoard'
import DominoTileComponent from '@/components/DominoTile'
import { ExitConfirmation } from '@/components/ExitConfirmation'
import { soundEngine } from '@/lib/soundEngine'

export default function GameScreen() {
  const { 
    setScreen, settings, updateStatistics, checkAndUnlockAchievements,
    playerName, playerAvatar, matchState, addRoundScore, initMatchState,
    statistics, addHistoryEntry
  } = useGameStore()

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [roundEnded, setRoundEnded] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [bestMove, setBestMove] = useState<{ tileIndex: number; end: TileEnd } | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState('')

  const moveCountRef = useRef(0)
  const playerDrawCountRef = useRef(0)
  const playerHasDrawnRef = useRef(false)
  const gameStartTimeRef = useRef<number>(Date.now())
  const aiTurnInProgress = useRef(false)

  const getTimeLimit = useCallback(() => {
    if (settings.timerMode === 'off') return 0
    if (settings.timerMode === 'custom') return settings.customTime
    return TIMER_CONFIG[settings.timerMode].time
  }, [settings.timerMode, settings.customTime])

  // Generate AI names based on count
  const getAINames = useCallback((count: number): string[] => {
    const names = ['الكمبيوتر', 'الذكي', 'المحارب', 'الأسطورة', 'البطل']
    return names.slice(0, count)
  }, [])

  const getAIAvatars = useCallback((count: number): string[] => {
    return Array(count).fill('/assets/avatar_ai.png')
  }, [])

  // Initialize game
  useEffect(() => {
    const aiCount = Math.min(Math.max(settings.aiCount || 1, 1), 4)
    const aiNames = getAINames(aiCount)
    const aiAvatars = getAIAvatars(aiCount)

    const allNames = [playerName, ...aiNames]
    const allAvatars = [playerAvatar, ...aiAvatars]

    const state = createInitialState(allNames, allAvatars)
    setGameState(state)
    moveCountRef.current = 0
    playerDrawCountRef.current = 0
    playerHasDrawnRef.current = false
    gameStartTimeRef.current = Date.now()
    setRoundEnded(false)
    setHintMessage('')
    setBestMove(null)
    setBlockedMessage('')
    setTimerKey(prev => prev + 1)
    aiTurnInProgress.current = false

    // Initialize match state if not exists
    if (!matchState) {
      initMatchState(settings.targetScore)
    }
  }, [playerName, playerAvatar, settings.aiCount, settings.targetScore])

  // Hints
  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded) {
      setHintMessage('')
      setBestMove(null)
      return
    }

    if (gameState.currentPlayerIndex === 0 && settings.showHints) {
      const hint = getBestMove(gameState, 0)
      if (hint) {
        setBestMove({ tileIndex: hint.tileIndex, end: hint.end })
        setHintMessage(hint.reason)
      } else {
        const msg = getHintMessage(gameState, 0)
        setHintMessage(msg)
        setBestMove(null)
      }
    } else {
      setHintMessage('')
      setBestMove(null)
    }
  }, [gameState, settings.showHints, roundEnded])

  // FIXED: AI Turn - handles ALL AI players correctly
  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded || aiTurnInProgress.current) return
    if (gameState.currentPlayerIndex === 0) return // Player's turn

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (!currentPlayer || !currentPlayer.isAI) return

    // Prevent multiple AI turns running simultaneously
    aiTurnInProgress.current = true
    setSelectedTile(null)
    setAiThinking(true)

    const timer = setTimeout(() => {
      handleAITurn(currentPlayer.id)
    }, 1500)

    return () => clearTimeout(timer)
  }, [gameState?.currentPlayerIndex, gameState?.isGameOver, roundEnded])

  const handleAITurn = (playerId: string) => {
    if (!gameState) {
      aiTurnInProgress.current = false
      return
    }

    const playerIndex = gameState.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) {
      aiTurnInProgress.current = false
      return
    }

    const currentPlayer = gameState.players[playerIndex]

    // FIXED: Check if game is blocked BEFORE trying to play
    if (isGameBlocked(gameState)) {
      const blockedWinner = getBlockedWinner(gameState)
      handleRoundEnd(blockedWinner?.id === 'player-0')
      setAiThinking(false)
      aiTurnInProgress.current = false
      return
    }

    // Block mode: skip if can't play
    if (settings.gameMode === 'block' && !canPlayerPlay(gameState, playerIndex)) {
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage(`${currentPlayer.name} لا يستطيع اللعب - تخطي`)
      setAiThinking(false)
      aiTurnInProgress.current = false
      setTimerKey(prev => prev + 1)
      return
    }

    // Get AI move
    const aiMove = getAIMove(gameState, playerIndex, settings.difficulty)

    if (aiMove) {
      const result = playTile(gameState, playerIndex, aiMove.tileIndex, aiMove.end)
      if (result.valid && result.newState) {
        moveCountRef.current += 1

        if (settings.gameMode === 'allFives') {
          const gained = result.newState.players[playerIndex].score - gameState.players[playerIndex].score
          if (gained > 0) {
            setMessage(`${currentPlayer.name} حصل على ${gained} نقطة!`)
          }
        }

        setGameState(result.newState)
        if (result.newState.isGameOver) {
          handleRoundEnd(result.newState.winner?.id === 'player-0')
        }
      }
    } else {
      // Can't play - try to draw
      if (settings.gameMode === 'draw' && gameState.stock.length > 0) {
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
    aiTurnInProgress.current = false
  }

  const handleRoundEnd = (playerWon: boolean) => {
    if (roundEnded) return

    const isWin = playerWon
    const playerScore = calculateScore(gameState?.players[0]?.hand || [])
    const opponentScores = gameState?.players.slice(1).map(p => calculateScore(p.hand)) || []
    const totalOpponentScore = opponentScores.reduce((a, b) => a + b, 0)

    // FIXED: Proper score calculation for all game modes
    let finalPlayerScore: number
    if (settings.gameMode === 'allFives') {
      finalPlayerScore = gameState?.players[0].score || 0
    } else if (isWin) {
      // In classic/points/block: winner gets sum of opponent hands
      finalPlayerScore = totalOpponentScore
    } else {
      // Loser gets negative of their own hand (or 0 in blocked game)
      finalPlayerScore = gameState?.isBlocked ? 0 : playerScore
    }

    const duration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000)

    sessionStorage.setItem('lastWinner', isWin ? playerName : 'الكمبيوتر')
    sessionStorage.setItem('lastRoundPoints', String(finalPlayerScore))
    sessionStorage.setItem('movesCount', String(moveCountRef.current))
    sessionStorage.setItem('gameDuration', String(duration))

    // FIXED: Add history entry with correct data
    const historyEntry: GameRecord = {
      id: `game_${Date.now()}`,
      date: new Date().toISOString(),
      playerName,
      opponentName: gameState?.players[1]?.name || 'الكمبيوتر',
      result: isWin ? 'win' : 'loss',
      gameMode: settings.gameMode,
      difficulty: settings.difficulty,
      rounds: gameState?.round || 1,
      playerScore: finalPlayerScore,
      opponentScore: isWin ? 0 : totalOpponentScore,
      targetScore: settings.targetScore,
      duration,
    }
    addHistoryEntry(historyEntry)

    // Update match state if exists
    if (matchState && !matchState.isMatchOver) {
      addRoundScore(finalPlayerScore, isWin ? 0 : totalOpponentScore)
    }

    // Update statistics
    updateStatistics({
      gamesPlayed: 1,
      gamesWon: isWin ? 1 : 0,
      gamesLost: isWin ? 0 : 1,
      totalScore: finalPlayerScore,
      highestScore: finalPlayerScore,
      totalTime: duration,
      bestTime: isWin ? duration : undefined,
    })

    // Check achievements
    const newlyUnlocked = checkAndUnlockAchievements({
      totalGames: statistics.gamesPlayed + 1,
      totalWins: statistics.gamesWon + (isWin ? 1 : 0),
      currentStreak: isWin ? statistics.winStreak + 1 : 0,
      bestStreak: Math.max(statistics.bestWinStreak, isWin ? statistics.winStreak + 1 : 0),
      cleanWins: statistics.gamesWon + (isWin && !playerHasDrawnRef.current ? 1 : 0),
      crushingWins: statistics.gamesWon + (isWin && totalOpponentScore === 0 ? 1 : 0),
      fastestWinMoves: isWin ? moveCountRef.current : 0,
      totalDraws: playerDrawCountRef.current,
      comebacks: 0,
    })

    if (newlyUnlocked.length > 0) {
      sessionStorage.setItem('newAchievements', JSON.stringify(newlyUnlocked))
    }

    setRoundEnded(true)
    setTimeout(() => setScreen('matchEnd'), 2000)
  }

  const handleTileClick = (index: number) => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded || aiThinking) return
    if (selectedTile === index) {
      setSelectedTile(null)
      return
    }
    setSelectedTile(index)
    soundEngine.playClick()
  }

  const handlePlayTile = (end: TileEnd) => {
    if (selectedTile === null || !gameState || roundEnded) return

    // FIXED: Validate selected tile still exists (index might change after draw)
    if (selectedTile >= gameState.players[0].hand.length) {
      setSelectedTile(null)
      return
    }

    const result = playTile(gameState, 0, selectedTile, end)
    if (result.valid && result.newState) {
      soundEngine.playTilePlace()
      moveCountRef.current += 1
      setGameState(result.newState)
      setSelectedTile(null)
      setMessage('')
      setTimerKey(prev => prev + 1)

      if (result.newState.isGameOver) {
        handleRoundEnd(result.newState.winner?.id === 'player-0')
      }
    } else {
      setMessage(result.message || 'لا يمكن اللعب بهذه القطعة')
    }
  }

  const handleDraw = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded || aiThinking) return
    if (gameState.stock.length === 0) {
      setMessage('المخزون فارغ!')
      return
    }

    // FIXED: Check if player can actually play before drawing
    if (canPlayerPlay(gameState, 0)) {
      setMessage('يمكنك اللعب! لا حاجة للسحب')
      return
    }

    playerHasDrawnRef.current = true
    playerDrawCountRef.current += 1

    const newState = drawFromStock(gameState, 0)
    setGameState(newState)
    setSelectedTile(null)
    setMessage('سحبت قطعة من المخزون')
    soundEngine.playClick()

    // After drawing, if still can't play, auto-skip
    if (!canPlayerPlay(newState, 0)) {
      if (newState.stock.length === 0) {
        // Check if game is blocked
        if (isGameBlocked(newState)) {
          const blockedWinner = getBlockedWinner(newState)
          handleRoundEnd(blockedWinner?.id === 'player-0')
        } else {
          setTimeout(() => {
            setGameState(skipTurn(newState))
            setMessage('لا يمكنك اللعب - تخطي الدور')
          }, 1000)
        }
      }
    }
  }

  const handleSkip = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded || aiThinking) return

    // FIXED: Only allow skip if can't play
    if (canPlayerPlay(gameState, 0)) {
      setMessage('يمكنك اللعب!')
      return
    }

    // In draw mode, must try drawing first if stock available
    if (settings.gameMode === 'draw' && gameState.stock.length > 0) {
      setMessage('اسحب من المخزون أولاً')
      return
    }

    const newState = skipTurn(gameState)
    setGameState(newState)
    setSelectedTile(null)
    setMessage('تخطيت دورك')
    setTimerKey(prev => prev + 1)
  }

  const handleTimerExpire = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded || aiThinking) return

    // Auto-skip on timer expire
    if (canPlayerPlay(gameState, 0)) {
      // Try to play best move automatically
      const best = getBestMove(gameState, 0)
      if (best) {
        const result = playTile(gameState, 0, best.tileIndex, best.end)
        if (result.valid && result.newState) {
          setGameState(result.newState)
          setMessage('انتهى الوقت - لعب أفضل قطعة')
          if (result.newState.isGameOver) {
            handleRoundEnd(result.newState.winner?.id === 'player-0')
          }
          return
        }
      }
    }

    const newState = skipTurn(gameState)
    setGameState(newState)
    setSelectedTile(null)
    setMessage('انتهى الوقت - تخطي الدور')
  }

  const handleExit = () => {
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    setScreen('menu')
  }

  const cancelExit = () => {
    setShowExitConfirm(false)
  }

  // Get current player info
  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex || 0]
  const isPlayerTurn = gameState?.currentPlayerIndex === 0
  const timeLimit = getTimeLimit()

  // Calculate board ends for display
  const boardEnds = gameState && gameState.board.length > 0 ? getBoardEnds(gameState.board) : null

  return (
    <div className="game-screen w-full h-full flex flex-col bg-[#1a1a2e] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16213e]">
        <button onClick={handleExit} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{currentPlayer?.name}</span>
          {isPlayerTurn ? (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">دورك</span>
          ) : (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">{aiThinking ? 'يفكر...' : 'انتظر'}</span>
          )}
        </div>
        <button onClick={() => {
          const state = createInitialState([playerName, ...getAINames(settings.aiCount)], [playerAvatar, ...getAIAvatars(settings.aiCount)])
          setGameState(state)
          setRoundEnded(false)
          setMessage('')
          moveCountRef.current = 0
        }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Scores bar */}
      <div className="flex justify-around px-4 py-2 bg-[#0f3460] text-sm">
        {gameState?.players.map((p, i) => (
          <div key={p.id} className={`flex items-center gap-1 ${i === gameState.currentPlayerIndex ? 'text-yellow-400 font-bold' : ''}`}>
            <span>{p.name}</span>
            <span className="bg-white/10 px-2 py-0.5 rounded">{p.score}</span>
            <span className="text-xs text-white/50">({p.hand.length})</span>
          </div>
        ))}
      </div>

      {/* Timer */}
      {timeLimit > 0 && isPlayerTurn && !roundEnded && (
        <TimerBar key={timerKey} timeLimit={timeLimit} onExpire={handleTimerExpire} />
      )}

      {/* Message */}
      {message && (
        <div className="px-4 py-1 text-center text-sm bg-blue-500/20 text-blue-300">
          {message}
        </div>
      )}

      {/* Hint */}
      {hintMessage && settings.showHints && isPlayerTurn && (
        <div className="px-4 py-1 text-center text-xs bg-yellow-500/20 text-yellow-300 flex items-center justify-center gap-1">
          <Lightbulb size={14} />
          {hintMessage}
        </div>
      )}

      {/* Board ends indicator */}
      {boardEnds && gameState && gameState.board.length > 0 && (
        <div className="flex justify-center gap-4 py-1 text-xs text-white/60">
          <span>اليسار: {boardEnds.leftValue}</span>
          <span>اليمين: {boardEnds.rightValue}</span>
          <span>المخزون: {gameState.stock.length}</span>
        </div>
      )}

      {/* Snake Board */}
      <div className="flex-1 relative overflow-hidden">
        <SnakeBoard board={gameState?.board || []} />
      </div>

      {/* Player Hand */}
      <div className="px-4 py-3 bg-[#16213e]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">يدك ({gameState?.players[0]?.hand.length || 0})</span>
          <div className="flex gap-2">
            {settings.gameMode === 'draw' && gameState && gameState.stock.length > 0 && (
              <button 
                onClick={handleDraw}
                disabled={!isPlayerTurn || roundEnded || aiThinking || canPlayerPlay(gameState, 0)}
                className="px-3 py-1 text-xs bg-blue-600 rounded-lg disabled:opacity-30"
              >
                سحب
              </button>
            )}
            <button 
              onClick={handleSkip}
              disabled={!isPlayerTurn || roundEnded || aiThinking || canPlayerPlay(gameState || { players: [{ hand: [] }] } as GameState, 0)}
              className="px-3 py-1 text-xs bg-gray-600 rounded-lg disabled:opacity-30"
            >
              تخطي
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {gameState?.players[0]?.hand.map((tile, index) => {
            const isSelected = selectedTile === index
            const validEnds = getValidEnds(tile, gameState.board)
            const canPlay = validEnds.length > 0
            const isHint = bestMove?.tileIndex === index

            return (
              <div key={tile.id} className="flex-shrink-0">
                <button
                  onClick={() => handleTileClick(index)}
                  className={`
                    relative transition-all duration-200
                    ${isSelected ? 'scale-110 -translate-y-2 ring-2 ring-yellow-400' : ''}
                    ${isHint ? 'ring-2 ring-green-400' : ''}
                    ${!canPlay ? 'opacity-50' : ''}
                  `}
                >
                  <DominoTileComponent tile={tile} size="sm" />
                  {isSelected && canPlay && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1">
                      {validEnds.includes('left') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePlayTile('left') }}
                          className="text-xs bg-green-500 text-white px-2 py-0.5 rounded"
                        >
                          يسار
                        </button>
                      )}
                      {validEnds.includes('right') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePlayTile('right') }}
                          className="text-xs bg-green-500 text-white px-2 py-0.5 rounded"
                        >
                          يمين
                        </button>
                      )}
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Exit Confirmation */}
      {showExitConfirm && (
        <ExitConfirmation onConfirm={confirmExit} onCancel={cancelExit} />
      )}
    </div>
  )
}
