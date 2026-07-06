import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { soundEngine } from '@/lib/soundEngine'

export default function TitleScreen() {
  const { setScreen } = useGameStore()

  useEffect(() => {
    // Play a subtle sound on title screen load
    soundEngine.playClick()

    // Auto-navigate to menu after 3 seconds
    const timer = setTimeout(() => {
      setScreen('menu')
    }, 3000)

    return () => clearTimeout(timer)
  }, [setScreen])

  return (
    <div className="screen-container title-bg">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <img src="./assets/trophy.png" alt="Trophy" className="trophy-img" />
        <h1 className="text-5xl font-bold gold-accent drop-shadow-lg">DOMINO</h1>
        <p className="text-white/70 text-lg">Loading...</p>
      </div>
    </div>
  )
}