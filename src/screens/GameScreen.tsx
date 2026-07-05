import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { createInitialState, playTile, drawFromStock, getValidEnds, getAIMove, calculateScore, isGameBlocked, getBlockedWinner, canPlayerPlay, skipTurn } from '@/lib/gameEngine'
import { getBestMove, getHintMessage, shouldDraw } from '@/lib/hintEngine'
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

  // Get AI names based on count
  const getAINames = useCallback((count: number): string[] => {
    const names = ['الكمبيوتر', 'الكمبيوتر 2', 'الكمبيوتر 3', 'الكمبيوتر 4']
    return names.slice(0, count)
  }, [])

  const getAIAvatars = useCallback((count: number): string[] => {
    const avatars = [
      '/assets/avatar_ai.png',
      '/assets/avatar_ai.png',
      '/assets/avatar_ai.png',
      '/assets/avatar_ai.png'
    ]
    return avatars.slice(0, count)
  }, [])

  useEffect(() => {
    sessionStorage.setItem('gameStartTime', String(Date.now()))

    // Get AI count from settings or default to 1
    const aiCount = settings.aiCount || 1
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

  // AI Turn - handles multiple AI players
  useEffect(() => {
    if (!gameState || gameState.isGameOver || roundEnded) return
    if (gameState.currentPlayerIndex === 0) return // Player's turn

    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (!currentPlayer.isAI) return

    setAiThinking(true)
    const timer = setTimeout(() => {
      if (isGameBlocked(gameState)) {
        const blockedWinner = getBlockedWinner(gameState)
        setGameState(prev => prev ? { ...prev, isGameOver: true, winner: blockedWinner, isBlocked: true } : null)
        handleRoundEnd({ ...gameState, isGameOver: true, winner: blockedWinner, isBlocked: true })
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

          if (settings.gameMode === 'allFives' && result.newState.players[gameState.currentPlayerIndex].score > (gameState.players[gameState.currentPlayerIndex]?.score || 0)) {
            const gained = result.newState.players[gameState.currentPlayerIndex].score - (gameState.players[gameState.currentPlayerIndex]?.score || 0)
            setMessage(`${currentPlayer.name} حصل على ${gained} نقطة!`)
          }

          setGameState(result.newState)
          if (result.newState.isGameOver) {
            handleRoundEnd(result.newState)
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

    sessionStorage.setItem('lastWinner', state.winner?.name || 'الكمبيوتر')
    sessionStorage.setItem('lastRoundPoints', String(pointsGained))
    sessionStorage.setItem('movesCount', String(moveCountRef.current))

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
          const aiCount = settings.aiCount || 1
          const aiNames = getAINames(aiCount)
          const aiAvatars = getAIAvatars(aiCount)
          const newState = createInitialState(
            [playerName, ...aiNames],
            [playerAvatar, ...aiAvatars]
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
    setSelectedTile(index === selectedTile ? null : index)
    setMessage('')
  }

  const handlePlay = (end: TileEnd) => {
    if (!gameState || selectedTile === null) return

    const result = playTile(gameState, 0, selectedTile, end)
    if (result.valid && result.newState) {
      moveCountRef.current += 1

      if (settings.gameMode === 'allFives') {
        const gained = result.newState.players[0].score - (gameState.players[0]?.score || 0)
        if (gained > 0) {
          setMessage(`+${gained} نقطة! مجموع الأطراف = 5`)
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
      setMessage(result.message || 'لا يمكن اللعب هنا')
    }
  }

  const handleDraw = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking || roundEnded) return

    if (settings.gameMode === 'block') {
      setMessage('نمط الحظر: لا يمكن السحب!')
      return
    }

    const newState = drawFromStock(gameState, 0)
    setGameState(newState)
    setMessage('سحبت قطعة جديدة')
    setSelectedTile(null)
    setTimerKey(prev => prev + 1)

    playerDrawCountRef.current += 1
    playerHasDrawnRef.current = true
  }

  const handleSkip = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking || roundEnded) return

    if (settings.gameMode === 'block' && !canPlayerPlay(gameState, 0)) {
      const newState = skipTurn(gameState)
      setGameState(newState)
      setMessage('تخطي الدور')
      setSelectedTile(null)
      setTimerKey(prev => prev + 1)
    }
  }

  const handleRestart = () => {
    sessionStorage.setItem('gameStartTime', String(Date.now()))
    if (settings.gameMode === 'points') {
      initMatchState(settings.targetScore)
    }
    const aiCount = settings.aiCount || 1
    const aiNames = getAINames(aiCount)
    const aiAvatars = getAIAvatars(aiCount)
    const state = createInitialState(
      [playerName, ...aiNames],
      [playerAvatar, ...aiAvatars]
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
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !gameState.isGameOver && !roundEnded
  const timeLimit = getTimeLimit()
  const modeConfig = GAME_MODE_CONFIG[settings.gameMode]
  const canSkip = settings.gameMode === 'block' && !canPlayerPlay(gameState, 0)

  // Get current AI player info
  const currentAI = gameState.currentPlayerIndex !== 0 ? gameState.players[gameState.currentPlayerIndex] : null

  return (
    <div className="screen-container table-bg safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex justify-between items-center w-full px-4 py-2">
        <button onClick={() => setScreen('menu')} className="text-white p-2">
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
              <span className="text-yellow-400">5️⃣</span>
              <span>{player.score} - {gameState.players[1]?.score || 0}</span>
            </>
          ) : (
            <>
              <span className="text-lg">{modeConfig.icon}</span>
              <span>الجولة {gameState.round}</span>
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
            <span className="text-red-200 text-sm">لا يمكنك اللعب - اضغط تخطي</span>
          </div>
        </div>
      )}

      {/* Round end overlay */}
      {roundEnded && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
          <div className="bg-gray-900 rounded-xl p-6 text-center max-w-xs">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="text-white text-xl font-bold mb-2">نهاية الجولة!</h3>
            {matchState && (
              <div className="text-white/80 text-sm">
                <div>نقاطك: {matchState.playerTotal}</div>
                <div>نقاط الخصم: {matchState.opponentTotal}</div>
                <div className="text-yellow-400 mt-2">الهدف: {matchState.targetScore}</div>
              </div>
            )}
            <div className="text-white/60 text-sm mt-3">جولة قادمة...</div>
          </div>
        </div>
      )}

      {/* AI Players Info */}
      <div className="w-full px-4">
        {gameState.players.map((p, i) => {
          if (i === 0) return null // Skip player
          return (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl mb-1 ${gameState.currentPlayerIndex === i ? 'bg-yellow-500/20' : ''}`}>
              <img src={p.avatar} alt={p.name} className="avatar-img" style={{ width: '48px', height: '48px' }} />
              <div className="text-white">
                <div className="font-bold">{p.name}</div>
                <div className="text-sm opacity-70">{p.hand.length} قطع</div>
                {settings.gameMode === 'allFives' && (
                  <div className="text-yellow-400 text-sm">{p.score} نقطة</div>
                )}
              </div>
              {gameState.currentPlayerIndex === i && aiThinking && (
                <div className="text-yellow-400 text-sm animate-pulse">يفكر...</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Board - Snake Layout */}
      <div className="game-board">
        {gameState.board.length === 0 ? (
          <div className="text-white/50 text-lg">ابدأ اللعب بأي قطعة</div>
        ) : (
          <div className="snake-board">
            {(() => {
              // Create snake layout rows
              const rows: DominoTile[][] = []
              let currentRow: DominoTile[] = []
              const maxPerRow = 6 // Adjust based on screen width
              
              gameState.board.forEach((tile, i) => {
                currentRow.push(tile)
                if (currentRow.length >= maxPerRow) {
                  rows.push([...currentRow])
                  currentRow = []
                }
              })
              if (currentRow.length > 0) rows.push(currentRow)
              
              return rows.map((row, rowIndex) => (
                <div key={rowIndex} className="snake-row">
                  {row.map((tile) => (
                    <div key={tile.id} className="domino-tile">
                      <div className="half"><Dots count={tile.top} /></div>
                      <div className="divider" />
                      <div className="half"><Dots count={tile.bottom} /></div>
                    </div>
                  ))}
                </div>
              ))
            })()}
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
          <div className="text-sm opacity-70">{player.hand.length} قطعة</div>
          {settings.gameMode === 'allFives' && (
            <div className="text-yellow-400 text-sm">{player.score} نقطة</div>
          )}
        </div>
      </div>

      {/* Player Hand */}
      <div className="w-full px-4 pb-2">
        <div className="player-hand w-full justify-center">
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
                className={`domino-tile ${isSelected ? 'selected' : ''} ${isBestMove ? 'ring-2 ring-green-400' : ''} ${canPlay ? '' : 'opacity-50'}`}
                disabled={!isPlayerTurn}
              >
                {isBestMove && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-10">
                    ⭐
                  </div>
                )}

                <div className="half"><Dots count={tile.top} /></div>
                <div className="divider" />
                <div className="half"><Dots count={tile.bottom} /></div>

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
                        {end === 'left' ? '← يسار' : 'يمين →'}
                        {bestMove?.tileIndex === index && bestMove?.end === end && ' ⭐'}
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
            ? 'سحب ← لا يوجد حركة'
            : `سحب (${gameState.stock.length})`
          }
        </button>

        {canSkip && (
          <button
            onClick={handleSkip}
            className="game-btn flex-1 bg-red-600/80 text-white"
          >
            تخطي الدور
          </button>
        )}
      </div>
    </div>
  )
}

function Dots({ count }: { count: number }) {
  const positions: Record<number, string[]> = {
    0: [],
    1: ['c'],
    2: ['tl', 'br'],
    3: ['tl', 'c', 'br'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'c', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
  }

  const map: Record<string, React.CSSProperties> = {
    'tl': { top: '6px', left: '6px' },
    'tr': { top: '6px', right: '6px' },
    'ml': { top: '50%', left: '6px', transform: 'translateY(-50%)' },
    'mr': { top: '50%', right: '6px', transform: 'translateY(-50%)' },
    'c': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'bl': { bottom: '6px', left: '6px' },
    'br': { bottom: '6px', right: '6px' },
  }

  return (
    <div className="relative w-full h-full">
      {(positions[count] || []).map((p, i) => (
        <div key={i} className="dot" style={map[p]} />
      ))}
    </div>
  )
}
