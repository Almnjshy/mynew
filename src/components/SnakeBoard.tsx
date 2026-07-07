import { BoardTile } from '@/types/game'

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

  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
      <div 
        className="relative" 
        style={{ 
          width: '100%', 
          height: '100%',
          maxWidth: '600px',
          maxHeight: '600px'
        }}
      >
        {board.map((tile) => {
          const isDouble = tile.top === tile.bottom
          const isVertical = tile.rotation === 0 || tile.rotation === 180
          const displayWidth = isVertical ? 36 : 72
          const displayHeight = isVertical ? 72 : 36

          // Convert from center-based coordinates to absolute positioning
          // 300 is half the container width (centering offset)
          const left = tile.x + 300 - displayWidth / 2
          const top = tile.y + 300 - displayHeight / 2

          return (
            <div
              key={tile.id}
              className="absolute"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: displayWidth,
                height: displayHeight,
                transform: `rotate(${tile.rotation}deg)`,
                transformOrigin: 'center center',
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