import { useEffect, useCallback, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

/**
 * Android Back Button Handler
 * Uses standard browser events + Capacitor App plugin if available
 */

export function useAndroidBackButton() {
  const { screen, setScreen } = useGameStore()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Define screen hierarchy for back navigation
  const screenHierarchy: Record<string, string> = {
    'menu': 'title',
    'levelSelect': 'menu',
    'game': 'menu',
    'matchEnd': 'menu',
    'settings': 'menu',
    'statistics': 'menu',
    'achievements': 'menu',
    'history': 'menu',
    'profile': 'menu',
    'leaderboard': 'menu',
    'wifiGame': 'menu',
    'onlineGame': 'menu',
  }

  const handleBackButton = useCallback(() => {
    // If in game, show exit confirmation instead of going back
    if (screen === 'game') {
      setShowExitConfirm(true)
      return true
    }

    // If showing exit confirmation, close it
    if (showExitConfirm) {
      setShowExitConfirm(false)
      return true
    }

    // Navigate to previous screen
    const previousScreen = screenHierarchy[screen]
    if (previousScreen) {
      setScreen(previousScreen as any)
      return true
    }

    // If at title screen, let the default behavior (exit app)
    if (screen === 'title') {
      return false
    }

    return false
  }, [screen, showExitConfirm, setScreen])

  useEffect(() => {
    // Try to use Capacitor App plugin if available
    const setupBackButton = async () => {
      try {
        // Dynamic import to avoid build errors if not installed
        const { App } = await import('@capacitor/app')

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          const handled = handleBackButton()

          if (!handled) {
            if (canGoBack) {
              window.history.back()
            } else if (screen === 'title') {
              setShowExitConfirm(true)
            }
          }
        })

        return () => {
          listener.remove()
        }
      } catch (e) {
        // Fallback: use browser popstate for web
        const handlePopState = () => {
          handleBackButton()
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
      }
    }

    const cleanup = setupBackButton()

    return () => {
      cleanup.then(fn => fn?.())
    }
  }, [handleBackButton, screen])

  return {
    showExitConfirm,
    setShowExitConfirm,
  }
}

/**
 * Hook for exit confirmation in game screen
 */
export function useGameExitHandler() {
  const { setScreen } = useGameStore()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const handleExit = useCallback(() => {
    setShowExitConfirm(true)
  }, [])

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false)
    setScreen('menu')
  }, [setScreen])

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false)
  }, [])

  return {
    showExitConfirm,
    handleExit,
    confirmExit,
    cancelExit,
  }
}
