import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { createInitialState, playTile, drawFromStock, getValidEnds, getAIMove, calculateScore } from '@/lib/gameEngine'
import { GameState, DominoTile, TileEnd } from '@/types/game'
import { ArrowLeft, RotateCcw } from 'lucide-react'

export default function GameScreen() {
  const { setScreen, settings, updateStatistics } = useGameStore()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [aiThinking, setAiThinking] = useState(false)

  useEffect(() => {
    const state = createInitialState(
      ['أنت', 'الكمبيوتر'],
      ['/assets/avatar_player.png', '/assets/avatar_ai.png']
    )
    setGameState(state)
  }, [])

  // AI Turn
  useEffect(() => {
    if (!gameState || gameState.isGameOver) return
    if (gameState.currentPlayerIndex !== 1) return

    setAiThinking(true)
    const timer = setTimeout(() => {
      const aiMove = getAIMove(gameState, settings.difficulty)

      if (aiMove) {
        const result = playTile(gameState, 1, aiMove.tileIndex, aiMove.end)
        if (result.valid && result.newState) {
          setGameState(result.newState)
          if (result.newState.isGameOver) {
            handleGameEnd(result.newState)
          }
        }
      } else {
        // AI draws from stock
        const newState = drawFromStock(gameState, 1)
        setGameState(newState)
      }
      setAiThinking(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [gameState, settings.difficulty])

  const handleGameEnd = (state: GameState) => {
    const isWin = state.winner?.id === 'player-0'
    updateStatistics({
      gamesPlayed: 1,
      gamesWon: isWin ? 1 : 0,
      gamesLost: isWin ? 0 : 1,
      totalScore: calculateScore(state.players[0].hand),
    })
    setTimeout(() => setScreen('matchEnd'), 2000)
  }

  const handleTileClick = (index: number) => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking) return
    setSelectedTile(index === selectedTile ? null : index)
    setMessage('')
  }

  const handlePlay = (end: TileEnd) => {
    if (!gameState || selectedTile === null) return

    const result = playTile(gameState, 0, selectedTile, end)
    if (result.valid && result.newState) {
      setGameState(result.newState)
      setSelectedTile(null)
      setMessage('')

      if (result.newState.isGameOver) {
        handleGameEnd(result.newState)
      }
    } else {
      setMessage(result.message || 'لا يمكن اللعب هنا')
    }
  }

  const handleDraw = () => {
    if (!gameState || gameState.currentPlayerIndex !== 0 || aiThinking) return
    const newState = drawFromStock(gameState, 0)
    setGameState(newState)
    setMessage('سحبت قطعة جديدة')
    setSelectedTile(null)
  }

  const handleRestart = () => {
    const state = createInitialState(
      ['أنت', 'الكمبيوتر'],
      ['/assets/avatar_player.png', '/assets/avatar_ai.png']
    )
    setGameState(state)
    setSelectedTile(null)
    setMessage('')
    setAiThinking(false)
  }

  if (!gameState) return <div className="screen-container table-bg">Loading...</div>

  const player = gameState.players[0]
  const ai = gameState.players[1]
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !gameState.isGameOver

  return (
    <div className="screen-container table-bg safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex justify-between items-center w-full px-4 py-2">
        <button onClick={() => setScreen('menu')} className="text-white p-2">
          <ArrowLeft size={24} />
        </button>
        <div className="text-white font-bold">الجولة {gameState.round}</div>
        <button onClick={handleRestart} className="text-white p-2">
          <RotateCcw size={24} />
        </button>
      </div>

      {/* AI Player */}
      <div className={`flex items-center gap-3 px-4 py-2 rounded-xl ${gameState.currentPlayerIndex === 1 ? 'bg-yellow-500/20' : ''}`}>
        <img src={ai.avatar} alt="AI" className="avatar-img" />
        <div className="text-white">
          <div className="font-bold">{ai.name}</div>
          <div className="text-sm opacity-70">{ai.hand.length} قطع</div>
        </div>
        {aiThinking && <span className="text-yellow-400 text-sm ai-thinking">يفكر...</span>}
      </div>

      {/* Board */}
      <div className="game-board flex-1">
        <div className="board-chain">
          {gameState.board.length === 0 ? (
            <div className="text-white/50 text-lg">ابدأ اللعب بأي قطعة</div>
          ) : (
            gameState.board.map((tile) => (
              <div key={tile.id} className="domino-tile" style={{ width: '50px', height: '100px' }}>
                <div className="half"><Dots count={tile.top} /></div>
                <div className="divider" />
                <div className="half"><Dots count={tile.bottom} /></div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="text-yellow-400 text-center py-1 font-bold text-sm">{message}</div>
      )}

      {/* Player Info & Hand */}
      <div className="flex flex-col items-center gap-2 px-4 py-2">
        <div className={`flex items-center gap-3 ${isPlayerTurn ? 'bg-yellow-500/20' : ''} rounded-xl p-2`}>
          <img src={player.avatar} alt="Player" className="avatar-img" />
          <div className="text-white text-center">
            <div className="font-bold">{player.name}</div>
            <div className="text-sm opacity-70">{player.score} نقطة</div>
          </div>
        </div>

        <div className="player-hand w-full justify-center">
          {player.hand.map((tile, i) => (
            <div
              key={tile.id}
              onClick={() => handleTileClick(i)}
              className={`domino-tile ${selectedTile === i ? 'selected' : ''}`}
            >
              <div className="half"><Dots count={tile.top} /></div>
              <div className="divider" />
              <div className="half"><Dots count={tile.bottom} /></div>
            </div>
          ))}
        </div>

        {/* Controls */}
        {selectedTile !== null && isPlayerTurn && (
          <div className="flex gap-3 py-2">
            {getValidEnds(player.hand[selectedTile], gameState.board).map(end => (
              <button key={end} onClick={() => handlePlay(end)} className="game-btn game-btn-primary px-6">
                {end === 'left' ? '← يسار' : 'يمين →'}
              </button>
            ))}
          </div>
        )}

        {isPlayerTurn && selectedTile === null && (
          <button onClick={handleDraw} className="game-btn game-btn-secondary px-6">
            سحب من المخزون ({gameState.stock.length})
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