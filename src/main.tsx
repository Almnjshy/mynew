import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App'

// Initialize Capacitor bridge before React mounts
async function initApp() {
  try {
    // Check if running on native platform
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      // Initialize Preferences (needed for gameStore persist)
      // Preferences auto-initializes, but we ensure it's ready

      // Hide splash screen after a brief delay
      setTimeout(() => {
        SplashScreen.hide({ fadeOutDuration: 500 }).catch(() => {
          // Ignore splash screen errors
        })
      }, 1500)
    }
  } catch (error) {
    console.warn('Capacitor initialization warning:', error)
    // Continue anyway - app should work even without native features
  }

  // Mount React app
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initApp()
