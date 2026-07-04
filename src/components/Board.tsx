import { DominoTile } from '@/types/game'

interface Props {
  board: DominoTile[]
}

export default function Board({ board }: Props) {
  if (board.length === 0) {
    return <div className="text-white/50 text-lg">ابدأ اللعب بأي قطعة</div>
  }

  return (
    <div className="board-vertical">
      {board.map((tile, index) => (
        <div key={tile.id} className="domino-tile-vertical">
          <div className="half"><Dots count={tile.top} /></div>
          <div className="divider" />
          <div className="half"><Dots count={tile.bottom} /></div>
        </div>
      ))}
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
    'tl': {top:'20%',left:'20%'}, 'tr': {top:'20%',right:'20%'},
    'ml': {top:'50%',left:'20%',transform:'translateY(-50%)'},
    'mr': {top:'50%',right:'20%',transform:'translateY(-50%)'},
    'c': {top:'50%',left:'50%',transform:'translate(-50%,-50%)'},
    'bl': {bottom:'20%',left:'20%'}, 'br': {bottom:'20%',right:'20%'},
  }
  return (
    <div className="relative w-full h-full">
      {(positions[count]||[]).map((p,i) => (
        <div key={i} className="dot" style={map[p]} />
      ))}
    </div>
  )
}
