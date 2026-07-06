import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { 
  createInitialState, playTile, drawFromStock, getValidEnds, getAIMove, 
  calculateScore, isGameBlocked, getBlockedWinner, canPlayerPlay, skipTurn,
  getBoardEnds
} from '@/lib/gameEngine'
import { getBestMove, getHintMessage, shouldDraw } from '@/lib/hintEngine'
import { GameState, DominoTile, TileEnd, TIMER_CONFIG, BoardTile } from '@/types/game'
import { ArrowLeft, RotateCcw, Trophy, Lightbulb, Users, User } from 'lucide-react'
import TimerBar from '@/components/TimerBar'
import SnakeBoard from '@/components/SnakeBoard'
import DominoTileComponent from '@/components/DominoTile'
import { soundEngine } from '@/lib/soundEngine'

export default function GameScreen() {
  const { 
    setScreen, settings, updateStatistics, checkAndUnlockAchievements,
    playerName, playerAvatar, matchState, addRoundScore, initMatchState,
    statistics
  } = useGameStore()

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [roundEnded, setRoundEnded] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [bestMove, setBestMove] = useState<{ tileIndex: number; end: TileEnd } | null>(null)
  const [timerKey, setTimerKey] = useState(0)

  const moveCountRef = useRef(0)
  const playerDrawCountRef = useRef(0)
  const playerHasDrawnRef = useRef(false)

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
    const isWin = playerWon
    const playerScore = calculateScore(gameState?.players[0]?.hand || [])
    const opponentScores = gameState?.players.slice(1).map(p => calculateScore(p.hand)) || []
    const totalOpponentScore = opponentScores.reduce((a, b) => a + b, 0)

    const finalPlayerScore = settings.gameMode === 'allFives' 
      ? gameState?.players[0].score || 0
      : (isWin ? totalOpponentScore : playerScore)

    sessionStorage.setItem('lastWinner', isWin ? playerName : 'الكمبيوتر')
    sessionStorage.setItem('lastRoundPoints', String(finalPlayerScore))
    sessionStorage.setItem('movesCount', String(moveCountRef.current))

    // Update statistics
    updateStatistics({
      gamesPlayed: 1,
      gamesWon: isWin ? 1 : 0,
      gamesLost: isWin ? 0 : 1,
      totalScore: finalPlayerScore,
      highestScore: finalPlayerScore,
    })

    // Check achievements
    const newlyUnlocked = checkAndUnlockAchievements({
      totalGames: statistics.gamesPlayed + 1,
      totalWins: statistics.gamesWon + (isWin ? 1 : 0),
      currentStreak: isWin ? statistics.winStreak + 1 : 0,
      bestStreak: Math.max(statistics.bestWinStreak, isWin ? statistics.winStreak + 1 : 0),
      cleanWins: statistics.gamesWon + (isWin && !playerHasDrawnRef.current ? 1 : 0),
      crushingWins: statistics.gamesWon + (isWin && totalOpponentScore === 0 ? 1 : 0),
      fastestWinMoves: isWin ? moveCountRef.current : statistics.bestTime,
      totalDraws: playerDrawCountRef.current,
      comebacks: 0,
    })

    if (newlyUnlocked.length > 0) {
      sessionStorage.setItem('newAchievements', JSON.stringify(newlyUnlocked))
    }

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

  const handleExit = () => {
    soundEngine.playClick()
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
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-2">
        <button onClick={handleExit} className="text-white/60 p-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-sm">
            {settings.gameMode === 'classic' ? 'كلاسيك' : 
             settings.gameMode === 'points' ? 'نقاط' :
             settings.gameMode === 'block' ? 'حظر' :
             settings.gameMode === 'allFives' ? 'الخمسات' : 'سحب'}
          </div>
          <div className="text-white/40 text-xs">
            {gameState.players.length} لاعبين
          </div>
        </div>
        <button onClick={() => {}} className="text-white/60 p-2">
          <RotateCcw size={24} />
        </button>
      </div>

      {/* Timer */}
      {timeLimit > 0 && isPlayerTurn && (
        <div className="w-full px-4 mb-1">
          <TimerBar 
            key={timerKey}
            duration={timeLimit} 
            onTimeUp={handleTimeUp} 
            isActive={isPlayerTurn} 
          />
        </div>
      )}

      {/* Opponents Info */}
      <div className="w-full px-4 py-1">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {gameState.players.slice(1).map((opponent, idx) => (
            <div 
              key={opponent.id}
              className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                gameState.currentPlayerIndex === idx + 1 
                  ? 'bg-yellow-500/20 border border-yellow-500/50' 
                  : 'bg-white/5'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">
                <img src={opponent.avatar} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-white/70 text-xs">{opponent.name}</span>
              <span className="text-white/40 text-xs">({opponent.hand.length})</span>
              {gameState.currentPlayerIndex === idx + 1 && aiThinking && (
                <span className="text-yellow-400 text-xs animate-pulse">يفكر...</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Snake Board */}
      <div className="flex-1 flex items-center justify-center px-2 py-2 overflow-hidden">
        <SnakeBoard board={gameState.board} />
      </div>

      {/* Message */}
      {message && (
        <div className="text-center px-4 py-1 text-sm font-medium text-yellow-400">
          {message}
        </div>
      )}

      {/* Hints */}
      {hintMessage && settings.showHints && isPlayerTurn && (
        <div className="text-center px-4 py-1">
          <span className="text-white/50 text-xs flex items-center justify-center gap-1">
            <Lightbulb size={12} />
            {hintMessage}
          </span>
        </div>
      )}

      {/* Player Info */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 overflow-hidden border-2 border-yellow-500">
          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="text-right">
          <div className="text-yellow-400 font-medium text-sm">{player.name}</div>
          <div className="text-white/40 text-xs">{player.hand.length} قطعة</div>
        </div>
        {settings.gameMode === 'allFives' && (
          <div className="mr-auto text-yellow-400 font-bold">
            {player.score} نقطة
          </div>
        )}
      </div>

      {/* Player Hand */}
      <div className="w-full px-4 pb-2">
        <div className="player-hand justify-center">
          {player.hand.map((tile, index) => {
            const validEnds = getValidEnds(tile, gameState.board)
            const isSelected = selectedTile === index
            const isHinted = bestMove?.tileIndex === index

            return (
              <div key={tile.id} className="relative">
                <button
                  onClick={() => handleTileClick(index)}
                  disabled={!isPlayerTurn || roundEnded}
                  className={`transition-transform ${
                    isSelected ? 'scale-110 -translate-y-2' : ''
                  } ${!isPlayerTurn || roundEnded ? 'opacity-50' : ''}`}
                >
                  <DominoTileComponent 
                    tile={tile} 
                    selected={isSelected}
                    highlight={isHinted}
                    size={player.hand.length > 10 ? 'sm' : player.hand.length > 7 ? 'md' : 'lg'}
                  />
                </button>

                {isSelected && validEnds.length > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
                    {validEnds.map((end) => (
                      <button
                        key={end}
                        onClick={() => handlePlayTile(end)}
                        className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold"
                      >
                        {end === 'left' ? '←' : '→'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={handleDraw}
          disabled={!isPlayerTurn || roundEnded || gameState.stock.length === 0}
          className="game-btn game-btn-secondary flex-1 text-sm"
        >
          سحب ({gameState.stock.length})
        </button>
        <button
          onClick={handleSkip}
          disabled={!isPlayerTurn || roundEnded}
          className="game-btn game-btn-secondary flex-1 text-sm"
        >
          تخطي
        </button>
      </div>
    </div>
  )
}