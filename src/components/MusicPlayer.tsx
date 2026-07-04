import { useEffect } from 'react'
import { soundEngine } from '@/lib/soundEngine'
import { useGameStore } from '@/store/gameStore'

export default function MusicPlayer() {
  const { settings } = useGameStore()

  useEffect(() => {
    // Start music when component mounts and music is enabled
    if (settings.musicEnabled) {
      soundEngine.setMusicEnabled(true)
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        soundEngine.stopMusic()
      } else if (settings.musicEnabled) {
        soundEngine.setMusicEnabled(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      soundEngine.stopMusic()
    }
  }, [settings.musicEnabled])

  // Update sound engine when settings change
  useEffect(() => {
    soundEngine.setSoundEnabled(settings.soundEnabled)
    soundEngine.setMusicEnabled(settings.musicEnabled)
  }, [settings.soundEnabled, settings.musicEnabled])

  return null // This is a logic-only component
}