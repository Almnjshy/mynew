package com.almnjshy.wifip2p;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiConfiguration;
import android.net.wifi.WifiManager;
import android.net.wifi.p2p.WifiP2pConfig;
import android.net.wifi.p2p.WifiP2pDevice;
import android.net.wifi.p2p.WifiP2pDeviceList;
import android.net.wifi.p2p.WifiP2pGroup;
import android.net.wifi.p2p.WifiP2pInfo;
import android.net.wifi.p2p.WifiP2pManager;
import android.net.wifi.p2p.WifiP2pManager.ActionListener;
import android.net.wifi.p2p.WifiP2pManager.Channel;
import android.net.wifi.p2p.WifiP2pManager.PeerListListener;
import android.net.wifi.p2p.WifiP2pManager.GroupInfoListener;
import android.net.wifi.p2p.WifiP2pManager.ConnectionInfoListener;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(
    name = "WifiP2P",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_WIFI_STATE,
                Manifest.permission.CHANGE_WIFI_STATE,
                Manifest.permission.ACCESS_NETWORK_STATE,
                Manifest.permission.CHANGE_NETWORK_STATE
            },
            alias = "wifi"
        ),
        @Permission(
            strings = {
                Manifest.permission.NEARBY_WIFI_DEVICES
            },
            alias = "nearby"
        )
    }
)
public class WifiP2PPlugin extends Plugin {

    private static final String TAG = "WifiP2PPlugin";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    private WifiP2pManager wifiP2pManager;
    private Channel channel;
    private WifiManager wifiManager;
    private ConnectivityManager connectivityManager;

    private boolean isWifiP2pEnabled = false;
    private boolean isDiscoveryActive = false;
    private boolean isHotspotActive = false;
    private boolean isRoomBroadcasting = false;

    private List<WifiP2pDevice> availableDevices = new ArrayList<>();
    private Map<String, RoomInfo> discoveredRooms = new HashMap<>();

    private BroadcastReceiver wifiP2pReceiver;
    private IntentFilter wifiP2pIntentFilter;

    private Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable discoveryTimeoutRunnable;
    private Runnable roomBroadcastRunnable;

    // Room broadcast constants
    private static final String ROOM_BROADCAST_PREFIX = "DOMINO_";
    private static final int ROOM_BROADCAST_INTERVAL = 2000; // 2 seconds
    private static final int DISCOVERY_TIMEOUT = 30000; // 30 seconds

    @Override
    public void load() {
        super.load();
        initializeWifiP2p();
    }

    private void initializeWifiP2p() {
        wifiP2pManager = (WifiP2pManager) getContext().getSystemService(Context.WIFI_P2P_SERVICE);
        wifiManager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        connectivityManager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);

