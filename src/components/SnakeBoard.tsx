import { BoardTile } from '@/types/game'
import { useMemo } from 'react'

interface Props {
  board: BoardTile[]
}

export default function SnakeBoard({ board }: Props) {
  if (board.length === 0) {
    return <div className="flex items-center justify-center h-full"><div className="text-white/50 text-sm">ابدأ اللعب</div></div>
  }

  const { offsetX, offsetY, boardWidth, boardHeight } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const tile of board) {
      const isHorizontal = tile.rotation === 90 || tile.rotation === 270
      const tileW = isHorizontal ? 72 : 36
      const tileH = isHorizontal ? 36 : 72
      const left = tile.x - tileW / 2
      const right = tile.x + tileW / 2
      const top = tile.y - tileH / 2
      const bottom = tile.y + tileH / 2
      if (left < minX) minX = left
      if (right > maxX) maxX = right
      if (top < minY) minY = top
      if (bottom > maxY) maxY = bottom
    }
    return { offsetX: -minX + 20, offsetY: -minY + 20, boardWidth: maxX - minX + 40, boardHeight: maxY - minY + 40 }
  }, [board])

  const containerStyle: React.CSSProperties = { position: 'relative', width: `${Math.max(boardWidth, 300)}px`, height: `${Math.max(boardHeight, 300)}px` }

  return (
    <div className="w-full h-full flex items-center justify-center overflow-auto">
      <div style={containerStyle}>
        {board.map((tile) => {
          const isHorizontal = tile.rotation === 90 || tile.rotation === 270
          const tileW = isHorizontal ? 72 : 36
          const tileH = isHorizontal ? 36 : 72
          const left = tile.x + offsetX - tileW / 2
          const top = tile.y + offsetY - tileH / 2

          return (
            <div key={tile.id} style={{ position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${tileW}px`, height: `${tileH}px`, transform: `rotate(${tile.rotation}deg)`, transformOrigin: 'center center', zIndex: 1 }}>
              <div style={{ width: '100%', height: '100%', backgroundColor: '#f5f0e6', border: '2px solid #8b7355', borderRadius: '6px', display: 'flex', flexDirection: isHorizontal ? 'row' : 'column', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderBottom: !isHorizontal ? '1px solid rgba(139,115,85,0.4)' : 'none', borderRight: isHorizontal ? '1px solid rgba(139,115,85,0.4)' : 'none' }}><Dots count={tile.top} /></div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><Dots count={tile.bottom} /></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dots({ count }: { count: number }) {
  const positions: Record<number, Array<{ top?: string; left?: string; right?: string; bottom?: string; transform?: string }>> = {
    0: [], 1: [{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
    2: [{ top: '20%', right: '20%' }, { bottom: '20%', left: '20%' }],
    3: [{ top: '20%', right: '20%' }, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, { bottom: '20%', left: '20%' }],
    4: [{ top: '20%', left: '20%' }, { top: '20%', right: '20%' }, { bottom: '20%', left: '20%' }, { bottom: '20%', right: '20%' }],
    5: [{ top: '20%', left: '20%' }, { top: '20%', right: '20%' }, { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, { bottom: '20%', left: '20%' }, { bottom: '20%', right: '20%' }],
    6: [{ top: '20%', left: '20%' }, { top: '20%', right: '20%' }, { top: '50%', left: '20%', transform: 'translateY(-50%)' }, { top: '50%', right: '20%', transform: 'translateY(-50%)' }, { bottom: '20%', left: '20%' }, { bottom: '20%', right: '20%' }]
  }
  return (<div style={{ position: 'relative', width: '100%', height: '100%' }}>{(positions[count] || []).map((style, i) => (<div key={i} style={{ position: 'absolute', width: '16%', height: '16%', backgroundColor: '#1a1a2e', borderRadius: '50%', ...style }} />))}</div>)
}