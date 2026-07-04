import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { createInitialState, playTile, drawFromStock, getValidEnds, getAIMove, calculateScore, isGameBlocked, getBlockedWinner, canPlayerPlay, skipTurn } from '@/lib/gameEngine'
import { getBestMove, getHintMessage, shouldDraw } from '@/lib/hintEngine'
import { soundEngine } from '@/lib/soundEngine'
import { GameState, DominoTile, TileEnd, TIMER_CONFIG, GAME_MODE_CONFIG } from '@/types/game'
import { ArrowLeft, RotateCcw, Trophy, Lightbulb, Lock } from 'lucide-react'
import TimerBar from '@/components/TimerBar'

export default function GameScreen() {
  const { 
    setScreen, settings, updateStatistics, updateAchievementProgress, 
    playerName, playerAvatar, matchState, addRoundScore, initMatchState 
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

  useEffect(() => {
    // Resume audio context on first interaction
    soundEngine.resume()

    sessionStorage.setItem('gameStartTime', String(Date.now()))

    const state = createInitialState(
      [playerName, '丕賱賰賲亘賷賵鬲乇'],
      [playerAvatar, '/assets/avatar_ai.png']
    )
    setGameState(state)
    moveCountRef.current = 0
    playerDrawCountRef.current = 0
    playerHasDrawnRef.current = false
    setRoundEnded(false)
    setHintMessage('')
    setBestMove(null)
    setTimerKey(prev => prev + 1)
  }, [playerName, playerAvatar])

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
    if (gameState.currentPlayerIndex !== 1) return

    setAiThinking(true)
    const timer = setTimeout(() => {
      if (isGameBlocked(gameState)) {
        const blockedWinner = getBlockedWinner(gameState)
        setGameState(prev => prev ? { ...prev, isGameOver: true, winner: blockedWinner, isBlocked: true } : null)
        handleRoundEnd({ ...gameState, isGameOver: true, winner: blockedWinner, isBlocked: true })
        setAiThinking(false)
        return
      }

      if (settings.gameMode === 'block' && !canPlayerPlay(gameState, 1)) {
        const newState = skipTurn(gameState)
        setGameState(newState)
        setMessage('丕賱賰賲亘賷賵鬲乇 賱丕 賷爻鬲胤賷毓 丕賱賱毓亘 - 鬲禺胤賷')
        setAiThinking(false)
        setTimerKey(prev => prev + 1)
        return
      }

      const aiMove = getAIMove(gameState, settings.difficulty)

      if (aiMove) {
        const result = playTile(gameState, 1, aiMove.tileIndex, aiMove.end)
        if (result.valid && result.newState) {
          moveCountRef.current += 1

          if (settings.gameMode === 'allFives' && result.newState.players[1].score > (gameState.players[1]?.score || 0)) {
            const gained = result.newState.players[1].score - (gameState.players[1]?.score || 0)
            setMessage(`丕賱賰賲亘賷賵鬲乇 丨氐賱 毓賱賶 ${gained} 賳賯胤丞!`)
          }

          setGameState(result.newState)
          if (result.newState.isGameOver) {
            handleRoundEnd(result.newState)
          }
        }
      } else {
        if (settings.gameMode === 'draw' && gameState.stock.length > 0) {
          let newState = drawFromStock(gameState, 1)
          while (!canPlayerPlay(newState, 1) && newState.stock.length > 0) {
            newState = drawFromStock(newState, 1)
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

  const handleTimeUp = useCallback(() => {
    if (!gameState || gameState.currentPlayerIndex !== 0) return

    soundEngine.playTimerWarning()

    if (gameState.stock.length > 0 && settings.gameMode !== 'block') {
      const newState = drawFromStock(gameState, 0)
      setGameState(newState)
      setMessage('丕賳鬲賴賶 丕賱賵賯鬲! 爻丨亘 鬲賱賯丕卅賷')
      playerDrawCountRef.current += 1
      playerHasDrawnRef.current = true
    } else {
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage('丕賳鬲賴賶 丕賱賵賯鬲! 鬲禺胤賷 丕賱丿賵乇')
    }
    setSelectedTile(null)
    setTimerKey(prev => prev + 1)
  }, [gameState, settings.gameMode])

  const handleRoundEnd = (state: GameState) => {
    const isWin = state.winner?.id === 'player-0'
    const playerScore = calculateScore(state.players[0].hand)
    const opponentScore = calculateScore(state.players[1].hand)

    const finalPlayerScore = settings.gameMode === 'allFives' 
      ? state.players[0].score 
      : (isWin ? opponentScore : playerScore)
    const finalOpponentScore = settings.gameMode === 'allFives'
      ? state.players[1].score
      : (isWin ? playerScore : opponentScore)

    const pointsGained = settings.gameMode === 'allFives' 
      ? state.players[0].score 
      : (isWin ? opponentScore : playerScore)

    sessionStorage.setItem('lastWinner', state.winner?.name || '丕賱賰賲亘賷賵鬲乇')
    sessionStorage.setItem('lastRoundPoints', String(pointsGained))
    sessionStorage.setItem('movesCount', String(moveCountRef.current))

    if (isWin) {
      soundEngine.playWin()
    } else {
      soundEngine.playLoss()
    }

    if (settings.gameMode === 'points' && matchState) {
      addRoundScore(
        isWin ? opponentScore : 0,
        isWin ? 0 : playerScore
      )

      const updatedMatch = useGameStore.getState().matchState

      if (updatedMatch?.isMatchOver) {
        const matchWon = updatedMatch.matchWinner === playerName
        updateStatistics({
          gamesPlayed: 1,
          gamesWon: matchWon ? 1 : 0,
          gamesLost: matchWon ? 0 : 1,
          totalScore: updatedMatch.playerTotal,
        })

        updateAchievementProgress({
          totalGames: 1,
          totalWins: matchWon ? 1 : 0,
          cleanWins: matchWon && !playerHasDrawnRef.current ? 1 : 0,
          crushingWins: matchWon && opponentScore === 0 ? 1 : 0,
          fastestWinMoves: matchWon ? moveCountRef.current : undefined,
          totalDraws: playerDrawCountRef.current,
        })

        setTimeout(() => setScreen('matchEnd'), 2000)
      } else {
        setRoundEnded(true)
        setTimeout(() => {
          const newState = createInitialState(
            [playerName, '丕賱賰賲亘賷賵鬲乇'],
            [playerAvatar, '/assets/avatar_ai.png']
          )
          setGameState(newState)
          setRoundEnded(false)
          moveCountRef.current = 0
          playerDrawCountRef.current = 0
          playerHasDrawnRef.current = false
          setTimerKey(prev => prev + 1)
        }, 3000)
      }
    } else {
      if (settings.gameMode === 'allFives' && matchState) {
        const targetReached = state.players[0].score >= settings.targetScore || state.players[1].score >= settings.targetScore
        if (targetReached) {
          const matchWon = state.players[0].score >= settings.targetScore
          updateStatistics({
            gamesPlayed: 1,
            gamesWon: matchWon ? 1 : 0,
            gamesLost: matchWon ? 0 : 1,
            totalScore: state.players[0].score,
          })
        }
      }

      updateStatistics({
        gamesPlayed: 1,
        gamesWon: isWin ? 1 : 0,
        gamesLost: isWin ? 0 : 1,
        totalScore: settings.gameMode === 'allFives' ? state.players[0].score : playerScore,
      })

      updateAchievementProgress({
        totalGames: 1,
        totalWins: isWin ? 1 : 0,
        cleanWins: isWin && !playerHasDrawnRef.current ? 1 : 0,
        crushingWins: isWin && opponentScore === 0 ? 1 : 0,
        fastestWinMoves: isWin ? moveCountRef.current : undefined,
        totalDraws: playerDrawCountRef.current,
      })

      setTimeout(() => setScreen('matchEnd'), 2000)
    }
  }

  const handleTileClick = (index: number) => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking || roundEnded) return
    soundEngine.playClick()
    setSelectedTile(index === selectedTile ? null : index)
    setMessage('')
  }

  const handlePlay = (end: TileEnd) => {
    if (!gameState || selectedTile === null) return

    const result = playTile(gameState, 0, selectedTile, end)
    if (result.valid && result.newState) {
      soundEngine.playTilePlace()
      moveCountRef.current += 1

      if (settings.gameMode === 'allFives') {
        const gained = result.newState.players[0].score - (gameState.players[0]?.score || 0)
        if (gained > 0) {
          setMessage(`+${gained} 賳賯胤丞! 賲噩賲賵毓 丕賱兀胤乇丕賮 = 5`)
        }
      }

      setGameState(result.newState)
      setSelectedTile(null)
      setMessage('')
      setTimerKey(prev => prev + 1)

      if (result.newState.isGameOver) {
        handleRoundEnd(result.newState)
      }
    } else {
      soundEngine.playInvalid()
      setMessage(result.message || '賱丕 賷賲賰賳 丕賱賱毓亘 賴賳丕')
    }
  }

  const handleDraw = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking || roundEnded) return

    if (settings.gameMode === 'block') {
      soundEngine.playInvalid()
      setMessage('賳賲胤 丕賱丨馗乇: 賱丕 賷賲賰賳 丕賱爻丨亘!')
      return
    }

    soundEngine.playDraw()
    const newState = drawFromStock(gameState, 0)
    setGameState(newState)
    setMessage('爻丨亘鬲 賯胤毓丞 噩丿賷丿丞')
    setSelectedTile(null)
    setTimerKey(prev => prev + 1)

    playerDrawCountRef.current += 1
    playerHasDrawnRef.current = true
  }

  const handleSkip = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking || roundEnded) return

    if (settings.gameMode === 'block' && !canPlayerPlay(gameState, 0)) {
      soundEngine.playClick()
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage('鬲禺胤賷 丕賱丿賵乇')
      setSelectedTile(null)
      setTimerKey(prev => prev + 1)
    }
  }

  const handleRestart = () => {
    soundEngine.playClick()
    sessionStorage.setItem('gameStartTime', String(Date.now()))
    if (settings.gameMode === 'points') {
      initMatchState(settings.targetScore)
    }
    const state = createInitialState(
      [playerName, '丕賱賰賲亘賷賵鬲乇'],
      [playerAvatar, '/assets/avatar_ai.png']
    )
    setGameState(state)
    setSelectedTile(null)
    setMessage('')
    setAiThinking(false)
    setRoundEnded(false)
    moveCountRef.current = 0
    playerDrawCountRef.current = 0
    playerHasDrawnRef.current = false
    setTimerKey(prev => prev + 1)
  }

  if (!gameState) return <div className="screen-container table-bg">Loading...</div>

  const player = gameState.players[0]
  const ai = gameState.players[1]
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !gameState.isGameOver && !roundEnded
  const timeLimit = getTimeLimit()
  const modeConfig = GAME_MODE_CONFIG[settings.gameMode]
  const canSkip = settings.gameMode === 'block' && !canPlayerPlay(gameState, 0)

  return (
    <div className="screen-container table-bg safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex justify-between items-center w-full px-4 py-2">
        <button onClick={() => { soundEngine.playClick(); setScreen('menu'); }} className="text-white p-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-white font-bold flex items-center gap-2">
          {settings.gameMode === 'points' && matchState ? (
            <>
              <Trophy size={16} className="gold-accent" />
              <span>{matchState.playerTotal} - {matchState.opponentTotal} / {matchState.targetScore}</span>
            </>
          ) : settings.gameMode === 'allFives' ? (
            <>
              <span className="text-yellow-400">5锔忊儯</span>
              <span>{player.score} - {ai.score}</span>
            </>
          ) : (
            <>
              <span className="text-lg">{modeConfig.icon}</span>
              <span>丕賱噩賵賱丞 {gameState.round}</span>
            </>
          )}
        </div>
        <button onClick={handleRestart} className="text-white p-2">
          <RotateCcw size={24} />
        </button>
      </div>

      {/* Timer Bar */}
      <TimerBar
        key={timerKey}
        timeLimit={timeLimit}
        isActive={isPlayerTurn && !roundEnded}
        onTimeUp={handleTimeUp}
        playerTurn={isPlayerTurn}
      />

      {/* Hint Message */}
      {settings.showHints && hintMessage && isPlayerTurn && (
        <div className="w-full px-4 py-1">
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-200 text-sm">{hintMessage}</span>
          </div>
        </div>
      )}

      {/* Block mode warning */}
      {settings.gameMode === 'block' && canSkip && isPlayerTurn && (
        <div className="w-full px-4 py-1">
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Lock size={16} className="text-red-400 flex-shrink-0" />
            <span className="text-red-200 text-sm">賱丕 賷賲賰賳賰 丕賱賱毓亘 - 丕囟睾胤 鬲禺胤賷</span>
          </div>
        </div>
      )}

      {/* Round end overlay */}
      {roundEnded && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
          <div className="bg-gray-900 rounded-xl p-6 text-center max-w-xs">
            <div className="text-3xl mb-2">馃幆</div>
            <h3 className="text-white text-xl font-bold mb-2">賳賴丕賷丞 丕賱噩賵賱丞!</h3>
            {matchState && (
              <div className="text-white/80 text-sm">
                <div>賳賯丕胤賰: {matchState.playerTotal}</div>
                <div>賳賯丕胤 丕賱禺氐賲: {matchState.opponentTotal}</div>
                <div className="text-yellow-400 mt-2">丕賱賴丿賮: {matchState.targetScore}</div>
              </div>
            )}
            <div className="text-white/60 text-sm mt-3">噩賵賱丞 賯丕丿賲丞...</div>
          </div>
        </div>
      )}

      {/* AI Player */}
      <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${gameState.currentPlayerIndex === 1 ? 'bg-yellow-500/20' : ''}`}>
        <img src={ai.avatar} alt="AI" className="avatar-img" />
        <div className="text-white">
          <div className="font-bold">{ai.name}</div>
          <div className="text-sm opacity-70">{ai.hand.length} 賯胤毓</div>
          {settings.gameMode === 'allFives' && (
            <div className="text-yellow-400 text-sm">{ai.score} 賳賯胤丞</div>
          )}
        </div>
        {aiThinking && <div className="text-yellow-400 text-sm animate-pulse">賷賮賰乇...</div>}
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden px-4">
        {gameState.board.length === 0 ? (
          <div className="text-white/50 text-lg">丕亘丿兀 丕賱賱毓亘 亘兀賷 賯胤毓丞</div>
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto py-4 w-full justify-center">
            {gameState.board.map((tile, i) => (
              <div key={tile.id} className={`domino-tile ${i === 0 ? 'border-l-4 border-yellow-400' : ''} ${i === gameState.board.length - 1 ? 'border-r-4 border-yellow-400' : ''}`}>
                <div className="domino-half">{renderDots(tile.top)}</div>
                <div className="domino-divider" />
                <div className="domino-half">{renderDots(tile.bottom)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="text-red-400 text-center text-sm px-4">{message}</div>
      )}

      {/* Player */}
      <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${isPlayerTurn ? 'bg-yellow-500/20' : ''}`}>
        <img src={player.avatar} alt="Player" className="avatar-img" />
        <div className="text-white">
          <div className="font-bold">{player.name}</div>
          <div className="text-sm opacity-70">{player.hand.length} 賯胤毓丞</div>
          {settings.gameMode === 'allFives' && (
            <div className="text-yellow-400 text-sm">{player.score} 賳賯胤丞</div>
          )}
        </div>
      </div>

      {/* Player Hand */}
      <div className="w-full px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto py-2">
          {player.hand.map((tile, index) => {
            const validEnds = getValidEnds(tile, gameState.board)
            const isSelected = selectedTile === index
            const canPlay = isPlayerTurn && validEnds.length > 0
            const showHint = settings.showHints && canPlay
            const isBestMove = bestMove?.tileIndex === index && showHint

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(index)}
                className={`domino-tile flex-shrink-0 transition-transform relative ${
                  isSelected ? 'scale-110 ring-2 ring-yellow-400' : ''
                } ${isBestMove ? 'ring-2 ring-green-400' : ''} ${canPlay ? '' : 'opacity-50'}`}
                disabled={!isPlayerTurn}
              >
                {isBestMove && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-10">
                    鈽�
                  </div>
                )}

                <div className="domino-half">{renderDots(tile.top)}</div>
                <div className="domino-divider" />
                <div className="domino-half">{renderDots(tile.bottom)}</div>

                {isSelected && validEnds.length > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
                    {validEnds.map((end) => (
                      <button
                        key={end}
                        onClick={(e) => { e.stopPropagation(); handlePlay(end) }}
                        className={`text-xs px-2 py-1 rounded font-bold ${
                          bestMove?.tileIndex === index && bestMove?.end === end
                            ? 'bg-green-500 text-white'
                            : 'bg-yellow-500 text-black'
                        }`}
                      >
                        {end === 'left' ? '鈫�' : '鈫�'}
                        {bestMove?.tileIndex === index && bestMove?.end === end && ' 鈽�'}
                      </button>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full px-4 pb-4 flex gap-2">
        <button
          onClick={handleDraw}
          disabled={!isPlayerTurn || gameState.stock.length === 0 || settings.gameMode === 'block'}
          className={`game-btn flex-1 ${
            isPlayerTurn && gameState.stock.length > 0 && settings.gameMode !== 'block' 
              ? 'game-btn-secondary' 
              : 'opacity-50'
          }`}
        >
          {settings.showHints && shouldDraw(gameState, 0) && isPlayerTurn && settings.gameMode !== 'block'
            ? '爻丨亘 鈫� 賱丕 賷賵噩丿 丨乇賰丞'
            : `爻丨亘 (${gameState.stock.length})`
          }
        </button>

        {canSkip && (
          <button
            onClick={handleSkip}
            className="game-btn flex-1 bg-red-600/80 text-white"
          >
            鬲禺胤賷 丕賱丿賵乇
          </button>
        )}
      </div>
    </div>
  )
}

function renderDots(count: number): JSX.Element {
  const positions: Record<number, string[]> = {
    0: [],
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
  }

  const dots = positions[count] || []

  return (
    <div className="dot-grid">
      {dots.map((pos) => (
        <div key={pos} className={`dot dot-${pos}`} />
      ))}
    </div>
  )
}
