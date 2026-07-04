import { DominoTile as TileType } from '@/types/game'

interface Props {
  tile: TileType
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function DominoTile({ tile, selected, onClick, disabled, size = 'md' }: Props) {
  const sizes = { sm: 'w-10 h-20', md: 'w-[60px] h-[120px]', lg: 'w-20 h-40' }

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`domino-tile ${sizes[size]} ${selected ? 'selected' : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="half"><Dots count={tile.top} /></div>
      <div className="divider" />
      <div className="half"><Dots count={tile.bottom} /></div>
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
    'tl': {top:6,left:6}, 'tr': {top:6,right:6},
    'ml': {top:'50%',left:6,transform:'translateY(-50%)'},
    'mr': {top:'50%',right:6,transform:'translateY(-50%)'},
    'c': {top:'50%',left:'50%',transform:'translate(-50%,-50%)'},
    'bl': {bottom:6,left:6}, 'br': {bottom:6,right:6},
  }
  return (
    <div className="relative w-full h-full">
      {(positions[count]||[]).map((p,i) => (
        <div key={i} className="dot" style={map[p]} />
      ))}
    </div>
  )
}