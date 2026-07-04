import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, User, Camera, Check } from 'lucide-react'

const AVATAR_OPTIONS = [
  '/assets/avatar_player.png',
  '/assets/avatar_ai.png',
  '/assets/avatar_1.png',
  '/assets/avatar_2.png',
  '/assets/avatar_3.png',
  '/assets/avatar_4.png',
  '/assets/avatar_5.png',
  '/assets/avatar_6.png',
]

// Fallback avatars using initials if images don't exist
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

  const getAvatarStyle = (index: number) => {
    const fallback = FALLBACK_AVATARS[index % FALLBACK_AVATARS.length]
    return {
      backgroundColor: fallback.color,
      color: 'white',
    }
  }

  const getAvatarInitial = (index: number) => {
    return FALLBACK_AVATARS[index % FALLBACK_AVATARS.length].initial
  }

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent">الملف الشخصي</h2>

        {/* Current Avatar Preview */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden bg-gray-800 flex items-center justify-center">
            <img 
              src={selectedAvatar} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails to load, show fallback
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.style.backgroundColor = FALLBACK_AVATARS[0].color
                  parent.innerText = name.charAt(0) || 'أ'
                  parent.style.fontSize = '2rem'
                  parent.style.fontWeight = 'bold'
                }
              }}
            />
          </div>
          <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-1.5">
            <Camera size={16} className="text-black" />
          </div>
        </div>

        {/* Name Input */}
        <div className="w-full">
          <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
            <User size={16} /> اسم اللاعب
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false) }}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg text-center focus:outline-none focus:border-yellow-500 transition-colors"
            placeholder="أدخل اسمك"
            maxLength={20}
          />
          <div className="text-white/40 text-xs text-right mt-1">{name.length}/20</div>
        </div>

        {/* Avatar Selection */}
        <div className="w-full">
          <label className="text-white/70 text-sm mb-3 block">اختر صورتك الرمزية</label>
          <div className="grid grid-cols-4 gap-3">
            {AVATAR_OPTIONS.map((avatar, index) => (
              <button
                key={avatar}
                onClick={() => handleAvatarSelect(avatar)}
                className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                  selectedAvatar === avatar 
                    ? 'ring-3 ring-yellow-500 scale-110' 
                    : 'ring-1 ring-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={avatar} 
                  alt={`Avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      Object.assign(parent.style, getAvatarStyle(index))
                      parent.innerText = getAvatarInitial(index)
                      parent.style.fontSize = '1.5rem'
                      parent.style.fontWeight = 'bold'
                      parent.style.display = 'flex'
                      parent.style.alignItems = 'center'
                      parent.style.justifyContent = 'center'
                    }
                  }}
                />
                {selectedAvatar === avatar && (
                  <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center">
                    <Check size={20} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          className={`game-btn w-full text-xl gap-2 ${
            saved ? 'bg-green-600' : 'game-btn-primary'
          }`}
        >
          {saved ? (
            <>
              <Check size={24} /> تم الحفظ!
            </>
          ) : (
            'حفظ التغييرات'
          )}
        </button>
      </div>
    </div>
  )
}