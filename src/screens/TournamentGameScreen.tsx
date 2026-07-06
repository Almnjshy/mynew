import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useTournamentStore } from '@/store/tournamentStore'
import { createInitialState, playTile, drawFromStock, getValidEnds, getAIMove, calculateScore, isGameBlocked, getBlockedWinner, canPlayerPlay, skipTurn } from '@/lib/gameEngine'
import { getBestMove, getHintMessage, shouldDraw } from '@/lib/hintEngine'
import { GameState, DominoTile, TileEnd, TIMER_CONFIG } from '@/types/game'
import { ArrowLeft, RotateCcw, Trophy, Lightbulb } from 'lucide-react'
import TimerBar from '@/components/TimerBar'
import Board from '@/components/Board'
import DominoTileComponent from '@/components/DominoTile'
import { soundEngine } from '@/lib/soundEngine'

export default function TournamentGameScreen() {
  const { setScreen, settings, playerName, playerAvatar, statistics } = useGameStore()
  const { activeTournament, completeMatch, simulateAIMatches } = useTournamentStore()

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [roundEnded, setRoundEnded] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [bestMove, setBestMove] = useState<{ tileIndex: number; end: TileEnd } | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [matchResult, setMatchResult] = useState<'win' | 'loss' | null>(null)

  const moveCountRef = useRef(0)
  const playerDrawCountRef = useRef(0)
  const playerHasDrawnRef = useRef(false)

  const getTimeLimit = useCallback(() => {
    if (settings.timerMode === 'off') return 0
    if (settings.timerMode === 'custom') return settings.customTime
    return TIMER_CONFIG[settings.timerMode].time
  }, [settings.timerMode, settings.customTime])

  // Initialize game with tournament settings
  useEffect(() => {
    if (!activeTournament) {
      setScreen('tournamentBracket')
      return
    }

    // Get current match opponent
    const currentRound = activeTournament.rounds[activeTournament.currentRound]
    const currentMatch = currentRound?.matches[activeTournament.currentMatch]

    if (!currentMatch) {
      setScreen('tournamentBracket')
      return
    }

    const opponent = currentMatch.player1?.id === 'player_0' 
      ? currentMatch.player2 
      : currentMatch.player1

    if (!opponent) {
      setScreen('tournamentBracket')
      return
    }

    const state = createInitialState(
      [playerName, opponent.name],
      [playerAvatar, opponent.avatar || '/assets/avatar_ai.png']
    )

    setGameState(state)
    moveCountRef.current = 0
    playerDrawCountRef.current = 0
    playerHasDrawnRef.current = false
    setRoundEnded(false)
    setMatchResult(null)
    setTimerKey(prev => prev + 1)

    soundEngine.playMatchStart()
  }, [activeTournament, playerName, playerAvatar])

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

  // AI Turn
  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded) return
    if (gameState.currentPlayerIndex === 0) return

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (!currentPlayer.isAI) return

    setSelectedTile(null)
    setAiThinking(true)

    const timer = setTimeout(() => {
      if (isGameBlocked(gameState)) {
        const blockedWinner = getBlockedWinner(gameState)
        handleGameEnd(blockedWinner?.id === 'player-0')
        setAiThinking(false)
        return
      }

      if (settings.gameMode === 'block' && !canPlayerPlay(gameState, gameState.currentPlayerIndex)) {
        const newState = skipTurn(gameState)
        setGameState(newState)
        setMessage(`${currentPlayer.name} لا يستطيع اللعب - تخطي`)
        setAiThinking(false)
        setTimerKey(prev => prev + 1)
        return
      }

      const aiMove = getAIMove(gameState, settings.difficulty)

      if (aiMove) {
        const result = playTile(gameState, gameState.currentPlayerIndex, aiMove.tileIndex, aiMove.end)
        if (result.valid && result.newState) {
          moveCountRef.current += 1
          setGameState(result.newState)

          if (result.newState.isGameOver) {
            handleGameEnd(result.newState.winner?.id === 'player-0')
          }
        }
      } else {
        if (settings.gameMode === 'draw' && gameState.stock.length > 0) {
          let newState = drawFromStock(gameState, gameState.currentPlayerIndex)
          while (!canPlayerPlay(newState, gameState.currentPlayerIndex) && newState.stock.length > 0) {
            newState = drawFromStock(newState, gameState.currentPlayerIndex)
          }
          setGameState(newState)
        } else {
          const newState = skipTurn(gameState)
          setGameState(newState)
        }
      }
      setAiThinking(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [gameState, settings.difficulty, roundEnded, settings.gameMode])

  const handleGameEnd = (playerWon: boolean) => {
    setRoundEnded(true)
    setMatchResult(playerWon ? 'win' : 'loss')

    if (playerWon) {
      soundEngine.playWin()
      setMessage('🎉 فزت بالمباراة!')
    } else {
      soundEngine.playLose()
      setMessage('😔 خسرت المباراة')
    }

    // Calculate scores
    const playerScore = calculateScore(gameState?.players[0]?.hand || [])
    const opponentScore = calculateScore(gameState?.players[1]?.hand || [])

    // Complete tournament match
    setTimeout(() => {
      completeMatch(playerWon, playerWon ? opponentScore : playerScore, playerWon ? playerScore : opponentScore)
    }, 2000)
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
        handleGameEnd(result.newState.winner?.id === 'player-0')
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

  const handleBackToBracket = () => {
    soundEngine.playClick()
    setScreen('tournamentBracket')
  }

  if (!gameState) {
    return (
      <div className="screen-container wood-bg">
        <div className="text-white/60">جاري التحميل...</div>
      </div>
    )
  }

  const player = gameState.players[0]
  const opponent = gameState.players[1]
  const timeLimit = getTimeLimit()
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !roundEnded

  return (
    <div className="screen-container table-bg">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-2">
        <button onClick={handleBackToBracket} className="text-white/60 p-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-sm">🏆 بطولة</div>
          <div className="text-white/60 text-xs">
            {activeTournament?.rounds[activeTournament.currentRound]?.roundName}
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Timer */}
      {timeLimit > 0 && isPlayerTurn && (
        <div className="w-full px-4 mb-2">
          <TimerBar 
            key={timerKey}
            duration={timeLimit} 
            onTimeUp={handleTimeUp} 
            isActive={isPlayerTurn} 
          />
        </div>
      )}

      {/* Opponent Info */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
          <img src={opponent.avatar} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="text-right">
          <div className="text-white font-medium text-sm">{opponent.name}</div>
          <div className="text-white/40 text-xs">{opponent.hand.length} قطعة</div>
        </div>
        {aiThinking && (
          <div className="mr-auto text-yellow-400 text-xs animate-pulse">
            يفكر...
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <Board tiles={gameState.board} />
      </div>

      {/* Message */}
      {message && (
        <div className={`text-center px-4 py-2 text-sm font-medium ${
          matchResult === 'win' ? 'text-green-400' : 
          matchResult === 'loss' ? 'text-red-400' : 
          'text-yellow-400'
        }`}>
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
                    highlight={isHinted}
                    small={player.hand.length > 8}
                  />
                </button>

                {/* Play buttons for selected tile */}
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
          سحب
        </button>
        <button
          onClick={handleSkip}
          disabled={!isPlayerTurn || roundEnded}
          className="game-btn game-btn-secondary flex-1 text-sm"
        >
          تخطي
        </button>
      </div>

      {/* Match Result Overlay */}
      {matchResult && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center max-w-xs">
            <Trophy size={64} className={matchResult === 'win' ? 'text-yellow-400 mx-auto mb-4' : 'text-gray-400 mx-auto mb-4'} />
            <h2 className={`text-3xl font-bold mb-2 ${matchResult === 'win' ? 'text-yellow-400' : 'text-white'}`}>
              {matchResult === 'win' ? 'فوز!' : 'خسارة'}
            </h2>
            <p className="text-white/60 mb-6">
              {matchResult === 'win' 
                ? 'تأهلت للجولة التالية!' 
                : 'تم إقصاؤك من البطولة'}
            </p>
            <button 
              onClick={handleBackToBracket}
              className="game-btn game-btn-primary w-full"
            >
              العودة للجدول
            </button>
          </div>
        </div>
      )}
    </div>
  )
}