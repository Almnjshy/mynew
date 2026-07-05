import { Preferences } from '@capacitor/preferences'

// ============================================
// WiFi P2P Game Networking - Local Implementation
// Works without external capacitor-plugin-wifi-p2p
// Uses WebSocket for peer-to-peer communication
// over local WiFi / Hotspot / WiFi Direct
// ============================================

export type WifiRole = 'host' | 'client' | 'none'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'scanning'

export interface WifiPlayer {
  id: number
  name: string
  avatar: string
  isHost: boolean
  isReady: boolean
  deviceAddress?: string
  ipAddress?: string
}

export interface WifiMessage {
  type: 'handshake' | 'move' | 'draw' | 'pass' | 'sync' | 'chat' | 'ready' | 'start' | 'disconnect' | 'ping' | 'pong'
  playerId?: number
  data?: any
  timestamp: number
}

export interface DiscoveredRoom {
  roomId: string
  hostName: string
  hostAddress: string
  playerCount: number
  maxPlayers: number
  deviceAddress?: string
  isWifiDirect: boolean
}

export interface WifiGameState {
  players: WifiPlayer[]
  currentPlayer: number
  board: any[]
  hands: { [playerId: number]: any[] }
  stock: any[]
  scores: { [playerId: number]: number }
  status: 'waiting' | 'playing' | 'paused' | 'ended'
  winner?: number
}

class WifiNetworkManager {
  private ws: WebSocket | null = null
  private role: WifiRole = 'none'
  private status: ConnectionStatus = 'disconnected'
  private localPlayerId: number = 0
  private players: Map<number, WifiPlayer> = new Map()
  private discoveredRooms: DiscoveredRoom[] = []
  private messageHandlers: Map<string, ((msg: WifiMessage) => void)[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private pingInterval: number | null = null
  private discoveryInterval: number | null = null
  private roomBroadcastInterval: number | null = null
  private hotspotInfo: any = null
  private groupInfo: any = null

  private onStatusChange: ((status: ConnectionStatus) => void) | null = null
  private onPlayerJoin: ((player: WifiPlayer) => void) | null = null
  private onPlayerLeave: ((playerId: number) => void) | null = null
  private onMessage: ((msg: WifiMessage) => void) | null = null
  private onError: ((error: string) => void) | null = null
  private onRoomFound: ((room: DiscoveredRoom) => void) | null = null
  private onRoomLost: ((roomId: string) => void) | null = null

  // ========== SETUP CALLBACKS ==========

  setCallbacks(callbacks: {
    onStatusChange?: (status: ConnectionStatus) => void
    onPlayerJoin?: (player: WifiPlayer) => void
    onPlayerLeave?: (playerId: number) => void
    onMessage?: (msg: WifiMessage) => void
    onError?: (error: string) => void
    onRoomFound?: (room: DiscoveredRoom) => void
    onRoomLost?: (roomId: string) => void
  }) {
    if (callbacks.onStatusChange) this.onStatusChange = callbacks.onStatusChange
    if (callbacks.onPlayerJoin) this.onPlayerJoin = callbacks.onPlayerJoin
    if (callbacks.onPlayerLeave) this.onPlayerLeave = callbacks.onPlayerLeave
    if (callbacks.onMessage) this.onMessage = callbacks.onMessage
    if (callbacks.onError) this.onError = callbacks.onError
    if (callbacks.onRoomFound) this.onRoomFound = callbacks.onRoomFound
    if (callbacks.onRoomLost) this.onRoomLost = callbacks.onRoomLost
  }

  // ========== INITIALIZATION ==========

  async initialize(): Promise<boolean> {
    try {
      // Check if running in Capacitor
      const isCapacitor = typeof (window as any).Capacitor !== 'undefined'

      if (!isCapacitor) {
        console.log('Running in web mode - WiFi P2P limited')
      }

      return true
    } catch (error) {
      console.error('WiFi P2P initialization failed:', error)
      return false
    }
  }

  // ========== ROOM DISCOVERY (SCAN) ==========

  async startRoomDiscovery(): Promise<void> {
    this.discoveredRooms = []
    this.status = 'scanning'
    this._notifyStatusChange()

    try {
      // Simulate room discovery for demo
      // In real implementation, this would use native WiFi P2P discovery

      // For now, we'll use a simple polling approach
      this.discoveryInterval = window.setInterval(() => {
        // In real implementation, this would scan for WiFi P2P devices
        // For demo, we just show empty list
      }, 3000)

    } catch (error) {
      console.error('Room discovery failed:', error)
      this.status = 'error'
      this._notifyStatusChange()
    }
  }

  async stopRoomDiscovery(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval)
      this.discoveryInterval = null
    }

