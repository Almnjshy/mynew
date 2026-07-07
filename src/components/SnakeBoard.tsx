import { BoardTile } from '@/types/game'
import { useMemo } from 'react'

interface Props {
  board: BoardTile[]
}

export default function SnakeBoard({ board }: Props) {
  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-sm">ابدأ اللعب</div>
      </div>
    )
  }

  // Group tiles by row for snake layout display
  const rows = useMemo(() => {
    const rowMap = new Map<number, BoardTile[]>()

    for (const tile of board) {
      // Round y to nearest row (accounting for slight variations)
      const rowY = Math.round(tile.y / 10) * 10
      if (!rowMap.has(rowY)) {
        rowMap.set(rowY, [])
      }
      rowMap.get(rowY)!.push(tile)
    }

    // Sort rows by y position
    const sortedRows = Array.from(rowMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, tiles]) => {
        // Sort tiles within row by x position
        return tiles.sort((a, b) => a.x - b.x)
      })

    return sortedRows
  }, [board])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden gap-1">
      {rows.map((rowTiles, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex items-center gap-1"
          style={{ 
            flexDirection: rowIndex % 2 === 1 ? 'row-reverse' : 'row',
          }}
        >
          {rowTiles.map((tile) => {
            const isDouble = tile.top === tile.bottom
            const isVertical = tile.rotation === 0 || tile.rotation === 180

            // For display, we render tiles as they should appear
            // Vertical tiles: tall and narrow
            // Horizontal tiles: wide and short
            const displayWidth = isVertical ? 36 : 72
            const displayHeight = isVertical ? 72 : 36

            return (
              <div
                key={tile.id}
                className="flex-shrink-0"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                }}
              >
                <div 
                  className="w-full h-full bg-[#f5f0e6] border-2 border-[#8b7355] rounded-md flex overflow-hidden shadow-md"
                  style={{
                    flexDirection: isVertical ? 'column' : 'row',
                  }}
                >
                  {/* First value */}
                  <div 
                    className="flex-1 flex items-center justify-center relative"
                    style={{
                      borderBottom: isVertical ? '1px solid rgba(139,115,85,0.4)' : 'none',
                      borderRight: isVertical ? 'none' : '1px solid rgba(139,115,85,0.4)',
                    }}
                  >
                    <Dots count={tile.top} />
                  </div>
                  {/* Second value */}
                  <div className="flex-1 flex items-center justify-center relative">
                    <Dots count={tile.bottom} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

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
