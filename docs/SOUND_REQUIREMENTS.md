# 🎵 Domino Game - Sound Effects Requirements

## 📁 Directory Structure
```
public/assets/sounds/
├── tile_place.mp3      (وضع القطعة)
├── tile_draw.mp3       (سحب القطعة)
├── win.mp3             (الفوز)
├── lose.mp3            (الخسارة)
├── click.mp3           (ضغط الزر)
├── invalid.mp3         (حركة خاطئة)
├── match_start.mp3     (بداية المباراة)
├── timer_warning.mp3   (تحذير الوقت)
├── achievement.mp3     (إنجاز جديد)
├── score.mp3           (جمع النقاط)
├── bgm_menu.mp3        (موسيقى القائمة)
└── bgm_game.mp3        (موسيقى اللعب)
```

---

## 🔊 Sound Effects (SFX)

### 1. tile_place.mp3 - وضع القطعة
- **Trigger:** When player places a domino tile on the board
- **Description:** Short wooden "clack" or "tap" sound
- **Duration:** 0.1 - 0.2 seconds
- **Volume:** 60% (0.6)
- **Example:** Two wooden domino pieces tapping together on a wooden table
- **Style:** Realistic, subtle, satisfying
- **Sources:**
  - freesound.org: search "domino place", "wood tap", "tile place"
  - mixkit.co: "game click" or "wood click"

### 2. tile_draw.mp3 - سحب القطعة
- **Trigger:** When player draws a tile from the stock/boneyard
- **Description:** Shuffling or sliding sound
- **Duration:** 0.3 - 0.5 seconds
- **Volume:** 50% (0.5)
- **Example:** Domino tiles sliding against each other in a pile
- **Style:** Light, quick shuffle
- **Sources:**
  - freesound.org: search "shuffle", "draw card", "tile slide"

### 3. win.mp3 - الفوز
- **Trigger:** When player wins the match/round
- **Description:** Victory fanfare - ascending musical notes
- **Duration:** 0.8 - 1.2 seconds
- **Volume:** 80% (0.8)
- **Example:** C5 → E5 → G5 → C6 (bright, cheerful)
- **Style:** Celebratory, Arabic/mediterranean feel optional
- **Sources:**
  - freesound.org: search "victory", "win", "success"
  - mixkit.co: "game win" or "success"

### 4. lose.mp3 - الخسارة
- **Trigger:** When player loses the match/round
- **Description:** Sad, descending notes
- **Duration:** 0.8 - 1.2 seconds
- **Volume:** 70% (0.7)
- **Example:** Low pitched "wah-wah" or sad trombone
- **Style:** Disappointing but not harsh
- **Sources:**
  - freesound.org: search "lose", "fail", "sad"
  - mixkit.co: "game over" or "lose"

### 5. click.mp3 - ضغط الزر
- **Trigger:** When pressing any UI button
- **Description:** Short, crisp click
- **Duration:** 0.05 - 0.1 seconds
- **Volume:** 40% (0.4)
- **Example:** Soft mechanical button "tick" or "pop"
- **Style:** Minimal, clean, responsive
- **Sources:**
  - freesound.org: search "UI click", "button click", "tap"
  - mixkit.co: "interface click"

### 6. invalid.mp3 - حركة خاطئة
- **Trigger:** When player tries invalid move
- **Description:** Error buzz or dull thud
- **Duration:** 0.2 - 0.3 seconds
- **Volume:** 50% (0.5)
- **Example:** "Bzzzt" or dull wooden "thud" or "bonk"
- **Style:** Clear feedback without being annoying
- **Sources:**
  - freesound.org: search "error", "invalid", "buzz", "wrong"
  - mixkit.co: "error" or "wrong"

### 7. match_start.mp3 - بداية المباراة
- **Trigger:** When match/round begins
- **Description:** Short fanfare or bell chime
- **Duration:** 0.5 - 0.8 seconds
- **Volume:** 70% (0.7)
- **Example:** "Ding-ding" or short trumpet fanfare
- **Style:** Exciting, game-starting feel
- **Sources:**
  - freesound.org: search "start", "fanfare", "bell"
  - mixkit.co: "game start"

### 8. timer_warning.mp3 - تحذير الوقت
- **Trigger:** When timer is running low (last 10 seconds)
- **Description:** Rapid beeping or ticking
- **Duration:** 0.5 - 0.8 seconds (loopable)
- **Volume:** 60% (0.6)
- **Example:** Clock ticking faster, urgency beeps (3-4 beeps)
- **Style:** Urgent but not panic-inducing
- **Sources:**
  - freesound.org: search "timer", "tick", "beep", "countdown"
  - mixkit.co: "timer" or "countdown"

### 9. achievement.mp3 - إنجاز جديد
- **Trigger:** When achievement is unlocked
- **Description:** Magical sparkle, success flourish
- **Duration:** 1.0 - 1.5 seconds
- **Volume:** 80% (0.8)
- **Example:** Coin collection sound, magical chime, sparkle
- **Style:** Rewarding, special, celebratory
- **Sources:**
  - freesound.org: search "achievement", "unlock", "sparkle", "magic"
  - mixkit.co: "achievement" or "level up"

### 10. score.mp3 - جمع النقاط
- **Trigger:** When points are scored
- **Description:** Coin/point collection sound
- **Duration:** 0.2 - 0.4 seconds
- **Volume:** 50% (0.5)
- **Example:** Coin "ding", score counter tick, small chime
- **Style:** Quick, satisfying feedback
- **Sources:**
  - freesound.org: search "coin", "score", "point", "ding"
  - mixkit.co: "coin" or "score"

