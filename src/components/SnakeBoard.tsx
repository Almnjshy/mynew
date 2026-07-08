import { BoardTile, GameState, TileEnd } from '@/types/game'
import { useMemo } from 'react'

interface Props {
  state: GameState
  onPlayTile?: (tileIndex: number, end: TileEnd) => void
  selectedTileIndex: number | null
}

/**
 * Get Unicode domino character for a tile
 */
function getUnicodeChar(top: number, bottom: number, isHorizontal: boolean): string {
  const base = isHorizontal ? 0x1F030 : 0x1F062
  const normalizedTop = Math.min(top, bottom)
  const normalizedBottom = Math.max(top, bottom)
  const offset = normalizedTop * 7 + normalizedBottom
  return String.fromCodePoint(base + offset)
}

/**
 * Calculate connector line between two adjacent tiles
 */
function getConnectorLine(
  fromTile: BoardTile, 
  toTile: BoardTile
): { x1: number; y1: number; x2: number; y2: number } | null {
  const fromIsH = fromTile.rotation === 90 || fromTile.rotation === 270
  const toIsH = toTile.rotation === 90 || toTile.rotation === 270

  const fromW = fromIsH ? 72 : 36
  const fromH = fromIsH ? 36 : 72
  const toW = toIsH ? 72 : 36
  const toH = toIsH ? 36 : 72

  // Calculate edge centers
  const edges = [
    { 
      from: { x: fromTile.x + fromW/2, y: fromTile.y },
      to: { x: toTile.x - toW/2, y: toTile.y },
      dist: Math.hypot((fromTile.x + fromW/2) - (toTile.x - toW/2), fromTile.y - toTile.y)
    },
    { 
      from: { x: fromTile.x - fromW/2, y: fromTile.y },
      to: { x: toTile.x + toW/2, y: toTile.y },
      dist: Math.hypot((fromTile.x - fromW/2) - (toTile.x + toW/2), fromTile.y - toTile.y)
    },
    { 
      from: { x: fromTile.x, y: fromTile.y - fromH/2 },
      to: { x: toTile.x, y: toTile.y + toH/2 },
      dist: Math.hypot(fromTile.x - toTile.x, (fromTile.y - fromH/2) - (toTile.y + toH/2))
    },
    { 
      from: { x: fromTile.x, y: fromTile.y + fromH/2 },
      to: { x: toTile.x, y: toTile.y - toH/2 },
      dist: Math.hypot(fromTile.x - toTile.x, (fromTile.y + fromH/2) - (toTile.y - toH/2))
    },
  ]

  const best = edges.reduce((min, e) => e.dist < min.dist ? e : min, edges[0])

  if (best.dist > 100) return null

  return {
    x1: best.from.x,
    y1: best.from.y,
    x2: best.to.x,
    y2: best.to.y,
  }
}

