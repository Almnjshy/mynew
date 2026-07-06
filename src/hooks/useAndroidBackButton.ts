import { useEffect, useCallback, useState } from 'react'
import { App } from '@capacitor/app'
import { useGameStore } from '@/store/gameStore'

/**
 * Android Back Button Handler
 * Uses Capacitor App plugin for native back button
 * Falls back to browser events for web
 */

export function useAndroidBackButton() {
  const { screen, setScreen } = useGameStore()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

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
    if (screen === 'game') {
      setShowExitConfirm(true)
      return true // Prevent default back
    }

    if (showExitConfirm) {
      setShowExitConfirm(false)
      return true
    }

    const previousScreen = screenHierarchy[screen]
    if (previousScreen) {
      setScreen(previousScreen as any)
      return true // Prevent default back
    }

    if (screen === 'title') {
      // Allow app to close on title screen
      return false
    }

    return false
  }, [screen, showExitConfirm, setScreen])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    // Try Capacitor App plugin first
    try {
      const listener = App.addListener('backButton', ({ canGoBack }) => {
        const handled = handleBackButton()
        if (!handled && !canGoBack) {
          App.exitApp()
        }
      })
      cleanup = () => {
        listener.then(l => l.remove())
      }
    } catch {
      // Fallback to browser events for web
      const handlePopState = () => {
        handleBackButton()
      }
      window.addEventListener('popstate', handlePopState)
      cleanup = () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }

    return cleanup
  }, [handleBackButton])

  return {
    showExitConfirm,
    setShowExitConfirm,
  }
}

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