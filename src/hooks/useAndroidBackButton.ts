import { App } from '@capacitor/app'
import { useEffect, useCallback, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

/**
 * Android Back Button Handler
 * Prevents app from closing when pressing back button
 * Instead, navigates back to previous screen or shows exit confirmation
 */

export function useAndroidBackButton() {
  const { screen, setScreen } = useGameStore()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Define screen hierarchy for back navigation
  const screenHierarchy: Record<string, string> = {
    'menu': 'title',
    'levelSelect': 'menu',
    'game': 'menu',  // Will show exit confirmation instead
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
      return true // Handled
    }

    // If showing exit confirmation, close it
    if (showExitConfirm) {
      setShowExitConfirm(false)
      return true // Handled
    }

    // Navigate to previous screen
    const previousScreen = screenHierarchy[screen]
    if (previousScreen) {
      setScreen(previousScreen as any)
      return true // Handled
    }

    // If at title screen, let the default behavior (exit app)
    if (screen === 'title') {
      return false // Not handled, will exit app
    }

    return false
  }, [screen, showExitConfirm, setScreen])

  useEffect(() => {
    // Register back button listener
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const handled = handleBackButton()

      if (!handled) {
        // If not handled, check if we can go back in browser history
        if (canGoBack) {
          window.history.back()
        } else {
          // Show exit confirmation for title screen
          if (screen === 'title') {
            setShowExitConfirm(true)
          }
        }
      }
    })

    return () => {
      listener.then(l => l.remove())
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
