import { useEffect } from 'react'
import './App.css'
import { useGameStore } from './store/gameStore'
import { useAndroidBackButton } from './hooks/useAndroidBackButton'
import ErrorBoundary from './components/ErrorBoundary'
import ExitConfirmation from './components/ExitConfirmation'
import ScreenTransition from './components/ScreenTransition'
import TitleScreen from './screens/TitleScreen'
import MainMenu from './screens/MainMenu'
import LevelSelect from './screens/LevelSelect'
import GameScreen from './screens/GameScreen'
import MatchEndScreen from './screens/MatchEndScreen'
import SettingsScreen from './screens/SettingsScreen'
import StatisticsScreen from './screens/StatisticsScreen'
import AchievementsScreen from './screens/AchievementsScreen'
import HistoryScreen from './screens/HistoryScreen'
import ProfileScreen from './screens/ProfileScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import WifiGameScreen from './screens/WifiGameScreen'
import OnlineGameScreen from './screens/OnlineGameScreen'

function App() {
  const { screen } = useGameStore()

  // Initialize Android back button handler
  useAndroidBackButton()

  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener('touchmove', preventZoom, { passive: false })

    let lastTouch = 0
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouch < 300) e.preventDefault()
      lastTouch = now
    }
    document.addEventListener('touchend', preventDoubleTap, { passive: false })

    return () => {
      document.removeEventListener('touchmove', preventZoom)
      document.removeEventListener('touchend', preventDoubleTap)
    }
  }, [])

  // Render screen with transition
  const renderScreen = () => {
    switch (screen) {
      case 'title': return <TitleScreen />
      case 'menu': return <MainMenu />
      case 'levelSelect': return <LevelSelect />
      case 'game': return <GameScreen />
      case 'matchEnd': return <MatchEndScreen />
      case 'settings': return <SettingsScreen />
      case 'statistics': return <StatisticsScreen />
      case 'achievements': return <AchievementsScreen />
      case 'history': return <HistoryScreen />
      case 'profile': return <ProfileScreen />
      case 'leaderboard': return <LeaderboardScreen />
      case 'wifiGame': return <WifiGameScreen />
      case 'onlineGame': return <OnlineGameScreen />
      default: return <TitleScreen />
    }
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <ScreenTransition isVisible={true}>
          {renderScreen()}
        </ScreenTransition>
      </div>
      <ExitConfirmation />
    </ErrorBoundary>
  )
}

export default App
