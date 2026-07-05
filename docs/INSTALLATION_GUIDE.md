# 🎮 WiFi P2P Multiplayer - Installation Guide

## Files to Update/Replace

### 1. Install the Capacitor Plugin

```bash
# Copy plugin to your project
cp -r /mnt/agents/output/capacitor-plugin-wifi-p2p ./capacitor-plugin-wifi-p2p

# Install dependencies
npm install ./capacitor-plugin-wifi-p2p

# Sync Capacitor
npx cap sync android
```

### 2. Update Your Project Files

Replace these files in your project:

| File | Source | Destination |
|------|--------|-------------|
| `wifiNetwork.ts` | [wifiNetwork.ts](sandbox:///mnt/agents/output/capacitor-plugin-wifi-p2p/wifiNetwork.ts) | `src/lib/wifiNetwork.ts` |
| `WifiGameScreen.tsx` | [WifiGameScreen.tsx](sandbox:///mnt/agents/output/capacitor-plugin-wifi-p2p/WifiGameScreen.tsx) | `src/screens/WifiGameScreen.tsx` |
| `MainMenu.tsx` | [MainMenu.tsx](sandbox:///mnt/agents/output/capacitor-plugin-wifi-p2p/MainMenu.tsx) | `src/screens/MainMenu.tsx` |
| `App.tsx` | [App.tsx](sandbox:///mnt/agents/output/capacitor-plugin-wifi-p2p/App.tsx) | `src/App.tsx` |

### 3. Android Permissions

Add to `android/app/src/main/AndroidManifest.xml` (inside `<manifest>`):

```xml
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 4. Build & Test

```bash
# Build web
npm run build

# Sync Android
npx cap sync android

# Open Android Studio
npx cap open android

# Or build APK
cd android && ./gradlew assembleDebug
```

## Features Implemented

### ✅ Host Mode
- Create WiFi Direct Group or Hotspot
- Generate Room Code (easy to share)
- Set max players (2-4)
- Broadcast room availability
- Host Authority (validates all moves)

### ✅ Client Mode
- Scan for nearby rooms (WiFi Direct Discovery)
- Join by selecting from list
- Join by entering room code
- Auto-reconnect (3 attempts)

### ✅ Lobby
- Player list with avatars
- Ready system (all must ready)
- Real-time chat
- Host starts game when all ready
- Countdown 3-2-1

### ✅ Network Events
- JOIN, START_GAME, MOVE, PASS, SYNC_STATE, DISCONNECT
- Additional: CHAT, PING/PONG, READY

### ✅ Game Logic
- Host distributes tiles
- Host validates moves
- Clients send moves only
- State sync to all players
- Anti-cheat (Host Authority)

## Testing Steps

### Test 1: Host + Client (Same WiFi)
1. Device 1: Tap "Create Room"
2. Device 1: Share room code
3. Device 2: Tap "Search Rooms" or enter code
4. Device 2: Join room
5. Both: Tap "Ready"
6. Device 1: Tap "Start Game"
7. Countdown → Game starts!

### Test 2: Hotspot Mode
1. Device 1: Enable hotspot manually
2. Device 2: Connect to hotspot
3. Follow Test 1 steps

### Test 3: 3-4 Players
1. Host sets max players to 3 or 4
2. Multiple clients join
3. All ready → Start

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "WiFi P2P init failed" | Enable WiFi, grant location permission |
| "No rooms found" | Ensure devices are close, same network |
| "Connection failed" | Check firewall, try hotspot mode |
| "Hotspot not starting" | Some devices need system app permissions |
| "Permission denied" | Grant all permissions in Android Settings |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Host Device   │     │  Client Device   │
│  (Group Owner)  │     │   (Group Client) │
└────────┬────────┘     └────────┬─────────┘
         │                       │
    ┌────┴────┐             ┌────┴────┐
    │ Hotspot │             │ Connect │
    │   or    │             │   to    │
    │WiFi P2P │             │ Hotspot │
    │ Group   │             │         │
    └────┬────┘             └────┬────┘
         │                       │
    ┌────┴───────────────────────┴────┐
    │        Local Network (LAN)        │
    │    192.168.43.x (Hotspot)         │
    │    or WiFi Direct Group           │
    └────┬───────────────────────┬─────┘
         │                       │
    ┌────┴────┐             ┌────┴────┐
    │WebSocket│◄───────────►│WebSocket│
    │ Server  │   JSON API  │ Client  │
    │ (Port   │             │         │
    │  8080)  │             │         │
    └────┬────┘             └────┬────┘
         │                       │
    ┌────┴────┐             ┌────┴────┐
    │  Game   │             │  Game   │
    │ Engine  │             │ Engine  │
    │ (Host   │             │ (Client)│
    │Authority)│            │         │
    └─────────┘             └─────────┘
```
