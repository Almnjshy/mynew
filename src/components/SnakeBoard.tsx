import { BoardTile } from '@/types/game'
import { useMemo } from 'react'

interface Props {
  board: BoardTile[]
}

const TILE_W = 36   // Narrow width (for doubles)
const TILE_H = 72   // Long length (for normal tiles)

export default function SnakeBoard({ board }: Props) {
  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-sm">ابدأ اللعب</div>
      </div>
    )
  }

  // Calculate centering offset to keep the chain centered
  const offset = useMemo(() => {
    const xs = board.map(t => t.x)
    const ys = board.map(t => t.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return {
      x: -(minX + maxX) / 2,
      y: -(minY + maxY) / 2,
    }
  }, [board])

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="relative"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {board.map((tile, index) => {
          const isDouble = tile.top === tile.bottom
          const isVertical = tile.rotation === 0 || tile.rotation === 180

          // Calculate dimensions based on rotation
          const width = isVertical ? TILE_W : TILE_H
          const height = isVertical ? TILE_H : TILE_W

          return (
            <div
              key={tile.id}
              className="absolute"
              style={{
                left: tile.x,
                top: tile.y,
                width: width,
                height: height,
                transform: `rotate(${tile.rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'all 0.2s ease-out',
              }}
            >
              <div 
                className="w-full h-full bg-[#f5f0e6] border-2 border-[#8b7355] rounded-md flex flex-col overflow-hidden shadow-md"
                style={{
                  // For horizontal tiles (rotation 90 or 270), swap flex direction
                  flexDirection: isVertical ? 'column' : 'row',
                }}
              >
                {/* First half - always shows tile.top */}
                <div 
                  className="flex-1 flex items-center justify-center border-b border-[#8b7355]/40 relative"
                  style={{
                    borderBottomWidth: isVertical ? '1px' : '0',
                    borderRightWidth: isVertical ? '0' : '1px',
                  }}
                >
                  <Dots count={tile.top} />
                </div>
                {/* Second half - always shows tile.bottom */}
                <div className="flex-1 flex items-center justify-center relative">
                  <Dots count={tile.bottom} />
                </div>
              </div>
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
