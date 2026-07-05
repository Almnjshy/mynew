import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { wifiNetwork, type WifiPlayer, type ConnectionStatus, type DiscoveredRoom } from '@/lib/wifiNetwork'
import { soundEngine } from '@/lib/soundEngine'
import { 
  ArrowLeft, Wifi, Users, Radio, Copy, Check, AlertCircle, Loader2, 
  MessageSquare, Send, Search, RefreshCw, Signal, Smartphone, UserPlus
} from 'lucide-react'

type WifiScreen = 'menu' | 'scan' | 'create' | 'lobby' | 'game' | 'error'

export default function WifiGameScreen() {
  const { setScreen, playerName, playerAvatar } = useGameStore()
  const [currentScreen, setCurrentScreen] = useState<WifiScreen>('menu')
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [players, setPlayers] = useState<WifiPlayer[]>([])
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [chatMessages, setChatMessages] = useState<{name: string, message: string, isMe: boolean}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null)
  const [hotspotPassword, setHotspotPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Initialize WiFi P2P on mount
  useEffect(() => {
    wifiNetwork.initialize().then(success => {
      if (!success) {
        setError('فشل تهيئة WiFi P2P. تأكد من تفعيل WiFi.')
      }
    })

    return () => {
      wifiNetwork.disconnect()
    }
  }, [])

  // Setup WiFi network callbacks
  useEffect(() => {
    wifiNetwork.setCallbacks({
      onStatusChange: (status) => {
        setConnectionStatus(status)
        if (status === 'connected') {
          setCurrentScreen('lobby')
        } else if (status === 'error') {
          setCurrentScreen('error')
          setError('فشل الاتصال.')
        } else if (status === 'scanning') {
          setIsScanning(true)
        }
      },
      onPlayerJoin: (player) => {
        setPlayers(prev => [...prev, player])
        soundEngine.playMatchStart()
      },
      onPlayerLeave: (playerId) => {
        setPlayers(prev => prev.filter(p => p.id !== playerId))
      },
      onMessage: (msg) => {
        if (msg.type === 'chat' && msg.data?.message) {
          const sender = players.find(p => p.id === msg.playerId)
          setChatMessages(prev => [...prev, {
            name: sender?.name || 'لاعب',
            message: msg.data.message,
            isMe: msg.playerId === wifiNetwork.getLocalPlayerId()
          }])
        }
        if (msg.type === 'start') {
          startCountdown()
        }
      },
      onError: (err) => {
        setError(err)
        setCurrentScreen('error')
      },
      onRoomFound: (room) => {
        setDiscoveredRooms(prev => {
          const exists = prev.findIndex(r => r.roomId === room.roomId)
          if (exists === -1) {
            return [...prev, room]
          }
          return prev.map((r, i) => i === exists ? room : r)
        })
      },
      onRoomLost: (roomId) => {
        setDiscoveredRooms(prev => prev.filter(r => r.roomId !== roomId))
      }
    })
  }, [players])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const startCountdown = () => {
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setCurrentScreen('game')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ========== SCAN ROOMS ==========

  const handleScanRooms = async () => {
    soundEngine.playClick()
    setCurrentScreen('scan')
    setDiscoveredRooms([])
    setError('')

    try {
      await wifiNetwork.startRoomDiscovery()
    } catch (err) {
      setError('فشل البحث. تأكد من تفعيل WiFi.')
      setCurrentScreen('error')
    }
  }

  const stopScan = () => {
    wifiNetwork.stopRoomDiscovery()
    setIsScanning(false)
    setCurrentScreen('menu')
  }

  const refreshScan = () => {
    soundEngine.playClick()
    setDiscoveredRooms([])
    wifiNetwork.stopRoomDiscovery().then(() => {
      wifiNetwork.startRoomDiscovery()
    })
  }

  // ========== CREATE ROOM ==========

  const handleCreateRoom = async () => {
    soundEngine.playClick()
    setCurrentScreen('create')
    setError('')

    const result = await wifiNetwork.createRoom(playerName, playerAvatar, maxPlayers)

    if (result.success && result.roomId) {
      setRoomCode(result.roomCode || result.roomId)

      // Get hotspot info if available
      const hotspot = wifiNetwork.getHotspotInfo()
      if (hotspot) {
        setHotspotPassword(hotspot.password)
      }

      setPlayers([{
        id: 1,
        name: playerName,
        avatar: playerAvatar,
        isHost: true,
        isReady: true
      }])
    } else {
      setError(result.error || 'فشل إنشاء الغرفة')
      setCurrentScreen('error')
    }
  }

  // ========== JOIN ROOM ==========

  const handleJoinByDiscovery = async (index: number) => {
    soundEngine.playClick()
    setSelectedRoomIndex(index)
    setError('')

    const result = await wifiNetwork.joinRoomByDiscovery(index, playerName, playerAvatar)

    if (!result.success) {
      setError(result.error || 'فشل الانضمام')
      setSelectedRoomIndex(null)
    }
  }

  const handleJoinByCode = async () => {
    if (!inputCode.trim()) return

    soundEngine.playClick()
    setError('')

    const result = await wifiNetwork.joinRoomByCode(inputCode.trim(), playerName, playerAvatar)

    if (!result.success) {
      setError(result.error || 'فشل الانضمام')
    }
  }

  // ========== LOBBY ACTIONS ==========

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {
      const textArea = document.createElement('textarea')
      textArea.value = roomCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleReady = () => {
    soundEngine.playClick()
    const newReady = !isReady
    setIsReady(newReady)
    wifiNetwork.sendMessage('ready', { ready: newReady })
  }

  const startGame = () => {
    if (!wifiNetwork.isHost()) return

    const allReady = players.every(p => p.isReady)
    if (!allReady) {
      setError('جميع اللاعبين يجب أن يكونوا جاهزين!')
      return
    }

    if (players.length < 2) {
      setError('يحتاج لاعبين على الأقل!')
      return
    }

    soundEngine.playMatchStart()
    wifiNetwork.sendMessage('start', { timestamp: Date.now() })
    startCountdown()
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    wifiNetwork.sendMessage('chat', { message: chatInput.trim() })
    setChatInput('')
  }

  const handleBack = () => {
    soundEngine.playClick()
    wifiNetwork.disconnect()
    setScreen('menu')
  }

  // ========== RENDER SCREENS ==========

  // Menu Screen
  if (currentScreen === 'menu') {
    return (
      <div className="screen-container table-bg">
        <button onClick={handleBack} className="absolute top-4 left-4 text-white p-2 z-10">
          <ArrowLeft size={28} />
        </button>

        <div className="flex flex-col items-center gap-8 w-full max-w-sm">
          <Wifi size={64} className="gold-accent" />
          <h2 className="text-3xl font-bold text-white">لعب عبر WiFi</h2>

          <div className="w-full flex flex-col gap-4">
            {/* Create Room */}
            <button 
              onClick={handleCreateRoom}
              className="game-btn game-btn-primary w-full gap-3"
            >
              <Radio size={24} /> إنشاء غرفة (Host)
            </button>

            {/* Scan for Rooms */}
            <button 
              onClick={handleScanRooms}
              className="game-btn game-btn-secondary w-full gap-3"
            >
              <Search size={24} /> البحث عن غرف
            </button>

            <div className="text-center text-white/60 text-sm">— أو —</div>

            {/* Join by Code */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="أدخل كود الغرفة"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center placeholder:text-white/40 focus:outline-none focus:border-yellow-500"
                dir="ltr"
              />
              <button 
                onClick={handleJoinByCode}
                disabled={!inputCode.trim()}
                className="game-btn game-btn-secondary w-full gap-3 disabled:opacity-50"
              >
                <Users size={24} /> الانضمام بكود
              </button>
            </div>
          </div>

          <div className="text-center text-white/50 text-sm px-4 space-y-1">
            <p>📱 2-4 لاعبين على نفس الشبكة</p>
            <p>📡 WiFi Direct أو Hotspot</p>
            <p className="text-yellow-400/70 text-xs">لا يحتاج إنترنت</p>
          </div>
        </div>
      </div>
    )
  }

  // Scan Screen
  if (currentScreen === 'scan') {
    return (
      <div className="screen-container table-bg">
        <button onClick={stopScan} className="absolute top-4 left-4 text-white p-2 z-10">
          <ArrowLeft size={28} />
        </button>

        <div className="flex flex-col items-center gap-6 w-full max-w-sm h-full max-h-[90vh]">
          <div className="flex items-center gap-3">
            <Search size={32} className="gold-accent" />
            <h2 className="text-3xl font-bold text-white">البحث عن غرف</h2>
          </div>

          {/* Scanning Indicator */}
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 size={20} className="animate-spin text-yellow-400" />
            <span>جاري البحث...</span>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={refreshScan}
            className="flex items-center gap-2 text-yellow-400/70 text-sm hover:text-yellow-400 transition-colors"
          >
            <RefreshCw size={16} /> تحديث
          </button>

          {/* Discovered Rooms */}
          <div className="w-full flex-1 overflow-y-auto space-y-3">
            {discoveredRooms.length === 0 ? (
              <div className="flex flex-col items-center gap-4 text-white/40 py-12">
                <Signal size={48} className="opacity-50" />
                <p>لم يتم العثور على غرف</p>
                <p className="text-sm">تأكد من أن Host قريب منك</p>
              </div>
            ) : (
              <>
                <p className="text-white/60 text-sm">{discoveredRooms.length} غرفة متاحة:</p>
                {discoveredRooms.map((room, index) => (
                  <button
                    key={room.roomId}
                    onClick={() => handleJoinByDiscovery(index)}
                    disabled={selectedRoomIndex === index}
                    className={`w-full bg-white/10 rounded-xl p-4 flex items-center gap-4 transition-all text-right ${
                      selectedRoomIndex === index ? 'opacity-70' : 'hover:bg-white/20 active:scale-95'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <Smartphone size={24} className="text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">{room.hostName}</p>
                      <p className="text-white/50 text-sm">
                        {room.playerCount}/{room.maxPlayers} لاعبين
                      </p>
                      <p className="text-yellow-400/70 text-xs mt-1">
                        {room.isWifiDirect ? 'WiFi Direct' : 'Hotspot'}
                      </p>
                    </div>
                    {selectedRoomIndex === index && (
                      <Loader2 size={20} className="text-yellow-400 animate-spin" />
                    )}
                    {selectedRoomIndex !== index && (
                      <UserPlus size={20} className="text-white/40" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>

          <p className="text-white/40 text-xs text-center">
            تأكد من تفعيل WiFi وقربك من Host
          </p>
        </div>
      </div>
    )
  }

  // Create Room Screen
  if (currentScreen === 'create') {
    return (
      <div className="screen-container table-bg">
        <button onClick={handleBack} className="absolute top-4 left-4 text-white p-2 z-10">
          <ArrowLeft size={28} />
        </button>

        <div className="flex flex-col items-center gap-8 w-full max-w-sm">
          <Radio size={64} className="gold-accent animate-pulse" />
          <h2 className="text-3xl font-bold text-white">إنشاء غرفة</h2>

          {connectionStatus === 'connecting' ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-yellow-400 animate-spin" />
              <p className="text-white/70">جاري إنشاء الغرفة...</p>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {/* Room Code */}
              <div className="bg-white/10 rounded-xl p-6 text-center space-y-3">
                <p className="text-white/60 text-sm">كود الغرفة</p>
                <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between gap-3">
                  <code className="text-yellow-400 text-2xl font-mono font-bold" dir="ltr">{roomCode}</code>
                  <button 
                    onClick={copyRoomCode}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-white" />}
                  </button>
                </div>
                <p className="text-white/50 text-xs">شارك هذا الكود مع أصدقائك</p>
              </div>

              {/* Hotspot Info */}
              {hotspotPassword && (
                <div className="bg-white/10 rounded-xl p-4 space-y-2">
                  <p className="text-white/60 text-sm">معلومات Hotspot:</p>
                  <div className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                    <span className="text-white/50 text-sm">كلمة المرور:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 font-mono" dir="ltr">
                        {showPassword ? hotspotPassword : '••••••••'}
                      </code>
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-white/40 hover:text-white text-xs"
                      >
                        {showPassword ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Max Players */}
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-3">عدد اللاعبين:</p>
                <div className="flex gap-2">
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setMaxPlayers(num)}
                      className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                        maxPlayers === num 
                          ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Waiting Status */}
              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-white font-bold">{playerName}</p>
                  <p className="text-green-400 text-xs">✓ متصل (Host)</p>
                </div>
                <span className="text-white/40 text-sm">1/{maxPlayers}</span>
              </div>

              <p className="text-white/50 text-xs text-center">
                ينتظر اللاعبين... ({players.length - 1}/{maxPlayers - 1})
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Error Screen
  if (currentScreen === 'error') {
    return (
      <div className="screen-container table-bg">
        <button onClick={handleBack} className="absolute top-4 left-4 text-white p-2 z-10">
          <ArrowLeft size={28} />
        </button>

        <div className="flex flex-col items-center gap-8 w-full max-w-sm">
          <AlertCircle size={64} className="text-red-400" />
          <h2 className="text-3xl font-bold text-white">خطأ</h2>

          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-300">{error}</p>
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={() => {
                setError('')
                setCurrentScreen('menu')
              }}
              className="game-btn game-btn-primary w-full"
            >
              حاول مرة أخرى
            </button>

            <button 
              onClick={handleBack}
              className="game-btn game-btn-secondary w-full"
            >
              العودة للقائمة
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Lobby Screen
  if (currentScreen === 'lobby') {
    const allReady = players.length >= 2 && players.every(p => p.isReady)
    const canStart = allReady && players.length >= 2 && wifiNetwork.isHost()

    return (
      <div className="screen-container table-bg">
        <button onClick={handleBack} className="absolute top-4 left-4 text-white p-2 z-10">
          <ArrowLeft size={28} />
        </button>

        <div className="flex flex-col items-center gap-6 w-full max-w-sm h-full max-h-[90vh]">
          <h2 className="text-3xl font-bold gold-accent">اللوبي</h2>

          {/* Room Info */}
          <div className="w-full bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <span className="text-white/60 text-sm">كود الغرفة:</span>
            <code className="text-yellow-400 font-mono text-sm" dir="ltr">{roomCode}</code>
          </div>

          {/* Players List */}
          <div className="w-full flex flex-col gap-3">
            <p className="text-white/60 text-sm">اللاعبون ({players.length}/{maxPlayers}):</p>
            {players.map(player => (
              <div key={player.id} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden bg-gray-800">
                  <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-white font-bold">{player.name}</p>
                  <p className="text-xs text-white/50">
                    {player.isHost ? 'Host' : 'Guest'}
                    {player.isReady && <span className="text-green-400 mr-2">✓ جاهز</span>}
                  </p>
                </div>
                {player.isHost && (
                  <span className="text-yellow-400/70 text-xs bg-yellow-400/10 px-2 py-1 rounded">Host</span>
                )}
              </div>
            ))}

            {players.length < maxPlayers && (
              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-dashed border-white/20">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Loader2 size={24} className="text-white/40 animate-spin" />
                </div>
                <p className="text-white/40">ينتظر لاعب...</p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="w-full flex-1 min-h-0 bg-black/20 rounded-xl flex flex-col">
            <div className="p-3 border-b border-white/10 flex items-center gap-2">
              <MessageSquare size={16} className="text-white/60" />
              <span className="text-white/60 text-sm">الدردشة</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-white/30 text-center text-sm">ابدأ المحادثة...</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-white/40 text-xs">{msg.name}</span>
                  <span className={`px-3 py-1.5 rounded-xl text-sm max-w-[80%] ${
                    msg.isMe ? 'bg-yellow-500/20 text-yellow-200' : 'bg-white/10 text-white'
                  }`}>
                    {msg.message}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                placeholder="اكتب رسالة..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-yellow-500"
              />
              <button 
                onClick={sendChat}
                className="p-2 bg-yellow-500/20 rounded-lg hover:bg-yellow-500/30 transition-colors"
              >
                <Send size={18} className="text-yellow-400" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={toggleReady}
              className={`game-btn w-full gap-2 ${isReady ? 'bg-green-600' : 'game-btn-secondary'}`}
            >
              <Check size={20} /> {isReady ? 'جاهز!' : 'أنا جاهز'}
            </button>

            {wifiNetwork.isHost() && (
              <button 
                onClick={startGame}
                disabled={!canStart}
                className="game-btn game-btn-primary w-full disabled:opacity-50"
              >
                ابدأ المباراة ({players.length}/{maxPlayers})
              </button>
            )}

            {!wifiNetwork.isHost() && !allReady && (
              <p className="text-white/50 text-sm text-center">ينتظر Host بدء المباراة...</p>
            )}

            {!allReady && players.length >= 2 && (
              <p className="text-yellow-400/70 text-xs text-center">بعض اللاعبين لم يجهزوا بعد</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Countdown Screen
  if (countdown > 0) {
    return (
      <div className="screen-container table-bg">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-8xl font-bold gold-accent animate-bounce">
            {countdown}
          </div>
          <p className="text-white/70 text-xl mt-4">جاري البدء...</p>
          <div className="flex gap-4 mt-8">
            {players.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden">
                  <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-white/60 text-xs">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Game Screen
  if (currentScreen === 'game') {
    return (
      <div className="screen-container table-bg">
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <Wifi size={64} className="gold-accent" />
          <h2 className="text-3xl font-bold text-white">وضع WiFi</h2>
          <p className="text-white/70 text-center px-8">
            المباراة جارية! <br/>
            اللاعبون: {players.map(p => p.name).join(', ')}
          </p>
          <div className="flex gap-4">
            {players.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full border-2 border-yellow-500 overflow-hidden">
                  <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-white font-bold">{p.name}</span>
                <span className="text-white/50 text-xs">{p.isHost ? 'Host' : 'Client'}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={handleBack}
            className="game-btn game-btn-secondary mt-8"
          >
            الخروج من المباراة
          </button>
        </div>
      </div>
    )
  }

  return null
}
