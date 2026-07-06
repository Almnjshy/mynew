import { Capacitor } from '@capacitor/core'

/**
 * Get the correct asset path that works in both web and Capacitor
 * In Capacitor, assets from public/ are served from the app bundle
 */
export function getAssetPath(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  // In Capacitor, use relative paths
  if (Capacitor.isNativePlatform()) {
    return `./${cleanPath}`
  }

  // In web dev, use absolute paths
  return `/${cleanPath}`
}

/**
 * Get avatar path with fallback
 */
export function getAvatarPath(avatarName: string): string {
  return getAssetPath(`assets/${avatarName}`)
}

/**
 * Get sound path
 */
export function getSoundPath(soundName: string): string {
  return getAssetPath(`assets/sounds/${soundName}`)
}

/**
 * Get background image path
 */
export function getBackgroundPath(bgName: string): string {
  return getAssetPath(`assets/${bgName}`)
}
