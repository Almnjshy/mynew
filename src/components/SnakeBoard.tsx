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

  // Find bounds for centering
  const xs = board.map(t => t.x)
  const ys = board.map(t => t.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="relative">
        {board.map((tile) => {
          // Calculate display dimensions based on rotation
          const isVertical = tile.rotation === 0 || tile.rotation === 180
          const width = isVertical ? 40 : 80
          const height = isVertical ? 80 : 40

          return (
            <div
              key={tile.id}
              className="absolute"
              style={{
                left: tile.x - centerX + 200,  // Center in container
                top: tile.y - centerY + 150,
                width: width,
                height: height,
                transform: `rotate(${tile.rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div className="w-full h-full bg-[#f5f0e6] border border-[#8b7355] rounded-md flex flex-col overflow-hidden shadow-md">
                {/* Top half - always the connected side (inner) */}
                <div className="flex-1 flex items-center justify-center border-b border-[#8b7355]/40 relative">
                  <Dots count={tile.connectedValue} />
                </div>
                {/* Bottom half - always the exposed side (outer) */}
                <div className="flex-1 flex items-center justify-center relative">
                  <Dots count={tile.exposedValue} />
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