        if (wifiP2pManager != null) {
            channel = wifiP2pManager.initialize(getContext(), getContext().getMainLooper(), null);
            registerWifiP2pReceiver();
        }
    }

    private void registerWifiP2pReceiver() {
        wifiP2pReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();

                if (WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION.equals(action)) {
                    int state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1);
                    isWifiP2pEnabled = (state == WifiP2pManager.WIFI_P2P_STATE_ENABLED);

                } else if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                    if (wifiP2pManager != null) {
                        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                            == PackageManager.PERMISSION_GRANTED) {
                            wifiP2pManager.requestPeers(channel, peerListListener);
                        }
                    }

                } else if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                    NetworkInfo networkInfo = intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO);
                    if (networkInfo != null && networkInfo.isConnected()) {
                        wifiP2pManager.requestConnectionInfo(channel, connectionInfoListener);
                    }

                } else if (WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION.equals(action)) {
                    // Device details changed
                }
            }
        };

        wifiP2pIntentFilter = new IntentFilter();
        wifiP2pIntentFilter.addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION);
        wifiP2pIntentFilter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
        wifiP2pIntentFilter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
        wifiP2pIntentFilter.addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION);

        getContext().registerReceiver(wifiP2pReceiver, wifiP2pIntentFilter);
    }

    private PeerListListener peerListListener = new PeerListListener() {
        @Override
        public void onPeersAvailable(WifiP2pDeviceList peers) {
            availableDevices.clear();
            availableDevices.addAll(peers.getDeviceList());

            // Notify listeners about found/lost devices
            for (WifiP2pDevice device : availableDevices) {
                JSObject deviceObj = deviceToJSObject(device);
                notifyListeners("onDeviceFound", deviceObj);
            }
        }
    };

    private ConnectionInfoListener connectionInfoListener = new ConnectionInfoListener() {
        @Override
        public void onConnectionInfoAvailable(WifiP2pInfo info) {
            JSObject connectionInfo = new JSObject();
            connectionInfo.put("groupFormed", info.groupFormed);
            connectionInfo.put("isGroupOwner", info.isGroupOwner);
            connectionInfo.put("groupOwnerAddress", info.groupOwnerAddress != null ? info.groupOwnerAddress.getHostAddress() : "");

            notifyListeners("onConnectionInfo", connectionInfo);

            if (info.groupFormed && info.isGroupOwner) {
                // We are the group owner, get group info
                getGroupInfoInternal();
            }
        }
    };

    private void getGroupInfoInternal() {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {
            wifiP2pManager.requestGroupInfo(channel, new GroupInfoListener() {
                @Override
                public void onGroupInfoAvailable(WifiP2pGroup group) {
                    if (group != null) {
                        JSObject groupInfo = groupToJSObject(group);
                        notifyListeners("onGroupInfo", groupInfo);
                    }
                }
            });
        }
    }

    // ==================== PERMISSIONS ====================

    @PluginMethod
    public void initialize(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "permissionCallback");
            return;
        }

        // Enable WiFi if not enabled
        if (!wifiManager.isWifiEnabled()) {
            wifiManager.setWifiEnabled(true);
        }

        call.resolve();
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (getPermissionState("wifi") == PermissionState.GRANTED) {
            initialize(call);
        } else {
            call.reject("WiFi permissions are required");
        }
    }

    private boolean hasRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.NEARBY_WIFI_DEVICES) 
                == PackageManager.PERMISSION_GRANTED;
        } else {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED;
        }
    }

    // ==================== DISCOVERY ====================

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (!hasRequiredPermissions()) {
            call.reject("Permissions not granted");
            return;
        }

        if (isDiscoveryActive) {
            call.resolve();
            return;
        }

        availableDevices.clear();
        discoveredRooms.clear();

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {

            wifiP2pManager.discoverPeers(channel, new ActionListener() {
                @Override
                public void onSuccess() {
                    isDiscoveryActive = true;

                    // Set timeout for discovery
                    discoveryTimeoutRunnable = new Runnable() {
                        @Override
                        public void run() {
                            stopDiscoveryInternal();
                        }
                    };
                    mainHandler.postDelayed(discoveryTimeoutRunnable, DISCOVERY_TIMEOUT);

                    call.resolve();
                }

                @Override
                public void onFailure(int reasonCode) {
                    call.reject("Discovery failed: " + reasonCode);
                }
            });
        } else {
            call.reject("Location permission required for WiFi discovery");
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        stopDiscoveryInternal();
        call.resolve();
    }

    private void stopDiscoveryInternal() {
        if (!isDiscoveryActive) return;

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {
            wifiP2pManager.stopPeerDiscovery(channel, new ActionListener() {
                @Override
                public void onSuccess() {
                    isDiscoveryActive = false;
                }

                @Override
                public void onFailure(int reason) {
                    Log.e(TAG, "Failed to stop discovery: " + reason);
                }
            });
        }

        if (discoveryTimeoutRunnable != null) {
            mainHandler.removeCallbacks(discoveryTimeoutRunnable);
            discoveryTimeoutRunnable = null;
        }
    }

    @PluginMethod
    public void getAvailableDevices(PluginCall call) {
        JSArray devicesArray = new JSArray();

        for (WifiP2pDevice device : availableDevices) {
            devicesArray.put(deviceToJSObject(device));
        }

        JSObject result = new JSObject();
        result.put("devices", devicesArray);
        call.resolve(result);
    }

    // ==================== CONNECTION ====================

    @PluginMethod
    public void connectToDevice(PluginCall call) {
        String deviceAddress = call.getString("deviceAddress");

        if (deviceAddress == null || deviceAddress.isEmpty()) {
            call.reject("Device address is required");
            return;
        }

        WifiP2pConfig config = new WifiP2pConfig();
        config.deviceAddress = deviceAddress;

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {

            wifiP2pManager.connect(channel, config, new ActionListener() {
                @Override
                public void onSuccess() {
                    call.resolve();
                }

                @Override
                public void onFailure(int reason) {
                    call.reject("Connection failed: " + reason);
                }
            });
        } else {
            call.reject("Permission required");
        }
    }

    @PluginMethod
    public void disconnectFromDevice(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {

            wifiP2pManager.removeGroup(channel, new ActionListener() {
                @Override
                public void onSuccess() {
                    call.resolve();
                }

                @Override
                public void onFailure(int reason) {
                    call.reject("Disconnect failed: " + reason);
                }
            });
        } else {
            call.reject("Permission required");
        }
    }

    // ==================== GROUP MANAGEMENT ====================

    @PluginMethod
    public void createGroup(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {

            wifiP2pManager.createGroup(channel, new ActionListener() {
                @Override
                public void onSuccess() {
                    // Get group info after creation
                    mainHandler.postDelayed(() -> {
                        getGroupInfoInternal();
                    }, 1000);

                    call.resolve();
                }

                @Override
                public void onFailure(int reason) {
                    call.reject("Group creation failed: " + reason);
                }
            });
        } else {
            call.reject("Permission required");
        }
    }

    @PluginMethod
    public void removeGroup(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {

            wifiP2pManager.removeGroup(channel, new ActionListener() {
                @Override
                public void onSuccess() {
                    call.resolve();
                }

                @Override
                public void onFailure(int reason) {
                    call.reject("Remove group failed: " + reason);
                }
            });
        } else {
            call.reject("Permission required");
        }
    }

    @PluginMethod
    public void getGroupInfo(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {

            wifiP2pManager.requestGroupInfo(channel, new GroupInfoListener() {
                @Override
                public void onGroupInfoAvailable(WifiP2pGroup group) {
                    if (group != null) {
                        call.resolve(groupToJSObject(group));
                    } else {
                        JSObject result = new JSObject();
                        result.put("group", JSONObject.NULL);
                        call.resolve(result);
                    }
                }
            });
        } else {
            call.reject("Permission required");
        }
    }

    // ==================== HOTSPOT ====================

    @PluginMethod
    public void startHotspot(PluginCall call) {
        String ssid = call.getString("ssid", "DominoGame_" + UUID.randomUUID().toString().substring(0, 6));
        String password = call.getString("password", generateRandomPassword());

        try {
            // Use reflection to access hidden APIs for hotspot
            Method method = wifiManager.getClass().getDeclaredMethod("setWifiApEnabled", WifiConfiguration.class, boolean.class);
            method.setAccessible(true);

            WifiConfiguration wifiConfig = new WifiConfiguration();
            wifiConfig.SSID = ssid;
            wifiConfig.preSharedKey = password;
            wifiConfig.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA2_PSK);

            boolean result = (Boolean) method.invoke(wifiManager, wifiConfig, true);

            if (result) {
                isHotspotActive = true;

                // Wait for hotspot to be ready and get IP
                mainHandler.postDelayed(() -> {
                    String ip = getLocalIpAddressInternal();

                    JSObject hotspotInfo = new JSObject();
                    hotspotInfo.put("ssid", ssid);
                    hotspotInfo.put("password", password);
                    hotspotInfo.put("isEnabled", true);
                    hotspotInfo.put("ipAddress", ip);

                    notifyListeners("onHotspotStateChanged", hotspotInfo);
                }, 2000);

                call.resolve();
            } else {
                call.reject("Failed to start hotspot");
            }
        } catch (Exception e) {
            Log.e(TAG, "Hotspot error", e);
            call.reject("Hotspot not supported on this device: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopHotspot(PluginCall call) {
        try {
            Method method = wifiManager.getClass().getDeclaredMethod("setWifiApEnabled", WifiConfiguration.class, boolean.class);
            method.setAccessible(true);
            method.invoke(wifiManager, null, false);

            isHotspotActive = false;
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Stop hotspot error", e);
            call.reject("Failed to stop hotspot: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getHotspotInfo(PluginCall call) {
        String ip = getLocalIpAddressInternal();

        JSObject result = new JSObject();
        result.put("ssid", isHotspotActive ? "DominoGame" : "");
        result.put("password", "");
        result.put("isEnabled", isHotspotActive);
        result.put("ipAddress", ip);

        call.resolve(result);
    }

    // ==================== ROOM BROADCAST ====================

    @PluginMethod
    public void startRoomBroadcast(PluginCall call) {
        String roomId = call.getString("roomId");
        String playerName = call.getString("playerName");
        int maxPlayers = call.getInt("maxPlayers", 4);

        if (roomId == null || playerName == null) {
            call.reject("Room ID and player name are required");
            return;
        }

        isRoomBroadcasting = true;

        // Broadcast room info via WiFi P2P service discovery
        // This is a simplified implementation - in production, use WiFi P2P Service Discovery
        roomBroadcastRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isRoomBroadcasting) return;

                // Broadcast via local network (UDP multicast would be better)
                JSObject roomInfo = new JSObject();
                roomInfo.put("roomId", roomId);
                roomInfo.put("hostName", playerName);
                roomInfo.put("hostAddress", getLocalIpAddressInternal());
                roomInfo.put("playerCount", 1);
                roomInfo.put("maxPlayers", maxPlayers);

                notifyListeners("onRoomBroadcast", roomInfo);

                mainHandler.postDelayed(this, ROOM_BROADCAST_INTERVAL);
            }
        };

        mainHandler.post(roomBroadcastRunnable);
        call.resolve();
    }

    @PluginMethod
    public void stopRoomBroadcast(PluginCall call) {
        isRoomBroadcasting = false;
        if (roomBroadcastRunnable != null) {
            mainHandler.removeCallbacks(roomBroadcastRunnable);
            roomBroadcastRunnable = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void discoverRooms(PluginCall call) {
        JSArray roomsArray = new JSArray();

        for (RoomInfo room : discoveredRooms.values()) {
            roomsArray.put(roomToJSObject(room));
        }

        JSObject result = new JSObject();
        result.put("rooms", roomsArray);
        call.resolve(result);
    }

    // ==================== NETWORK INFO ====================

    @PluginMethod
    public void getLocalIpAddress(PluginCall call) {
        String ip = getLocalIpAddressInternal();

        JSObject result = new JSObject();
        result.put("ipAddress", ip);
        call.resolve(result);
    }

    private String getLocalIpAddressInternal() {
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress() && addr.getAddress().length == 4) {
                        String sAddr = addr.getHostAddress();
                        if (sAddr.startsWith("192.168.") || sAddr.startsWith("10.") || sAddr.startsWith("172.")) {
                            return sAddr;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting IP", e);
        }
        return "";
    }

    @PluginMethod
    public void getMacAddress(PluginCall call) {
        try {
            String macAddress = "";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // On Android 6+, use NetworkInterface
                List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
                for (NetworkInterface intf : interfaces) {
                    if (intf.getName().equalsIgnoreCase("wlan0")) {
                        byte[] mac = intf.getHardwareAddress();
                        if (mac != null) {
                            StringBuilder buf = new StringBuilder();
                            for (byte b : mac) {
                                buf.append(String.format("%02X:", b));
                            }
                            if (buf.length() > 0) {
                                buf.deleteCharAt(buf.length() - 1);
                            }
                            macAddress = buf.toString();
                        }
                        break;
                    }
                }
            } else {
                macAddress = wifiManager.getConnectionInfo().getMacAddress();
            }

            JSObject result = new JSObject();
            result.put("macAddress", macAddress);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get MAC address: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isWifiEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", wifiManager.isWifiEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void enableWifi(PluginCall call) {
        wifiManager.setWifiEnabled(true);
        call.resolve();
    }

    // ==================== HELPERS ====================

    private JSObject deviceToJSObject(WifiP2pDevice device) {
        JSObject obj = new JSObject();
        obj.put("deviceAddress", device.deviceAddress);
        obj.put("deviceName", device.deviceName);
        obj.put("status", deviceStatusToString(device.status));
        obj.put("isGroupOwner", device.isGroupOwner());
        return obj;
    }

    private JSObject groupToJSObject(WifiP2pGroup group) {
        JSObject obj = new JSObject();
        obj.put("networkName", group.getNetworkName());
        obj.put("passphrase", group.getPassphrase());
        obj.put("isGroupOwner", group.isGroupOwner());
        obj.put("ownerAddress", group.getOwner().deviceAddress);

        JSArray clients = new JSArray();
        for (WifiP2pDevice client : group.getClientList()) {
            clients.put(deviceToJSObject(client));
        }
        obj.put("clients", clients);

        return obj;
    }

    private JSObject roomToJSObject(RoomInfo room) {
        JSObject obj = new JSObject();
        obj.put("roomId", room.roomId);
        obj.put("hostName", room.hostName);
        obj.put("hostAddress", room.hostAddress);
        obj.put("playerCount", room.playerCount);
        obj.put("maxPlayers", room.maxPlayers);
        return obj;
    }

    private String deviceStatusToString(int status) {
        switch (status) {
            case WifiP2pDevice.AVAILABLE: return "available";
            case WifiP2pDevice.INVITED: return "invited";
            case WifiP2pDevice.CONNECTED: return "connected";
            case WifiP2pDevice.FAILED: return "failed";
            case WifiP2pDevice.UNAVAILABLE: return "unavailable";
            default: return "unknown";
        }
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt((int) (Math.random() * chars.length())));
        }
        return sb.toString();
    }

    // RoomInfo inner class
    private static class RoomInfo {
        String roomId;
        String hostName;
        String hostAddress;
        int playerCount;
        int maxPlayers;
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();

        // Cleanup
        stopDiscoveryInternal();

        if (isRoomBroadcasting) {
            stopRoomBroadcast(null);
        }

        if (wifiP2pReceiver != null) {
            try {
                getContext().unregisterReceiver(wifiP2pReceiver);
            } catch (IllegalArgumentException e) {
                // Receiver not registered
            }
        }

        if (channel != null) {
            channel.close();
        }
    }
}
