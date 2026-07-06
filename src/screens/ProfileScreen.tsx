import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, User, Camera, Check } from 'lucide-react'

const AVATAR_OPTIONS = [
  './assets/avatar_player.png',
  './assets/avatar_ai.png',
  './assets/avatar_1.png',
  './assets/avatar_2.png',
  './assets/avatar_3.png',
  './assets/avatar_4.png',
  './assets/avatar_5.png',
  './assets/avatar_6.png',
]

// Fallback avatars using initials - mapped to player name
const FALLBACK_AVATARS = [
  { color: '#e74c3c', initial: 'أ' },
  { color: '#3498db', initial: 'ب' },
  { color: '#2ecc71', initial: 'ج' },
  { color: '#f39c12', initial: 'د' },
  { color: '#9b59b6', initial: 'هـ' },
  { color: '#1abc9c', initial: 'و' },
  { color: '#e67e22', initial: 'ز' },
  { color: '#34495e', initial: 'ح' },
]

export default function ProfileScreen() {
  const { playerName, playerAvatar, setPlayerName, setPlayerAvatar, setScreen } = useGameStore()
  const [name, setName] = useState(playerName)
  const [selectedAvatar, setSelectedAvatar] = useState(playerAvatar)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const trimmedName = name.trim()
    if (trimmedName) {
      setPlayerName(trimmedName)
      setPlayerAvatar(selectedAvatar)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar)
    setSaved(false)
  }

  // Get fallback based on player name, not index
  const getFallbackForName = (name: string) => {
    const charCode = name.charCodeAt(0) || 0
    const index = charCode % FALLBACK_AVATARS.length
    return FALLBACK_AVATARS[index]
  }

  const fallback = getFallbackForName(playerName)

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-white">الملف الشخصي</h2>

        {/* Current Avatar Preview */}
        <div className="relative">
          <div 
            className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden bg-gray-800 flex items-center justify-center"
            style={{ backgroundColor: fallback.color }}
          >
            <img
              src={selectedAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            <span className="text-white text-2xl font-bold absolute" style={{ display: 'none' }}>
              {playerName.charAt(0) || fallback.initial}
            </span>
          </div>
          <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-2">
            <Camera size={16} className="text-black" />
          </div>
        </div>

        {/* Name Input */}
        <div className="w-full">
          <label className="text-white/60 text-sm mb-2 block">الاسم</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-right"
            placeholder="أدخل اسمك"
            maxLength={20}
          />
        </div>

        {/* Avatar Selection */}
        <div className="w-full">
          <label className="text-white/60 text-sm mb-2 block">اختر صورة</label>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_OPTIONS.map((avatar, index) => {
              const fb = FALLBACK_AVATARS[index % FALLBACK_AVATARS.length]
              return (
                <button
                  key={avatar}
                  onClick={() => handleAvatarSelect(avatar)}
                  className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                    selectedAvatar === avatar ? 'border-yellow-500 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: fb.color }}
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <span className="text-white text-lg font-bold absolute inset-0 flex items-center justify-center pointer-events-none">
                    {fb.initial}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="game-btn game-btn-primary w-full gap-3"
        >
          {saved ? <Check size={24} /> : <User size={24} />}
          {saved ? 'تم الحفظ!' : 'حفظ'}
        </button>
      </div>
    </div>
  )
}