---

## 🎵 Background Music (BGM)

### 11. bgm_menu.mp3 - موسيقى القائمة
- **Trigger:** Plays continuously in main menu and all screens except game
- **Description:** Calm, relaxing background music
- **Duration:** 30-60 seconds (must be **seamlessly loopable**)
- **Volume:** 30% (0.3)
- **BPM:** 80-100
- **Style:** Acoustic guitar, soft piano, oud (عود), or light percussion
- **Mood:** Relaxed, inviting, Arabic/mediterranean atmosphere
- **Loop Point:** Must loop without noticeable gap or change
- **Sources:**
  - freesound.org: search "background music", "menu music", "ambient"
  - mixkit.co: "background music" (filter by mood: calm, relaxing)
  - Epidemic Sound (paid): "Middle Eastern", "Acoustic", "Calm"
  - AI Generation: Suno.ai, Udio.com (prompt: "calm arabic acoustic guitar background music, loopable, 80 bpm")

### 12. bgm_game.mp3 - موسيقى اللعب
- **Trigger:** Plays continuously during gameplay
- **Description:** Focused, slightly upbeat but not distracting
- **Duration:** 30-60 seconds (must be **seamlessly loopable**)
- **Volume:** 30% (0.3)
- **BPM:** 100-120
- **Style:** Light percussion, subtle melody, rhythmic
- **Mood:** Focused, engaging, slightly tense but enjoyable
- **Loop Point:** Must loop without noticeable gap or change
- **Sources:**
  - freesound.org: search "game music", "background music", "playful"
  - mixkit.co: "game background music"
  - Epidemic Sound (paid): "Playful", "Game", "Light"
  - AI Generation: Suno.ai, Udio.com (prompt: "light arabic percussion game background music, focused, loopable, 100 bpm")

---

## 🔧 Technical Specifications

| Property | Requirement |
|----------|-------------|
| **Format** | MP3 |
| **Bitrate** | 128 kbps (minimum) |
| **Sample Rate** | 44.1 kHz (CD quality) |
| **Channels** | Stereo (2.0) or Mono |
| **Normalization** | All SFX at similar perceived loudness (use LUFS -16) |
| **Silence Padding** | No leading/trailing silence (clean cuts) |
| **Looping** | BGM must have seamless loop points |
| **Total Size** | Estimated 2-5 MB for all files |

---

## 📥 Recommended Free Sources

### 1. Freesound.org (CC0 / Creative Commons)
- **Pros:** Completely free, huge library, community-driven
- **Cons:** Quality varies, need to check licenses
- **Search Terms:** 
  - "domino", "wood", "tile", "place", "click"
  - "victory", "win", "success", "fanfare"
  - "shuffle", "draw", "card", "slide"
  - "error", "buzz", "wrong", "invalid"
  - "UI", "button", "click", "tap"
  - "timer", "tick", "beep", "countdown"
  - "achievement", "unlock", "coin", "score"
  - "background music", "menu", "ambient", "arabic"

### 2. Mixkit.co (Free, no attribution)
- **Pros:** Curated, high quality, no attribution needed
- **Cons:** Smaller library, less variety
- **URL:** https://mixkit.co/free-sound-effects/
- **URL:** https://mixkit.co/free-stock-music/

### 3. Zapsplat.com (Free with account)
- **Pros:** Professional quality, game-focused
- **Cons:** Requires free account
- **URL:** https://www.zapsplat.com/

### 4. Pixabay.com (Free)
- **Pros:** Music + SFX, good quality
- **Cons:** Less game-specific
- **URL:** https://pixabay.com/sound-effects/
- **URL:** https://pixabay.com/music/

---

## 🤖 AI Generation (Alternative)

### Suno.ai
- **URL:** https://suno.ai
- **Pros:** Generate custom music with text prompts
- **Cons:** Free tier limited, may need editing for loops
- **BGM Menu Prompt:** "Calm arabic acoustic guitar background music, relaxing, 80 bpm, instrumental, loopable, no vocals"
- **BGM Game Prompt:** "Light arabic percussion game background music, focused, 100 bpm, instrumental, loopable, no vocals"

### Udio.com
- **URL:** https://udio.com
- **Pros:** High quality AI music generation
- **Cons:** Paid for commercial use
- **Similar prompts as Suno**

### ElevenLabs Sound Effects (New!)
- **URL:** https://elevenlabs.io
- **Pros:** Generate SFX from text descriptions
- **Cons:** Paid, but very realistic
- **Example Prompt:** "Wooden domino tile placed on wooden table, short clack sound"

---

## ✅ Checklist Before Integration

- [ ] All 12 files downloaded/generated
- [ ] Files placed in `public/assets/sounds/`
- [ ] All files are MP3 format
- [ ] All files are 128kbps+ quality
- [ ] BGM files loop seamlessly (test in audio editor)
- [ ] No silence padding at start/end of SFX
- [ ] Volume levels feel balanced when played together
- [ ] Test on actual Android device (Capacitor)
- [ ] Test with headphones and phone speakers
- [ ] Ensure no copyright issues (use CC0 or licensed)

---

## 🎮 Integration Code

The updated `soundEngine.ts` is ready. Just place the MP3 files in the correct directory and the code will automatically load and play them.

```typescript
// Example usage in components:
import { soundEngine } from '@/lib/soundEngine'

// On button press
soundEngine.playClick()

// On tile placement
soundEngine.playTilePlace()

// On win
soundEngine.playWin()

// Start menu music
soundEngine.startMusic('menu')

// Start game music
soundEngine.startMusic('game')

// Stop music
soundEngine.stopMusic()
```
