/**
 * Sound Engine using Web Audio API
 * Generates sounds programmatically - no external files needed
 */

class SoundEngine {
  private audioContext: AudioContext | null = null
  private musicOscillator: OscillatorNode | null = null
  private musicGain: GainNode | null = null
  private isMusicPlaying = false
  private soundEnabled = true
  private musicEnabled = true
  private musicInterval: number | null = null

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  /**
   * Play a tile placement sound (wooden click)
   */
  playTilePlace() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1)

      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play a draw sound (shuffling cards)
   */
  playDraw() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const bufferSize = ctx.sampleRate * 0.2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2000

      const gain = ctx.createGain()
      gain.gain.value = 0.2

      source.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      source.start()
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play win sound (victory chime)
   */
  playWin() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15)
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + i * 0.15 + 0.3)
      })
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play loss sound (sad tone)
   */
  playLoss() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const notes = [400, 350, 300, 250]

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.3)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime + i * 0.2)
        osc.stop(ctx.currentTime + i * 0.2 + 0.3)
      })
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play invalid move sound (buzzer)
   */
  playInvalid() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.value = 150

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play achievement unlock sound
   */
  playAchievement() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.1 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.2)
      })
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play timer warning sound
   */
  playTimerWarning() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 800

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Play button click sound
   */
  playClick() {
    if (!this.soundEnabled) return
    try {
      const ctx = this.getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 1200

      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.05)
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  /**
   * Start background music (ambient)
   */
  startMusic() {
    if (!this.musicEnabled || this.isMusicPlaying) return
    try {
      const ctx = this.getContext()

      // Create a simple ambient drone
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.value = 220 // A3

      osc2.type = 'triangle'
      osc2.frequency.value = 330 // E4

      gain.gain.value = 0.05 // Very quiet

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start()
      osc2.start()

      this.musicOscillator = osc1
      this.musicGain = gain
      this.isMusicPlaying = true

      // Add subtle variation
      let step = 0
      this.musicInterval = window.setInterval(() => {
        if (!this.musicEnabled) return
        step++
        const baseFreq = 220 + Math.sin(step * 0.1) * 10
        osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime)
        osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime)
      }, 100)
    } catch (e) {
      console.error('Music error:', e)
    }
  }

  /**
   * Stop background music
   */
  stopMusic() {
    if (this.musicOscillator) {
      try {
        this.musicOscillator.stop()
      } catch (e) {}
      this.musicOscillator = null
    }
    if (this.musicInterval) {
      clearInterval(this.musicInterval)
      this.musicInterval = null
    }
    this.isMusicPlaying = false
  }

  /**
   * Set sound enabled state
   */
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled
  }

  /**
   * Set music enabled state
   */
  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled
    if (enabled) {
      this.startMusic()
    } else {
      this.stopMusic()
    }
  }

  /**
   * Resume audio context (needed for browsers that suspend it)
   */
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }
}

export const soundEngine = new SoundEngine()