export default function SnakeBoard({ state, onPlayTile, selectedTileIndex }: Props) {
  const { board, bounds, leftHead, rightHead } = state

  // Calculate connector lines between adjacent tiles
  const connectors = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = []
    for (let i = 0; i < board.length - 1; i++) {
      const line = getConnectorLine(board[i], board[i + 1])
      if (line) {
        lines.push({ ...line, key: `conn-${board[i].id}-${board[i+1].id}` })
      }
    }
    return lines
  }, [board])

  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-[#1b4d3e] rounded-xl text-white/40 font-bold text-lg">
        <div className="text-center">
          <div className="text-4xl mb-2">🎲</div>
          <div>لوحة اللعب فارغة</div>
          <div className="text-sm mt-1">ابدأ بقطعة الدبل (التؤام) للبدء!</div>
        </div>
      </div>
    )
  }

  const safeMinX = bounds?.minX ?? -400
  const safeMaxX = bounds?.maxX ?? 400
  const safeMinY = bounds?.minY ?? -300
  const safeMaxY = bounds?.maxY ?? 300

  const canvasWidth = Math.max(safeMaxX - safeMinX, 200)
  const canvasHeight = Math.max(safeMaxY - safeMinY, 200)

  const getCanvasCoords = (x: number, y: number) => {
    return {
      left: `${x - safeMinX}px`,
      top: `${y - safeMinY}px`,
    }
  }

  return (
    <div className="w-full h-full min-h-[300px] overflow-auto bg-[#133b2f] rounded-xl shadow-2xl p-4 relative border-4 border-[#0b241d]">
      <div
        className="relative bg-[#1b4d3e] rounded-lg shadow-inner transition-all duration-500"
        style={{ 
          width: `${canvasWidth}px`, 
          height: `${canvasHeight}px`,
          minWidth: '100%',
          minHeight: '100%'
        }}
      >
        {/* SVG Connector Lines */}
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none" 
          style={{ overflow: 'visible' }}
        >
          {connectors.map((conn) => (
            <line
              key={conn.key}
              x1={conn.x1 - safeMinX}
              y1={conn.y1 - safeMinY}
              x2={conn.x2 - safeMinX}
              y2={conn.y2 - safeMinY}
              stroke="#c4a35a"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.8"
            />
          ))}
        </svg>

        {/* Board Tiles with CSS Animations */}
        {board.map((tile, index) => {
          const isHorizontal = tile.rotation === 90 || tile.rotation === 270
          const currentWidth = isHorizontal ? 72 : 36
          const currentHeight = isHorizontal ? 36 : 72
          const coords = getCanvasCoords(tile.x, tile.y)
          const isFirst = index === 0
          const isLast = index === board.length - 1

          return (
            <div
              key={tile.id}
              className="absolute flex items-center justify-center tile-appear"
              style={{
                left: coords.left,
                top: coords.top,
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                animation: `tileAppear 0.5s ease-out ${index * 0.05}s both`,
              }}
            >
              {/* Unicode Tile */}
              <div
                className="flex items-center justify-center select-none tile-hover"
                style={{ 
                  width: isHorizontal ? '72px' : '36px',
                  height: isHorizontal ? '36px' : '72px',
                  transform: `rotate(${tile.rotation || 0}deg)`,
                  fontSize: isHorizontal ? '3.5rem' : '2.5rem',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  transition: 'transform 0.3s ease',
                }}
              >
                {getUnicodeChar(tile.top, tile.bottom, isHorizontal)}
              </div>

              {/* Matching number indicator */}
              {(isFirst || isLast) && (
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/90 text-black whitespace-nowrap open-end-badge"
                  style={{
                    animation: 'badgeAppear 0.3s ease-out 0.5s both',
                  }}
                >
                  {isFirst ? tile.startValue : tile.endValue}
                </div>
              )}
            </div>
          )
        })}

        {/* Play Hints - Drop zones for selected tile */}
        {selectedTileIndex !== null && onPlayTile && board.length > 0 && (
          <>
            {/* Left Drop Zone */}
            <div
              className="absolute w-14 h-14 bg-yellow-400/20 border-2 border-dashed border-yellow-400 rounded-full cursor-pointer flex items-center justify-center hover:bg-yellow-400/40 transition-all duration-300 drop-zone-pulse"
              style={{
                ...getCanvasCoords(leftHead?.x ?? 0, leftHead?.y ?? 0),
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              }}
              onClick={() => onPlayTile(selectedTileIndex, 'left')}
              title="العب في الطرف الأيسر"
            >
              <span className="text-yellow-300 text-xs font-bold">←</span>
            </div>

            {/* Right Drop Zone */}
            <div
              className="absolute w-14 h-14 bg-cyan-400/20 border-2 border-dashed border-cyan-400 rounded-full cursor-pointer flex items-center justify-center hover:bg-cyan-400/40 transition-all duration-300 drop-zone-pulse"
              style={{
                ...getCanvasCoords(rightHead?.x ?? 0, rightHead?.y ?? 0),
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
              }}
              onClick={() => onPlayTile(selectedTileIndex, 'right')}
              title="العب في الطرف الأيمن"
            >
              <span className="text-cyan-300 text-xs font-bold">→</span>
            </div>
          </>
        )}

        {/* First move hint */}
        {selectedTileIndex !== null && onPlayTile && board.length === 0 && (
          <div
            className="absolute w-16 h-16 bg-green-400/20 border-2 border-dashed border-green-400 rounded-full cursor-pointer flex items-center justify-center hover:bg-green-400/40 transition-all duration-300 start-hint-pulse"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
            }}
            onClick={() => onPlayTile(selectedTileIndex, 'left')}
            title="ابدأ اللعب هنا"
          >
            <span className="text-green-300 text-xs font-bold">ابدأ</span>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes tileAppear {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes badgeAppear {
          from {
            opacity: 0;
            transform: translateX(-50%) scale(0);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes dropZonePulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
        }

        @keyframes startHintPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
            box-shadow: 0 0 0 10px rgba(74, 222, 128, 0);
          }
        }

        .tile-hover:hover {
          transform: translate(-50%, -50%) scale(1.1) !important;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)) !important;
        }

        .drop-zone-pulse {
          animation: dropZonePulse 1.5s ease-in-out infinite;
        }

        .start-hint-pulse {
          animation: startHintPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
