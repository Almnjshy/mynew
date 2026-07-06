import { Preferences } from '@capacitor/preferences'

/**
 * Sound Engine using HTML5 Audio with MP3 files
 * Falls back to Web Audio API oscillator tones when files are missing
 * All sounds loaded from /assets/sounds/ directory
 */

class SoundEngine {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private bgm: HTMLAudioElement | null = null
  private soundEnabled = true
  private musicEnabled = true
  private currentBgm: string | null = null
  private audioContext: AudioContext | null = null

  // Sound file paths
  private readonly SOUND_PATHS: Record<string, string> = {
    tilePlace: './assets/sounds/tile_place.mp3',
    draw: './assets/sounds/tile_draw.mp3',
    win: './assets/sounds/win.mp3',
    lose: './assets/sounds/lose.mp3',
    click: './assets/sounds/click.mp3',
    invalid: './assets/sounds/invalid.mp3',
    matchStart: './assets/sounds/match_start.mp3',
    timerWarning: './assets/sounds/timer_warning.mp3',
    achievement: './assets/sounds/achievement.mp3',
    score: './assets/sounds/score.mp3',
    bgmMenu: './assets/sounds/bgm_menu.mp3',
    bgmGame: './assets/sounds/bgm_game.mp3',
  }

  // Fallback oscillator frequencies for each sound
  private readonly FALLBACK_TONES: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
    tilePlace: { freq: 440, duration: 0.1, type: 'sine' },
    draw: { freq: 330, duration: 0.15, type: 'sine' },
    win: { freq: 523, duration: 0.5, type: 'triangle' },
    lose: { freq: 200, duration: 0.4, type: 'sawtooth' },
    click: { freq: 800, duration: 0.05, type: 'square' },
    invalid: { freq: 150, duration: 0.2, type: 'sawtooth' },
    matchStart: { freq: 659, duration: 0.3, type: 'triangle' },
    timerWarning: { freq: 1000, duration: 0.1, type: 'square' },
    achievement: { freq: 784, duration: 0.4, type: 'triangle' },
    score: { freq: 600, duration: 0.15, type: 'sine' },
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

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  private playFallbackTone(soundName: string) {
    if (!this.soundEnabled) return
    const tone = this.FALLBACK_TONES[soundName]
    if (!tone) return

    try {
      const ctx = this.getAudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.type = tone.type
      oscillator.frequency.setValueAtTime(tone.freq, ctx.currentTime)

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + tone.duration)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + tone.duration)
    } catch {
      // Audio context not available
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
        // File not found or autoplay blocked - use fallback tone
        this.playFallbackTone(soundName)
      })
    } catch {
      // Audio not available - try fallback
      this.playFallbackTone(soundName)
    }
  }

  // Public API
  playTilePlace() { this.playSound('tilePlace') }
  playDraw() { this.playSound('draw') }
  playWin() { this.playSound('win') }
  playLose() { this.playSound('lose') }
  playClick() { this.playSound('click') }
  playInvalid() { this.playSound('invalid') }
  playMatchStart() { this.playSound('matchStart') }
  playTimerWarning() { this.playSound('timerWarning') }
  playAchievement() { this.playSound('achievement') }
  playScore() { this.playSound('score') }

  /**
   * Play background music (looping)
   */
  playBGM(bgmName: 'bgmMenu' | 'bgmGame') {
    if (!this.musicEnabled) return
    if (this.currentBgm === bgmName && this.bgm) return

    this.stopBGM()

    try {
      const path = this.SOUND_PATHS[bgmName]
      if (!path) return

      const audio = new Audio(path)
      audio.loop = true
      audio.volume = 0.3
      this.bgm = audio
      this.currentBgm = bgmName
      audio.play().catch(() => {
        // BGM files not available - silently fail
        this.bgm = null
        this.currentBgm = null
      })
    } catch {
      // Audio not available
    }
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.currentTime = 0
      this.bgm = null
      this.currentBgm = null
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled
    if (!enabled) {
      this.stopBGM()
    } else if (this.currentBgm) {
      this.playBGM(this.currentBgm)
    }
  }

  getSettings() {
    return { soundEnabled: this.soundEnabled, musicEnabled: this.musicEnabled }
  }
}

export const soundEngine = new SoundEngine()
