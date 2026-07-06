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

  const moveCountRef = useRef(0)
  const playerDrawCountRef = useRef(0)
  const playerHasDrawnRef = useRef(false)
  const gameStartTimeRef = useRef<number>(Date.now())

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
    setTimerKey(prev => prev + 1)
  }, [playerName, playerAvatar, settings.aiCount])

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

  // AI Turn - handles ALL AI players (not just player 1)
  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded) return
    if (gameState.currentPlayerIndex === 0) return // Player's turn

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (!currentPlayer || !currentPlayer.isAI) return

    setSelectedTile(null)
    setAiThinking(true)

    const timer = setTimeout(() => {
      handleAITurn(currentPlayer.id)
    }, 1500)

    return () => clearTimeout(timer)
  }, [gameState, settings.difficulty, roundEnded, settings.gameMode])

  const handleAITurn = (playerId: string) => {
    if (!gameState) return
    const playerIndex = gameState.players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return

    const currentPlayer = gameState.players[playerIndex]

    // Check if game is blocked
    if (isGameBlocked(gameState)) {
      const blockedWinner = getBlockedWinner(gameState)
      handleRoundEnd(blockedWinner?.id === 'player-0')
      setAiThinking(false)
      return
    }

    // Block mode: skip if can't play
    if (settings.gameMode === 'block' && !canPlayerPlay(gameState, playerIndex)) {
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage(`${currentPlayer.name} لا يستطيع اللعب - تخطي`)
      setAiThinking(false)
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
          const gained = result.newState.players[playerIndex].score - (gameState.players[playerIndex]?.score || 0)
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
  }

  const handleRoundEnd = (playerWon: boolean) => {
    if (roundEnded) return // Prevent double calls

    const isWin = playerWon
    const playerScore = calculateScore(gameState?.players[0]?.hand || [])
    const opponentScores = gameState?.players.slice(1).map(p => calculateScore(p.hand)) || []
    const totalOpponentScore = opponentScores.reduce((a, b) => a + b, 0)

    const finalPlayerScore = settings.gameMode === 'allFives' 
      ? gameState?.players[0].score || 0
      : (isWin ? totalOpponentScore : playerScore)

    // FIXED: Calculate duration
    const duration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000)

    sessionStorage.setItem('lastWinner', isWin ? playerName : 'الكمبيوتر')
    sessionStorage.setItem('lastRoundPoints', String(finalPlayerScore))
    sessionStorage.setItem('movesCount', String(moveCountRef.current))
    sessionStorage.setItem('gameDuration', String(duration))

    // FIXED: Add history entry
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

    // Update statistics - FIXED with duration
    updateStatistics({
      gamesPlayed: 1,
      gamesWon: isWin ? 1 : 0,
      gamesLost: isWin ? 0 : 1,
      totalScore: finalPlayerScore,
      highestScore: finalPlayerScore,
      totalTime: duration,
      bestTime: isWin ? duration : undefined,
    })

    // Check achievements - FIXED: correct fastestWinMoves
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
      soundEngine.playInvalid()
      setMessage(result.message || 'لا يمكن اللعب بهذه القطعة')
    }
  }

  const handleDraw = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded) return
    if (settings.gameMode === 'block') {
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
    setTimerKey(prev => prev + 1)
  }

  const handleTimeUp = useCallback(() => {
    if (!gameState || gameState.currentPlayerIndex !== 0) return
    if (gameState.stock.length > 0 && settings.gameMode !== 'block') {
      const newState = drawFromStock(gameState, 0)
      setGameState(newState)
      setMessage('انتهى الوقت! سحب تلقائي')
      playerDrawCountRef.current += 1
      playerHasDrawnRef.current = true
    } else {
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage('انتهى الوقت! تخطي الدور')
    }
    setSelectedTile(null)
    setTimerKey(prev => prev + 1)
  }, [gameState, settings.gameMode])

  const handleSkip = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || roundEnded) return
    const newState = skipTurn(gameState)
    setGameState(newState)
    setSelectedTile(null)
    soundEngine.playClick()
    setMessage('تم تخطي الدور')
    setTimerKey(prev => prev + 1)
  }

  // FIXED: Exit with confirmation
  const handleExit = () => {
    soundEngine.playClick()
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    setScreen('menu')
  }

  if (!gameState) {
    return (
      <div className="screen-container table-bg">
        <div className="text-white/60">جاري التحميل...</div>
      </div>
    )
  }

  const player = gameState.players[0]
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const timeLimit = getTimeLimit()
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !roundEnded

  return (
    <div className="screen-container table-bg">
      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <ExitConfirmation 
          isVisible={showExitConfirm}
          onConfirm={confirmExit} 
          onCancel={() => setShowExitConfirm(false)} 
        />
      )}

      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-2">
        <button onClick={handleExit} className="text-white/60 p-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          {settings.showHints && bestMove && (
            <button onClick={() => handlePlayTile(bestMove.end)} className="text-yellow-400 p-1">
              <Lightbulb size={20} />
            </button>
          )}
          <div className="text-white/80 text-sm">{currentPlayer?.name}</div>
          {aiThinking && <div className="text-white/60 text-xs animate-pulse">يفكر...</div>}
        </div>
        <div className="w-8" />
      </div>

      {/* Timer */}
      {timeLimit > 0 && isPlayerTurn && (
        <TimerBar key={timerKey} duration={timeLimit} onTimeUp={handleTimeUp} />
      )}

      {/* Message */}
      {message && (
        <div className="text-white/90 text-center text-sm py-1 px-4 bg-black/30 rounded-lg mx-4">
          {message}
        </div>
      )}

      {/* Hint */}
      {hintMessage && (
        <div className="text-yellow-400/80 text-center text-xs py-1">
          {hintMessage}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden px-2">
        <SnakeBoard board={gameState.board} />
      </div>

      {/* Player Hand */}
      <div className="w-full px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white/60 text-xs">{player.name}</div>
          <div className="flex gap-2">
            {gameState.stock.length > 0 && settings.gameMode !== 'block' && (
              <button onClick={handleDraw} className="game-btn game-btn-secondary text-xs px-3 py-1">
                سحب
              </button>
            )}
            <button onClick={handleSkip} className="game-btn game-btn-secondary text-xs px-3 py-1">
              تخطي
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
          {player.hand.map((tile, index) => {
            const validEnds = getValidEnds(tile, gameState.board)
            const isSelected = selectedTile === index
            const canPlay = validEnds.length > 0 && isPlayerTurn

            return (
              <div key={tile.id} className="flex flex-col items-center gap-1">
                <DominoTileComponent
                  tile={tile}
                  selected={isSelected}
                  disabled={!canPlay}
                  onClick={() => handleTileClick(index)}
                />
                {isSelected && canPlay && validEnds.length > 1 && (
                  <div className="flex gap-1">
                    {validEnds.includes('left') && (
                      <button onClick={() => handlePlayTile('left')} className="text-xs bg-yellow-500/80 text-black px-2 py-0.5 rounded">
                        يسار
                      </button>
                    )}
                    {validEnds.includes('right') && (
                      <button onClick={() => handlePlayTile('right')} className="text-xs bg-yellow-500/80 text-black px-2 py-0.5 rounded">
                        يمين
                      </button>
                    )}
                  </div>
                )}
                {isSelected && canPlay && validEnds.length === 1 && (
                  <button onClick={() => handlePlayTile(validEnds[0])} className="text-xs bg-yellow-500/80 text-black px-2 py-0.5 rounded">
                    لعب
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
