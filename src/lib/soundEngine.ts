import { Preferences } from '@capacitor/preferences'

/**
 * Sound Engine using HTML5 Audio with MP3 files
 * All sounds loaded from /assets/sounds/ directory
 */

class SoundEngine {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private bgm: HTMLAudioElement | null = null
  private soundEnabled = true
  private musicEnabled = true
  private currentBgm: string | null = null

  // Sound file paths
  private readonly SOUND_PATHS: Record<string, string> = {
    tilePlace: '/assets/sounds/tile_place.mp3',
    draw: '/assets/sounds/tile_draw.mp3',
    win: '/assets/sounds/win.mp3',
    lose: '/assets/sounds/lose.mp3',
    click: '/assets/sounds/click.mp3',
    invalid: '/assets/sounds/invalid.mp3',
    matchStart: '/assets/sounds/match_start.mp3',
    timerWarning: '/assets/sounds/timer_warning.mp3',
    achievement: '/assets/sounds/achievement.mp3',
    score: '/assets/sounds/score.mp3',
    bgmMenu: '/assets/sounds/bgm_menu.mp3',
    bgmGame: '/assets/sounds/bgm_game.mp3',
  }

  constructor() {
    this.loadSettings()
  }

  private async loadSettings() {
    try {
      const { value } = await Preferences.get({ key: 'domino_settings' })
      if (value) {
        const settings = JSON.parse(value)
        this.soundEnabled = settings.soundEnabled ?? true
        this.musicEnabled = settings.musicEnabled ?? true
      }
    } catch {
      // Use defaults
    }
  }

  private getAudio(path: string): HTMLAudioElement {
    if (!this.sounds.has(path)) {
      const audio = new Audio(path)
      audio.preload = 'auto'
      this.sounds.set(path, audio)
    }
    return this.sounds.get(path)!
  }

  /**
   * Play a sound effect (one-shot)
   */
  private playSound(soundName: string, volume = 1.0) {
    if (!this.soundEnabled) return
    try {
      const path = this.SOUND_PATHS[soundName]
      if (!path) return

      const audio = this.getAudio(path)
      audio.currentTime = 0
      audio.volume = volume
      audio.play().catch(() => {
        // Audio play failed (browser policy)
      })
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play tile placement sound (wooden click)
   */
  playTilePlace() {
    this.playSound('tilePlace', 0.6)
  }

  /**
   * Play draw sound (shuffling)
   */
  playDraw() {
    this.playSound('draw', 0.5)
  }

  /**
   * Play win sound (victory chime)
   */
  playWin() {
    this.playSound('win', 0.8)
  }

  /**
   * Play lose sound
   */
  playLose() {
    this.playSound('lose', 0.7)
  }

  /**
   * Play UI click sound
   */
  playClick() {
    this.playSound('click', 0.4)
  }

  /**
   * Play invalid move sound
   */
  playInvalid() {
    this.playSound('invalid', 0.5)
  }

  /**
   * Play match start sound
   */
  playMatchStart() {
    this.playSound('matchStart', 0.7)
  }

  /**
   * Play timer warning sound
   */
  playTimerWarning() {
    this.playSound('timerWarning', 0.6)
  }

  /**
   * Play achievement unlocked sound
   */
  playAchievement() {
    this.playSound('achievement', 0.8)
  }

  /**
   * Play score sound
   */
  playScore() {
    this.playSound('score', 0.5)
  }

  /**
   * Start background music (loop)
   */
  startMusic(musicName: 'menu' | 'game') {
    if (!this.musicEnabled) return

    const path = musicName === 'menu' ? this.SOUND_PATHS.bgmMenu : this.SOUND_PATHS.bgmGame
    if (!path) return

    // Stop current music
    this.stopMusic()

    this.currentBgm = path
    this.bgm = new Audio(path)
    this.bgm.loop = true
    this.bgm.volume = 0.3
    this.bgm.play().catch(() => {
      // Audio play failed
    })
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.currentTime = 0
      this.bgm = null
    }
    this.currentBgm = null
  }

  /**
   * Pause background music
   */
  pauseMusic() {
    if (this.bgm) {
      this.bgm.pause()
    }
  }

  /**
   * Resume background music
   */
  resumeMusic() {
    if (this.bgm && this.musicEnabled) {
      this.bgm.play().catch(() => {})
    }
  }

  /**
   * Set sound enabled/disabled
   */
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled
  }

  /**
   * Set music enabled/disabled
   */
  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled
    if (!enabled) {
      this.stopMusic()
    } else if (this.currentBgm) {
      this.resumeMusic()
    }
  }

  /**
   * Preload all sounds (call on app start)
   */
  preloadSounds() {
    Object.values(this.SOUND_PATHS).forEach((path) => {
      const audio = new Audio(path)
      audio.preload = 'auto'
      this.sounds.set(path, audio)
    })
  }
}

export const soundEngine = new SoundEngine()
