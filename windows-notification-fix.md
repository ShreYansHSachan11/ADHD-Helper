# Windows Notification Troubleshooting Guide

## The extension is creating notifications successfully, but they're not appearing visually. Here's how to fix it:

### 1. Check Windows Notification Settings

**Windows 11:**
1. Press `Win + I` to open Settings
2. Go to `System` → `Notifications`
3. Make sure "Notifications" is turned ON
4. Scroll down and find "Google Chrome" in the app list
5. Make sure Chrome notifications are enabled

**Windows 10:**
1. Press `Win + I` to open Settings  
2. Go to `System` → `Notifications & actions`
3. Make sure "Get notifications from apps and other senders" is ON
4. Find "Google Chrome" and make sure it's enabled

### 2. Check Focus Assist (Do Not Disturb)

**Windows 11/10:**
1. Click the notification icon in the system tray (bottom right)
2. Look for "Focus assist" or "Do not disturb" 
3. Make sure it's set to "Off" or "Priority only"
4. If it's on "Priority only", add Chrome to priority apps

### 3. Check Chrome Notification Settings

1. Open Chrome
2. Go to `chrome://settings/content/notifications`
3. Make sure "Sites can ask to send notifications" is enabled
4. Check if your extension domain is in the "Block" list
5. If blocked, move it to "Allow"

### 4. Check Chrome Extension Permissions

1. Go to `chrome://extensions/`
2. Find your extension
3. Make sure "Notifications" permission is granted
4. Try disabling and re-enabling the extension

### 5. Test Chrome Notifications

1. Go to any website (like YouTube)
2. Allow notifications when prompted
3. See if you get notifications from that site
4. If not, the issue is system-wide Chrome notifications

### 6. Windows Registry Fix (Advanced)

If nothing else works, try this registry fix:

1. Press `Win + R`, type `regedit`, press Enter
2. Navigate to: `HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings`
3. Look for Chrome entries
4. Make sure `Enabled` is set to `1`

### 7. Restart Services

Try restarting Windows notification services:

1. Press `Win + R`, type `services.msc`, press Enter
2. Find "Windows Push Notifications System Service"
3. Right-click → Restart

### 8. Alternative Test

Try this PowerShell command to test Windows notifications:
```powershell
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show("Test notification", "Test")
```

## Quick Test Commands

Run these in the extension's service worker console:

```javascript
// Test 1: Basic notification
chrome.notifications.create("test1", {
  type: "basic",
  title: "TEST",
  message: "Can you see this?"
});

// Test 2: High priority
chrome.notifications.create("test2", {
  type: "basic", 
  title: "HIGH PRIORITY TEST",
  message: "This should definitely show up",
  priority: 2,
  requireInteraction: true
});
```

If these don't show up visually, the issue is definitely Windows/Chrome notification settings, not the extension code.