import { BoardTile } from '@/types/game'

interface Props {
  board: BoardTile[]
}

// Grid cell size (tile height + small gap)
const CELL = 64  // px
const TILE_W = 60  // vertical tile width
const TILE_H = 120 // vertical tile height
const H_TILE_W = 120 // horizontal tile width
const H_TILE_H = 60  // horizontal tile height

export default function SnakeBoard({ board }: Props) {
  if (board.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/50 text-lg">ابدأ اللعب بأي قطعة</div>
      </div>
    )
  }

  // Calculate bounds to center the board
  const rows = board.map(t => t.row)
  const cols = board.map(t => t.col)
  const minRow = Math.min(...rows)
  const maxRow = Math.max(...rows)
  const minCol = Math.min(...cols)
  const maxCol = Math.max(...cols)

  const totalRows = maxRow - minRow + 1
  const totalCols = maxCol - minCol + 1

  const containerWidth = totalCols * CELL
  const containerHeight = totalRows * CELL

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        className="relative"
        style={{
          width: Math.max(containerWidth, CELL),
          height: Math.max(containerHeight, CELL),
        }}
      >
        {board.map((tile, index) => {
          // Determine if tile is horizontal based on rotation
          const isHorizontal = tile.rotation === 90 || tile.rotation === 270

          // Calculate position within the grid
          const x = (tile.col - minCol) * CELL + (CELL - (isHorizontal ? H_TILE_W : TILE_W)) / 2
          const y = (tile.row - minRow) * CELL + (CELL - (isHorizontal ? H_TILE_H : TILE_H)) / 2

          return (
            <div
              key={tile.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                width: isHorizontal ? H_TILE_W : TILE_W,
                height: isHorizontal ? H_TILE_H : TILE_H,
                transform: `rotate(${tile.rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: index,
                transition: 'all 0.3s ease',
              }}
            >
              <div className="w-full h-full bg-[#f5f0e6] border-2 border-[#8b7355] rounded-lg flex flex-col overflow-hidden shadow-lg">
                <div className="flex-1 flex items-center justify-center border-b border-[#8b7355]/40">
                  <Dots count={tile.top} />
                </div>
                <div className="flex-1 flex items-center justify-center">
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
    0: [], 1: ['c'], 2: ['tl','br'], 3: ['tl','c','br'],
    4: ['tl','tr','bl','br'], 5: ['tl','tr','c','bl','br'],
    6: ['tl','tr','ml','mr','bl','br']
  }

  const map: Record<string, React.CSSProperties> = {
    'tl': {top:'15%',left:'15%'}, 'tr': {top:'15%',right:'15%'},
    'ml': {top:'50%',left:'15%',transform:'translateY(-50%)'},
    'mr': {top:'50%',right:'15%',transform:'translateY(-50%)'},
    'c': {top:'50%',left:'50%',transform:'translate(-50%,-50%)'},
    'bl': {bottom:'15%',left:'15%'}, 'br': {bottom:'15%',right:'15%'},
  }

  return (
    <div className="relative w-full h-full">
      {(positions[count]||[]).map((p,i) => (
        <div 
          key={i} 
          className="absolute w-[16%] h-[16%] bg-[#1a1a2e] rounded-full"
          style={map[p]} 
        />
      ))}
    </div>
  )
}