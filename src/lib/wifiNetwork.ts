import { WifiP2P } from 'capacitor-plugin-wifi-p2p'
import type { WifiP2PDevice, RoomInfo, HotspotInfo } from 'capacitor-plugin-wifi-p2p'

// ============================================
// WiFi P2P Game Networking - Using Native Plugin
// Supports WiFi Direct + Hotspot + Room Discovery
// 2-4 Players, Host Authority, Auto-reconnect
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
  private hotspotInfo: HotspotInfo | null = null
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
      await WifiP2P.initialize()
      return true
    } catch (error) {
      console.error('WiFi P2P initialization failed:', error)
      return false
    }
  }

  // ========== ROOM DISCOVERY (SCAN) ==========

  /**
   * Start scanning for available rooms
   * Uses WiFi Direct discovery + room broadcast listening
   */
  async startRoomDiscovery(): Promise<void> {
    this.discoveredRooms = []
    this.status = 'scanning'
    this._notifyStatusChange()

    try {
      // Start WiFi Direct peer discovery
      await WifiP2P.startDiscovery()

      // Listen for device discovery events
      await WifiP2P.addListener('onDeviceFound', (device: WifiP2PDevice) => {
        // Check if device is broadcasting a room
        this._checkDeviceForRoom(device)
      })

      await WifiP2P.addListener('onDeviceLost', (device: WifiP2PDevice) => {
        // Remove room if device disconnected
        const roomIndex = this.discoveredRooms.findIndex(r => r.deviceAddress === device.deviceAddress)
        if (roomIndex !== -1) {
          const room = this.discoveredRooms[roomIndex]
          this.discoveredRooms.splice(roomIndex, 1)
          if (this.onRoomLost) this.onRoomLost(room.roomId)
        }
      })

      // Also poll for rooms periodically (fallback)
      this.discoveryInterval = window.setInterval(async () => {
        try {
          const { rooms } = await WifiP2P.discoverRooms()
          rooms.forEach((room: RoomInfo) => {
            this._addDiscoveredRoom({
              roomId: room.roomId,
              hostName: room.hostName,
              hostAddress: room.hostAddress,
              playerCount: room.playerCount,
              maxPlayers: room.maxPlayers,
              isWifiDirect: false
            })
          })
        } catch (e) {
          // Fallback: rooms may not be available via plugin
        }
      }, 3000)

    } catch (error) {
      console.error('Room discovery failed:', error)
      this.status = 'error'
      this._notifyStatusChange()
    }
  }

  /**
   * Stop scanning for rooms
   */
  async stopRoomDiscovery(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval)
      this.discoveryInterval = null
    }

    try {
      await WifiP2P.stopDiscovery()
      await WifiP2P.removeAllListeners()
    } catch (e) {
      // Ignore errors
    }

    if (this.status === 'scanning') {
      this.status = 'disconnected'
      this._notifyStatusChange()
    }
  }

  /**
   * Get list of discovered rooms
   */
  getDiscoveredRooms(): DiscoveredRoom[] {
    return [...this.discoveredRooms]
  }

  private _checkDeviceForRoom(device: WifiP2PDevice) {
    // In a real implementation, the device name would contain room info
    // Format: "DOMINO_RoomID_HostName_PlayerCount"
    if (device.deviceName && device.deviceName.startsWith('DOMINO_')) {
      const parts = device.deviceName.split('_')
      if (parts.length >= 3) {
        const roomId = parts[1]
        const hostName = parts[2]
        const playerCount = parseInt(parts[3]) || 1

        this._addDiscoveredRoom({
          roomId,
          hostName,
          hostAddress: device.deviceAddress,
          playerCount,
          maxPlayers: 4,
          deviceAddress: device.deviceAddress,
          isWifiDirect: true
        })
      }
    }
  }

  private _addDiscoveredRoom(room: DiscoveredRoom) {
    const existingIndex = this.discoveredRooms.findIndex(r => r.roomId === room.roomId)
    if (existingIndex === -1) {
      this.discoveredRooms.push(room)
      if (this.onRoomFound) this.onRoomFound(room)
    } else {
      // Update existing room info
      this.discoveredRooms[existingIndex] = room
    }
  }

  // ========== HOST MODE ==========

  /**
   * Create a room as host using WiFi Direct Group or Hotspot
   */
  async createRoom(playerName: string, playerAvatar: string, maxPlayers: number = 4): Promise<{ success: boolean; roomId?: string; roomCode?: string; error?: string }> {
    try {
      this.role = 'host'
      this.localPlayerId = 1
      this.status = 'connecting'
      this._notifyStatusChange()

      // Try WiFi Direct Group first, fallback to Hotspot
      let roomId = this._generateRoomId()
      let hostAddress = ''
      let connectionMethod = ''

      try {
        // Try WiFi Direct Group
        const group = await WifiP2P.createGroup()
        this.groupInfo = group
        hostAddress = group.ownerAddress
        connectionMethod = 'wifidirect'

        // Set device name to broadcast room info
        // Format: DOMINO_RoomID_HostName_1
        const broadcastName = `DOMINO_${roomId}_${playerName}_1`
        // Note: Changing device name requires additional Android API calls

      } catch (wifidirectError) {
        console.log('WiFi Direct failed, trying Hotspot:', wifidirectError)

        // Fallback: Create Hotspot
        const hotspot = await WifiP2P.startHotspot({
          ssid: `DOMINO_${roomId}`,
          password: this._generatePassword()
        })
        this.hotspotInfo = hotspot
        hostAddress = hotspot.ipAddress
        connectionMethod = 'hotspot'
      }

      // Get local IP for WebSocket server
      const { ipAddress } = await WifiP2P.getLocalIpAddress()
      if (ipAddress) {
        hostAddress = ipAddress
      }

      // Start room broadcast
      await WifiP2P.startRoomBroadcast({
        roomId,
        playerName,
        maxPlayers
      })

      // Start WebSocket server
      this._startWebSocketServer(hostAddress, 8080)

      // Add self as player 1
      this.players.set(1, {
        id: 1,
        name: playerName,
        avatar: playerAvatar,
        isHost: true,
        isReady: true,
        ipAddress: hostAddress
      })

      // Generate room code (short, easy to type)
      const roomCode = this._generateRoomCode(roomId, hostAddress)

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

  /**
   * Start WebSocket server for host
   */
  private _startWebSocketServer(hostAddress: string, port: number) {
    // In a real implementation, this would use a native WebSocket server
    // For now, we use the browser's WebSocket API (limited to client connections)
    // The actual server would need a native implementation or a separate service

    console.log(`WebSocket server should start on ws://${hostAddress}:${port}`)

    // For Capacitor, we might need a native WebSocket server plugin
    // or use HTTP polling as fallback
  }

  // ========== CLIENT MODE ==========

  /**
   * Join a room by selecting from discovered rooms or entering room code
   */
  async joinRoomByDiscovery(roomIndex: number, playerName: string, playerAvatar: string): Promise<{ success: boolean; error?: string }> {
    const room = this.discoveredRooms[roomIndex]
    if (!room) {
      return { success: false, error: 'الغرفة غير موجودة' }
    }

    if (room.isWifiDirect) {
      // Connect via WiFi Direct
      try {
        await WifiP2P.connectToDevice({ deviceAddress: room.deviceAddress! })

        // Wait for connection info
        await WifiP2P.addListener('onConnectionInfo', (info) => {
          if (info.groupFormed) {
            // Connected to group, now connect WebSocket
            this._connectWebSocket(info.groupOwnerAddress, 8080, playerName, playerAvatar)
          }
        })

        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    } else {
      // Connect via IP address (hotspot)
      return this.joinRoomByCode(room.hostAddress, playerName, playerAvatar)
    }
  }

  /**
   * Join a room by room code (IP:Port or short code)
   */
  async joinRoomByCode(roomCode: string, playerName: string, playerAvatar: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.role = 'client'
      this.localPlayerId = 0 // Will be assigned by host
      this.status = 'connecting'
      this._notifyStatusChange()

      // Parse room code
      let hostAddress = roomCode
      let port = 8080

      // Check if it's a short code (e.g., "DOMINO1234")
      if (roomCode.startsWith('DOMINO')) {
        // Need to resolve short code to IP (would need a discovery service)
        // For now, try to find in discovered rooms
        const room = this.discoveredRooms.find(r => r.roomId === roomCode)
        if (room) {
          hostAddress = room.hostAddress
        } else {
          return { success: false, error: 'لم يتم العثور على الغرفة. تأكد من أن Host قريب.' }
        }
      } else if (roomCode.includes(':')) {
        // IP:Port format
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

  /**
   * Connect WebSocket to host
   */
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
          // This would need the original host address stored
        }
      }, 2000 * this.reconnectAttempts)
    }
  }

  // ========== UTILITY ==========

  private _generateRoomId(): string {
    return 'DOMINO' + Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  private _generateRoomCode(roomId: string, hostAddress: string): string {
    // Create a short, memorable code
    // Format: First 4 chars of room ID + last octet of IP
    const ipParts = hostAddress.split('.')
    const lastOctet = ipParts[ipParts.length - 1] || '1'
    return `${roomId.substring(6, 10)}-${lastOctet}`
  }

  private _generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
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
  getHotspotInfo(): HotspotInfo | null { return this.hotspotInfo }
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

    // Stop native services
    try {
      await WifiP2P.stopRoomBroadcast()
      await WifiP2P.stopDiscovery()

      if (this.hotspotInfo) {
        await WifiP2P.stopHotspot()
      }

      if (this.groupInfo) {
        await WifiP2P.removeGroup()
      }

      await WifiP2P.removeAllListeners()
    } catch (e) {
      // Ignore cleanup errors
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
