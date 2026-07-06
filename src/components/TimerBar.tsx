import { useEffect, useRef, useState } from 'react'

interface TimerBarProps {
  duration: number // seconds
  onTimeUp: () => void
  isActive: boolean
  key?: number | string // Force re-mount when key changes
}

export default function TimerBar({ duration, onTimeUp, isActive }: TimerBarProps) {
  const [progress, setProgress] = useState(100)
  const [warning, setWarning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationRef = useRef(duration)
  const onTimeUpRef = useRef(onTimeUp)
  const isActiveRef = useRef(isActive)

  // Keep refs in sync
  useEffect(() => {
    durationRef.current = duration
    onTimeUpRef.current = onTimeUp
    isActiveRef.current = isActive
  })

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isActive || duration <= 0) {
      setProgress(100)
      setWarning(false)
      return
    }

    startTimeRef.current = Date.now()
    setProgress(100)
    setWarning(false)

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, durationRef.current - elapsed)
      const pct = (remaining / durationRef.current) * 100

      setProgress(pct)

      if (pct <= 30 && !warning) {
        setWarning(true)
      }

      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        // Call onTimeUp only if still active
        if (isActiveRef.current) {
          onTimeUpRef.current()
        }
      }
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, duration]) // Re-run when isActive or duration changes

  if (!isActive || duration <= 0) return null

  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-100 rounded-full ${
          warning ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}