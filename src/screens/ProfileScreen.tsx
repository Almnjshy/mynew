import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ArrowLeft, User, Camera, Save } from 'lucide-react'

const AVATARS = [
  '/assets/avatar_1.png',
  '/assets/avatar_2.png',
  '/assets/avatar_3.png',
  '/assets/avatar_4.png',
  '/assets/avatar_5.png',
  '/assets/avatar_6.png',
  '/assets/avatar_player.png',
]

export default function ProfileScreen() {
  const { setScreen, playerName, playerAvatar, setPlayerName, setPlayerAvatar } = useGameStore()
  const [name, setName] = useState(playerName)
  const [selectedAvatar, setSelectedAvatar] = useState(playerAvatar)

  const handleSave = () => {
    if (name.trim()) {
      setPlayerName(name.trim())
    }
    setPlayerAvatar(selectedAvatar)
    setScreen('menu')
  }

  return (
    <div className="screen-container wood-bg">
      <button onClick={() => setScreen('menu')} className="absolute top-4 left-4 text-white p-2">
        <ArrowLeft size={28} />
      </button>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-12">
        <h2 className="text-3xl font-bold gold-accent mb-4">الملف الشخصي</h2>

        <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden bg-gray-800 flex items-center justify-center">
          <img
            src={selectedAvatar}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.style.backgroundColor = '#3498db'
                parent.innerText = name.charAt(0) || 'أ'
                parent.style.fontSize = '2rem'
                parent.style.fontWeight = 'bold'
                parent.style.color = 'white'
              }
            }}
          />
        </div>

        <div className="w-full bg-white/10 rounded-xl p-4">
          <label className="text-white/70 text-sm mb-2 block">الاسم</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500"
            placeholder="أدخل اسمك"
            maxLength={20}
          />
        </div>

        <div className="w-full bg-white/10 rounded-xl p-4">
          <label className="text-white/70 text-sm mb-3 block flex items-center gap-2">
            <Camera size={16} /> اختر صورة
          </label>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                  selectedAvatar === avatar ? 'border-yellow-500 scale-110' : 'border-transparent'
                }`}
              >
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} className="game-btn game-btn-primary w-full gap-3">
          <Save size={24} /> حفظ
        </button>
      </div>
    </div>
  )
}
