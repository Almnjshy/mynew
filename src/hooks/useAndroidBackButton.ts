import { useEffect, useCallback, useState } from 'react'
import { App } from '@capacitor/app'
import { useGameStore } from '@/store/gameStore'

/**
 * Android Back Button Handler
 * Uses Capacitor App plugin for native back button
 * Falls back to browser events for web
 */

export function useAndroidBackButton() {
  const { screen, popScreen, goBack, setScreen } = useGameStore()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // FIXED: Added tournament screens
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
    // NEW: Tournament screens
    'tournamentMenu': 'menu',
    'tournamentCreate': 'tournamentMenu',
    'tournamentBracket': 'tournamentMenu',
    'tournamentGame': 'tournamentBracket',
    'tournamentHistory': 'tournamentMenu',
  }

  const handleBackButton = useCallback(() => {
    // If showing exit confirmation, just hide it
    if (showExitConfirm) {
      setShowExitConfirm(false)
      return true
    }

    // In game: show exit confirmation
    if (screen === 'game') {
      setShowExitConfirm(true)
      return true // Prevent default back
    }

    // FIXED: Use popScreen first (proper history management)
    const popped = popScreen()
    if (popped) {
      return true
    }

    // Fallback to hierarchy if popScreen fails
    const previousScreen = screenHierarchy[screen]
    if (previousScreen) {
      setScreen(previousScreen as any)
      return true
    }

    // On title screen: allow app to close
    if (screen === 'title') {
      return false
    }

    return false
  // FIXED: Removed showExitConfirm from dependencies (causes stale closure)
  }, [screen, popScreen, goBack, setScreen])

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
      // FIXED: Better fallback for web
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault()
          handleBackButton()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      cleanup = () => {
        window.removeEventListener('keydown', handleKeyDown)
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
