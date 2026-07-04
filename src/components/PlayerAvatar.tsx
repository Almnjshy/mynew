interface Props {
  name: string
  avatar: string
  isActive?: boolean
  score?: number
  tileCount?: number
}

export default function PlayerAvatar({ name, avatar, isActive, score, tileCount }: Props) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl ${isActive ? 'bg-yellow-500/20' : ''}`}>
      <img src={avatar} alt={name} className="avatar-img" />
      <div className="text-white">
        <div className="font-bold">{name}</div>
        <div className="text-sm opacity-70">
          {score !== undefined && `${score} نقطة`}
          {tileCount !== undefined && ` • ${tileCount} قطع`}
        </div>
      </div>
    </div>
  )
}