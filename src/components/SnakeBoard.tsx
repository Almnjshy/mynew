import { BoardTile } from '@/types/game'
import { useMemo, useRef, useEffect, useState } from 'react'

interface Props {
  board: BoardTile[]
}

// نفس الثوابت المستخدمة في المحرك (gameEngine.ts) — يجب أن تبقى متطابقة
const TILE_W = 36
const TILE_H = 72

export default function SnakeBoard({ board }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // نحسب الصندوق المحيط (bounding box) الحقيقي لكل القطع بناءً على
  // إحداثيات x,y الفعلية القادمة من المحرك — لا تخمين هنا إطلاقًا
  const bounds = useMemo(() => {
    if (board.length === 0) return null
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const tile of board) {
      const isDouble = tile.top === tile.bottom
      const isVertical = isDouble || tile.rotation === 0 || tile.rotation === 180
      const w = isVertical ? TILE_W : TILE_H
      const h = isVertical ? TILE_H : TILE_W
      minX = Math.min(minX, tile.x - w / 2)
      maxX = Math.max(maxX, tile.x + w / 2)
      minY = Math.min(minY, tile.y - h / 2)
      maxY = Math.max(maxY, tile.y + h / 2)
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
  }, [board])

  // تحجيم تلقائي ليلائم حاوية العرض المتاحة، مع الحفاظ على النسبة
  useEffect(() => {
    if (!bounds || !containerRef.current) return
    const { clientWidth, clientHeight } = containerRef.current
    if (!clientWidth || !clientHeight) return
    const padding = 32
    const scaleX = (clientWidth - padding) / Math.max(bounds.width, 1)
    const scaleY = (clientHeight - padding) / Math.max(bounds.height, 1)
    setScale(Math.min(scaleX, scaleY, 1.4))
  }, [bounds])

  if (board.length === 0 || !bounds) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-sm">ابدأ اللعب</div>
      </div>
    )
  }

  // مركز الصندوق المحيط، لنتوسّط حوله بدل التوسط حول القطعة الأولى فقط
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2"
        style={{ transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center' }}
      >
        {board.map((tile) => {
          const isDouble = tile.top === tile.bottom
          const isVertical = isDouble || tile.rotation === 0 || tile.rotation === 180
          const w = isVertical ? TILE_W : TILE_H
          const h = isVertical ? TILE_H : TILE_W

          return (
            <div
              key={tile.id}
              className="absolute"
              style={{
                width: w,
                height: h,
                left: tile.x - centerX - w / 2,
                top: tile.y - centerY - h / 2,
              }}
            >
              <div
                className="w-full h-full bg-[#f5f0e6] border-2 border-[#8b7355] rounded-md flex overflow-hidden shadow-md"
                style={{ flexDirection: isVertical ? 'column' : 'row' }}
              >
                {/* القيمة الأولى */}
                <div
                  className="flex-1 flex items-center justify-center relative"
                  style={{
                    borderBottom: isVertical ? '1px solid rgba(139,115,85,0.4)' : 'none',
                    borderRight: isVertical ? 'none' : '1px solid rgba(139,115,85,0.4)',
                  }}
                >
                  <Dots count={tile.top} />
                </div>
                {/* القيمة الثانية */}
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
    2: ['tl', 'br'],
    3: ['tl', 'c', 'br'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'c', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
  }

  const posMap: Record<string, React.CSSProperties> = {
    'tl': { top: '15%', left: '15%' },
    'tr': { top: '15%', right: '15%' },
    'ml': { top: '50%', left: '15%', transform: 'translateY(-50%)' },
    'mr': { top: '50%', right: '15%', transform: 'translateY(-50%)' },
    'c': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
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