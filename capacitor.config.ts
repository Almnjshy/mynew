import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.almnjshy.domino',
  appName: 'Domino',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: {
    buildOptions: {
      minSdkVersion: 26,
      targetSdkVersion: 34,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
  },
}

export default config