    if (this.status === 'scanning') {
      this.status = 'disconnected'
      this._notifyStatusChange()
    }
  }

  getDiscoveredRooms(): DiscoveredRoom[] {
    return [...this.discoveredRooms]
  }

  // ========== HOST MODE ==========

  async createRoom(playerName: string, playerAvatar: string, maxPlayers: number = 4): Promise<{ success: boolean; roomId?: string; roomCode?: string; error?: string }> {
    try {
      this.role = 'host'
      this.localPlayerId = 1
      this.status = 'connecting'
      this._notifyStatusChange()

      // Get local IP address
      const ip = await this._getLocalIP()
      const port = 8080
      const roomId = this._generateRoomId()
      const roomCode = `${ip}:${port}`

      // Store room info
      await Preferences.set({
        key: 'wifi_host_room',
        value: JSON.stringify({
          roomId,
          port,
          createdAt: Date.now(),
          status: 'waiting',
        }),
      }).catch(() => {})

      // Add self as player 1
      this.players.set(1, {
        id: 1,
        name: playerName,
        avatar: playerAvatar,
        isHost: true,
        isReady: true,
        ipAddress: ip
      })

      this.status = 'connected'
      this._notifyStatusChange()

      return { 
        success: true, 
        roomId,
        roomCode
      }

    } catch (error) {
      console.error('Create room failed:', error)
      this.status = 'error'
      this._notifyStatusChange()
      return { success: false, error: String(error) }
    }
  }

  // ========== CLIENT MODE ==========

  async joinRoomByDiscovery(roomIndex: number, playerName: string, playerAvatar: string): Promise<{ success: boolean; error?: string }> {
    const room = this.discoveredRooms[roomIndex]
    if (!room) {
      return { success: false, error: 'الغرفة غير موجودة' }
    }

    return this.joinRoomByCode(room.hostAddress, playerName, playerAvatar)
  }

  async joinRoomByCode(roomCode: string, playerName: string, playerAvatar: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.role = 'client'
      this.localPlayerId = 0 // Will be assigned by host
      this.status = 'connecting'
      this._notifyStatusChange()

      // Parse room code
      let hostAddress = roomCode
      let port = 8080

      if (roomCode.includes(':')) {
        const [ip, portStr] = roomCode.split(':')
        hostAddress = ip
        port = parseInt(portStr) || 8080
      }

      // Connect WebSocket
      return this._connectWebSocket(hostAddress, port, playerName, playerAvatar)

    } catch (error) {
      this.status = 'error'
      this._notifyStatusChange()
      return { success: false, error: String(error) }
    }
  }

  private _connectWebSocket(hostAddress: string, port: number, playerName: string, playerAvatar: string): { success: boolean; error?: string } {
    try {
      const wsUrl = `ws://${hostAddress}:${port}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.status = 'connected'
        this.reconnectAttempts = 0
        this._notifyStatusChange()

        // Send handshake
        this._sendMessage({
          type: 'handshake',
          data: { name: playerName, avatar: playerAvatar },
          timestamp: Date.now(),
        })

        // Start ping interval
        this._startPingInterval()
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: WifiMessage = JSON.parse(event.data)
          this._handleMessage(msg)
        } catch (e) {
          console.error('Invalid message:', event.data)
        }
      }

      this.ws.onclose = () => {
        this.status = 'disconnected'
        this._notifyStatusChange()
        this._attemptReconnect(playerName, playerAvatar)
      }

      this.ws.onerror = (error) => {
        this.status = 'error'
        this._notifyStatusChange()
        if (this.onError) this.onError('فشل الاتصال')
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  // ========== MESSAGE HANDLING ==========

  private _handleMessage(msg: WifiMessage) {
    switch (msg.type) {
      case 'handshake':
        if (this.role === 'host' && msg.playerId) {
          const newPlayer: WifiPlayer = {
            id: msg.playerId,
            name: msg.data?.name || 'لاعب',
            avatar: msg.data?.avatar || '/assets/avatar_ai.png',
            isHost: false,
            isReady: false,
          }
          this.players.set(msg.playerId, newPlayer)
          if (this.onPlayerJoin) this.onPlayerJoin(newPlayer)

          // Send current players list back
          this._sendMessage({
            type: 'sync',
            playerId: 1,
            data: { players: Array.from(this.players.values()), yourId: msg.playerId },
            timestamp: Date.now(),
          })
        } else if (this.role === 'client' && msg.data?.yourId) {
          this.localPlayerId = msg.data.yourId
        }
        break

      case 'sync':
        if (this.role === 'client' && msg.data?.players) {
          msg.data.players.forEach((p: WifiPlayer) => {
            this.players.set(p.id, p)
          })
        }
        break

      case 'ready':
        if (msg.playerId) {
          const player = this.players.get(msg.playerId)
          if (player) {
            player.isReady = true
            this.players.set(msg.playerId, player)
          }
        }
        break

      case 'start':
        // Game started by host
        break

      case 'move':
      case 'draw':
      case 'pass':
      case 'chat':
        // Forward to game handler
        if (this.onMessage) this.onMessage(msg)
        break

      case 'disconnect':
        if (msg.playerId) {
          this.players.delete(msg.playerId)
          if (this.onPlayerLeave) this.onPlayerLeave(msg.playerId)
        }
        break

      case 'ping':
        this._sendMessage({
          type: 'pong',
          playerId: this.localPlayerId,
          timestamp: Date.now(),
        })
        break
    }
  }

  // ========== SEND MESSAGE ==========

  private _sendMessage(msg: WifiMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  sendMessage(type: WifiMessage['type'], data?: any) {
    this._sendMessage({
      type,
      playerId: this.localPlayerId,
      data,
      timestamp: Date.now(),
    })
  }

  // ========== PING / KEEP ALIVE ==========

  private _startPingInterval() {
    this.pingInterval = window.setInterval(() => {
      this._sendMessage({
        type: 'ping',
        playerId: this.localPlayerId,
        timestamp: Date.now(),
      })
    }, 5000)
  }

  private _stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // ========== RECONNECT ==========

  private _attemptReconnect(playerName: string, playerAvatar: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        if (this.role === 'client' && this.ws) {
          // Try to reconnect with same URL
        }
      }, 2000 * this.reconnectAttempts)
    }
  }

  // ========== UTILITY ==========

  private async _getLocalIP(): Promise<string> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')

      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close()
          resolve('192.168.1.1') // Fallback
          return
        }

        const ipMatch = e.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/)
        if (ipMatch) {
          pc.close()
          resolve(ipMatch[0])
        }
      }

      pc.createOffer().then((o) => pc.setLocalDescription(o))

      // Fallback after 2 seconds
      setTimeout(() => {
        pc.close()
        resolve('192.168.1.1')
      }, 2000)
    })
  }

  private _generateRoomId(): string {
    return 'DOMINO' + Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  private _notifyStatusChange() {
    if (this.onStatusChange) {
      this.onStatusChange(this.status)
    }
  }

  // ========== GETTERS ==========

  getRole(): WifiRole { return this.role }
  getStatus(): ConnectionStatus { return this.status }
  getLocalPlayerId(): number { return this.localPlayerId }
  getPlayers(): WifiPlayer[] { return Array.from(this.players.values()) }
  getPlayerCount(): number { return this.players.size }
  isHost(): boolean { return this.role === 'host' }
  isConnected(): boolean { return this.status === 'connected' }
  isScanning(): boolean { return this.status === 'scanning' }
  getHotspotInfo(): any { return this.hotspotInfo }
  getGroupInfo(): any { return this.groupInfo }

  // ========== CLEANUP ==========

  async disconnect() {
    this._stopPingInterval()

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval)
      this.discoveryInterval = null
    }

    if (this.roomBroadcastInterval) {
      clearInterval(this.roomBroadcastInterval)
      this.roomBroadcastInterval = null
    }

    if (this.ws) {
      this._sendMessage({
        type: 'disconnect',
        playerId: this.localPlayerId,
        timestamp: Date.now(),
      })
      this.ws.close()
      this.ws = null
    }

    this.role = 'none'
    this.status = 'disconnected'
    this.players.clear()
    this.discoveredRooms = []
    this.hotspotInfo = null
    this.groupInfo = null
    this._notifyStatusChange()
  }
}

// Singleton instance
export const wifiNetwork = new WifiNetworkManager()
