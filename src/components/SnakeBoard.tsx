import { BoardTile } from '@/types/game'

interface Props {
  board: BoardTile[]
}

// Tile dimensions
const TILE_W = 50   // Width of vertical tile
const TILE_H = 100  // Height of vertical tile
const GAP = 4       // Gap between tiles

export default function SnakeBoard({ board }: Props) {
  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-sm">ابدأ اللعب</div>
      </div>
    )
  }

  // Calculate bounds
  const rows = board.map(t => t.row)
  const cols = board.map(t => t.col)
  const minRow = Math.min(...rows)
  const maxRow = Math.max(...rows)
  const minCol = Math.min(...cols)
  const maxCol = Math.max(...cols)

  const cellW = TILE_W + GAP
  const cellH = TILE_H + GAP

  const containerWidth = (maxCol - minCol + 1) * cellW
  const containerHeight = (maxRow - minRow + 1) * cellH

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="relative"
        style={{
          width: Math.max(containerWidth, cellW),
          height: Math.max(containerHeight, cellH),
        }}
      >
        {board.map((tile, index) => {
          const x = (tile.col - minCol) * cellW
          const y = (tile.row - minRow) * cellH

          // FIXED: Apply rotation based on tile.rotation
          const isHorizontal = tile.rotation === 90 || tile.rotation === 270
          const tileWidth = isHorizontal ? TILE_H : TILE_W
          const tileHeight = isHorizontal ? TILE_W : TILE_H

          return (
            <div
              key={tile.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: tileWidth,
                height: tileHeight,
                zIndex: index,
                transform: `rotate(${tile.rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div className="w-full h-full bg-[#f5f0e6] border-2 border-[#8b7355] rounded-lg flex flex-col overflow-hidden shadow-md">
                {/* Top half */}
                <div className="flex-1 flex items-center justify-center border-b border-[#8b7355]/40 relative">
                  <Dots count={tile.top} />
                </div>
                {/* Bottom half */}
                <div className="flex-1 flex items-center justify-center relative">
                  <Dots count={tile.bottom} />
                </div>
              </div>

              {/* Connection indicator (small dot on connecting side) */}
              {index > 0 && (
                <div 
                  className="absolute w-2 h-2 bg-[#8b7355] rounded-full"
                  style={{
                    ...(tile.col > board[index-1].col ? { right: -5, top: '50%', transform: 'translateY(-50%)' } :
                       tile.col < board[index-1].col ? { left: -5, top: '50%', transform: 'translateY(-50%)' } :
                       tile.row > board[index-1].row ? { bottom: -5, left: '50%', transform: 'translateX(-50%)' } :
                       { top: -5, left: '50%', transform: 'translateX(-50%)' })
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Dot patterns for domino faces
function Dots({ count }: { count: number }) {
  const positions: Record<number, string[]> = {
    0: [],
    1: ['c'],
    2: ['tl','br'],
    3: ['tl','c','br'],
    4: ['tl','tr','bl','br'],
    5: ['tl','tr','c','bl','br'],
    6: ['tl','tr','ml','mr','bl','br']
  }

  const posMap: Record<string, React.CSSProperties> = {
    'tl': { top: '15%', left: '15%' },
    'tr': { top: '15%', right: '15%' },
    'ml': { top: '50%', left: '15%', transform: 'translateY(-50%)' },
    'mr': { top: '50%', right: '15%', transform: 'translateY(-50%)' },
    'c':  { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'bl': { bottom: '15%', left: '15%' },
    'br': { bottom: '15%', right: '15%' },
  }

  return (
    <div className="relative w-full h-full">
      {(positions[count] || []).map((p, i) => (
        <div 
          key={i} 
          className="absolute w-[18%] h-[18%] bg-[#1a1a2e] rounded-full"
          style={posMap[p]} 
        />
      ))}
    </div>
  )
}
