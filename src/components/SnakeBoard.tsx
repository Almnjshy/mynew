import { BoardTile, GameState, TileEnd } from '@/types/game'

interface Props {
  state: GameState
  onPlayTile?: (tileIndex: number, end: TileEnd) => void
  selectedTileIndex: number | null
}

export default function SnakeBoard({ state, onPlayTile, selectedTileIndex }: Props) {
  const { board, bounds, leftHead, rightHead } = state

  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] bg-[#1b4d3e] rounded-xl text-white/40 font-bold">
        لوحة اللعب فارغة. العب قطعة الدبل الأولى للبدء!
      </div>
    )
  }

  // تأمين احتياطي في حال لم يتم حساب الـ bounds بعد (ضمان عدم انهيار الـ UI)
  const safeMinX = bounds?.minX ?? -400
  const safeMaxX = bounds?.maxX ?? 400
  const safeMinY = bounds?.minY ?? -300
  const safeMaxY = bounds?.maxY ?? 300

  // حساب العرض والارتفاع الكلي الفعلي للـ Canvas بناءً على حركة القطع
  const canvasWidth = safeMaxX - safeMinX
  const canvasHeight = safeMaxY - safeMinY

  // دالة لمطابقة إحداثيات المحرك إلى نظام شبكة الـ DOM الفعلي داخل الكانفاس الممتد
  const getCanvasCoords = (x: number, y: number) => {
    return {
      left: `${x - safeMinX}px`,
      top: `${y - safeMinY}px`,
    }
  }

  return (
    /* تم تغيير h-[550px] إلى h-full ليتمدد حسب مساحة الشاشة المتاحة */
    <div className="w-full h-full min-h-[300px] overflow-auto bg-[#133b2f] rounded-xl shadow-2xl p-6 relative border-4 border-[#0b241d]">

      {/* الكانفاس الداخلي الديناميكي المتمدد هندسياً */}
      <div 
        className="relative bg-[#1b4d3e] rounded-lg shadow-inner transition-all duration-300 pattern-grid"
        style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
      >

        {/* تصيير قطع الدومينو */}
        {board.map((tile) => {
          const isHorizontal = tile.rotation === 90 || tile.rotation === 270
          const currentWidth = isHorizontal ? 72 : 36
          const currentHeight = isHorizontal ? 36 : 72
          const coords = getCanvasCoords(tile.x, tile.y)

          return (
            <div
              key={tile.id}
              className="absolute transition-all duration-300 ease-out flex items-center justify-center"
              style={{
                left: coords.left,
                top: coords.top,
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                transform: 'translate(-50%, -50%)', // تمركز المركز المطلق بدقة متناهية
              }}
            >
              {/* غلاف الدوران الصافي لمنع انزياح البنية الداخلية */}
              <div 
                className="w-[36px] h-[72px] bg-[#f5f0e6] border-2 border-[#8b7355] rounded-md flex flex-col overflow-hidden shadow-md origin-center"
                style={{ transform: `rotate(${tile.rotation || 0}deg)` }}
              >
                <div className="flex-1 flex items-center justify-center relative border-b border-[#8b7355]/30">
                  <Dots count={tile.top} />
                </div>
                <div className="flex-1 flex items-center justify-center relative">
                  <Dots count={tile.bottom} />
                </div>
              </div>
            </div>
          )
        })}

        {/* نقاط الإسقاط المضيئة التفاعلية (Drop Zones) عند تحديد قطعة معينة في يد اللاعب */}
        {selectedTileIndex !== null && onPlayTile && (
          <>
            {/* منطقة إسقاط الجانب الأيسر */}
            <div
              className="absolute w-12 h-12 bg-yellow-400/30 border-2 border-dashed border-yellow-400 rounded-full animate-ping cursor-pointer flex items-center justify-center"
              style={{
                ...getCanvasCoords(leftHead.x, leftHead.y),
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onPlayTile(selectedTileIndex, 'left')}
              title="العب في الطرف الأيسر"
            />

            {/* منطقة إسقاط الجانب الأيمن */}
            <div
              className="absolute w-12 h-12 bg-cyan-400/30 border-2 border-dashed border-cyan-400 rounded-full animate-ping cursor-pointer flex items-center justify-center"
              style={{
                ...getCanvasCoords(rightHead.x, rightHead.y),
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onPlayTile(selectedTileIndex, 'right')}
              title="العب في الطرف الأيمن"
            />
          </>
        )}

      </div>
    </div>
  )
}

function Dots({ count }: { count: number }) {
  const positions: Record<number, string[]> = {
    0: [], 1: ['c'], 2: ['tl','br'], 3: ['tl','c','br'],
    4: ['tl','tr','bl','br'], 5: ['tl','tr','c','bl','br'],
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
    <div className="relative w-full h-full p-1">
      {(positions[count] || []).map((p, i) => (
        <div key={i} className="absolute w-[20%] h-[20%] bg-[#1a1a2e] rounded-full" style={posMap[p]} />
      ))}
    </div>
  )
}