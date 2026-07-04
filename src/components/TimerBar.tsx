import { useEffect, useState } from 'react'

interface TimerBarProps {
  timeLimit: number // in seconds
  isActive: boolean
  onTimeUp: () => void
  playerTurn: boolean
}

export default function TimerBar({ timeLimit, isActive, onTimeUp, playerTurn }: TimerBarProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [isWarning, setIsWarning] = useState(false)

  useEffect(() => {
    if (!isActive || timeLimit <= 0) {
      setTimeLeft(timeLimit)
      setIsWarning(false)
      return
    }

    setTimeLeft(timeLimit)
    setIsWarning(false)

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 0.1
        if (newTime <= timeLimit * 0.3) {
          setIsWarning(true)
        }
        if (newTime <= 0) {
          clearInterval(interval)
          onTimeUp()
          return 0
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isActive, timeLimit, onTimeUp])

  if (timeLimit <= 0 || !playerTurn) return null

  const percentage = (timeLeft / timeLimit) * 100
  const barColor = isWarning ? 'bg-red-500' : percentage > 50 ? 'bg-green-500' : 'bg-yellow-500'

  return (
    <div className="w-full px-4 py-1">
      <div className="flex items-center gap-2">
        <div className="text-white text-xs font-mono w-10 text-right">
          {Math.ceil(timeLeft)}ث
        </div>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-100 ${isWarning ? 'animate-pulse' : ''}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}