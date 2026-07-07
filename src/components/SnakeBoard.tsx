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

  // Calculate the bounding box of all tiles to center them
  const { offsetX, offsetY, boardWidth, boardHeight } = useMemo(() => {
    if (board.length === 0) {
      return { offsetX: 0, offsetY: 0, boardWidth: 0, boardHeight: 0 }
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const tile of board) {
      // تحديد الاتجاه بشكل صحيح بناءً على زاوية المحرك
      const isHorizontal = tile.rotation === 90 || tile.rotation === 270
      const isDouble = tile.top === tile.bottom

      // الأبعاد: إذا كان أفقيًا، عرضه 72 وارتفاعه 36. إذا عموديًا، العكس.
      const tileW = isHorizontal ? 72 : 36
      const tileH = isHorizontal ? 36 : 72

      // لاحظ أن الدبل في المحرك يتم تحديد زاويته بناءً على انعطاف المسار، 
      // لذا لا داعي لمعالجته هنا بشكل منفصل، بل نثق بـ tile.rotation

      const left = tile.x - tileW / 2
      const right = tile.x + tileW / 2
      const top = tile.y - tileH / 2
      const bottom = tile.y + tileH / 2

      if (left < minX) minX = left
      if (right > maxX) maxX = right
      if (top < minY) minY = top
      if (bottom > maxY) maxY = bottom
    }

    return {
      offsetX: -minX + 20,  // Add padding
      offsetY: -minY + 20,  // Add padding
      boardWidth: maxX - minX + 40,  // Add padding on both sides
      boardHeight: maxY - minY + 40, // Add padding on both sides
    }
  }, [board])

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: `${Math.max(boardWidth, 300)}px`,
    height: `${Math.max(boardHeight, 300)}px`,
    // تم إزالة minWidth و minHeight لتجنب مشاكل التمرير غير المرغوب فيها
  }

  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto">
      <div style={containerStyle}>
        {board.map((tile) => {
          const isHorizontal = tile.rotation === 90 || tile.rotation === 270
          const tileW = isHorizontal ? 72 : 36
          const tileH = isHorizontal ? 36 : 72

          // Convert center coordinates to top-left positioning with offset
          const left = tile.x + offsetX - tileW / 2
          const top = tile.y + offsetY - tileH / 2

          return (
            <div
              key={tile.id}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${tileW}px`,
                height: `${tileH}px`,
                transform: `rotate(${tile.rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: 1,
              }}
            >
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f5f0e6',
                  border: '2px solid #8b7355',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: isHorizontal ? 'row' : 'column', // تم عكس الاتجاه هنا ليتناسب مع الأبعاد
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                {/* First value */}
                <div 
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    borderBottom: !isHorizontal ? '1px solid rgba(139,115,85,0.4)' : 'none',
                    borderRight: isHorizontal ? '1px solid rgba(139,115,85,0.4)' : 'none',
                  }}
                >
                  <Dots count={tile.top} />
                </div>

                {/* Second value */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
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

// دوال النقاط (Dots component) تبقى كما هي دون تغيير
function Dots({ count }: { count: number }) {
  const positions: Record<number, Array<{ top?: string; left?: string; right?: string; bottom?: string; transform?: string }>> = {
    0: [],
    1: [{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
    2: [
      { top: '20%', right: '20%' },
      { bottom: '20%', left: '20%' }
    ],
    3: [
      { top: '20%', right: '20%' },
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      { bottom: '20%', left: '20%' }
    ],
    4: [
      { top: '20%', left: '20%' },
      { top: '20%', right: '20%' },
      { bottom: '20%', left: '20%' },
      { bottom: '20%', right: '20%' }
    ],
    5: [
      { top: '20%', left: '20%' },
      { top: '20%', right: '20%' },
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      { bottom: '20%', left: '20%' },
      { bottom: '20%', right: '20%' }
    ],
    6: [
      { top: '20%', left: '20%' },
      { top: '20%', right: '20%' },
      { top: '50%', left: '20%', transform: 'translateY(-50%)' },
      { top: '50%', right: '20%', transform: 'translateY(-50%)' },
      { bottom: '20%', left: '20%' },
      { bottom: '20%', right: '20%' }
    ]
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {(positions[count] || []).map((style, i) => (
        <div 
          key={i}
          style={{
            position: 'absolute',
            width: '16%',
            height: '16%',
            backgroundColor: '#1a1a2e',
            borderRadius: '50%',
            ...style,
          }}
        />
      ))}
    </div>
  )
}