import { useEffect, useCallback, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

/**
 * Android Back Button Handler
 * Uses browser events only - no external dependencies
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
      return true
    }

    if (showExitConfirm) {
      setShowExitConfirm(false)
      return true
    }

    const previousScreen = screenHierarchy[screen]
    if (previousScreen) {
      setScreen(previousScreen as any)
      return true
    }

    if (screen === 'title') {
      return false
    }

    return false
  }, [screen, showExitConfirm, setScreen])

  useEffect(() => {
    // Use browser popstate for back button
    const handlePopState = () => {
      handleBackButton()
    }
    
    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
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
