/**
 * Minimal Background Service Worker - Focus Productivity Extension
 * Basic functionality without complex imports - NO IMPORTS!
 */

console.log("Focus Productivity Extension background service worker loaded");

// Simple storage wrapper - completely self-contained
const simpleStorage = {
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error("Storage get error:", error);
      return null;
    }
  },

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error("Storage set error:", error);
      return false;
    }
  }
};

// Basic tab tracking
let currentTabStats = {
  currentSessionTime: 0,
  breakRemindersShown: 0,
  lastActiveTime: Date.now()
};

/**
 * Extension installation
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);

  if (details.reason === "install") {
    // Initialize default settings
    await simpleStorage.set("screenTimeSettings", {
      limitMinutes: 30,
      enabled: true,
      notificationsEnabled: true
    });

    await simpleStorage.set("focusSettings", {
      reminderCooldownMinutes: 5,
      trackingEnabled: true
    });

    console.log("Default settings initialized");
  }
});

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sendResponse) {
  try {
    switch (message.type) {
      case "GET_TAB_STATS":
        // Update session time
        const now = Date.now();
        currentTabStats.currentSessionTime += (now - currentTabStats.lastActiveTime);
        currentTabStats.lastActiveTime = now;
        
        sendResponse({ 
          success: true, 
          data: {
            currentSessionTime: currentTabStats.currentSessionTime,
            breakRemindersShown: currentTabStats.breakRemindersShown
          }
        });
        break;

      case "TRIGGER_MANUAL_BREAK":
        // Reset session time
        currentTabStats.currentSessionTime = 0;
        currentTabStats.lastActiveTime = Date.now();
        sendResponse({ success: true });
        break;

      case "SET_FOCUS_TAB":
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          await simpleStorage.set("focusTab", {
            id: tabs[0].id,
            url: tabs[0].url,
            title: tabs[0].title,
            setAt: Date.now()
          });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "No active tab found" });
        }
        break;

      case "GET_FOCUS_INFO":
        const focusTab = await simpleStorage.get("focusTab");
        sendResponse({ success: true, data: focusTab });
        break;

      case "RESET_FOCUS_TAB":
        await simpleStorage.set("focusTab", null);
        sendResponse({ success: true });
        break;

      case "CLEAR_TAB_HISTORY":
        currentTabStats = {
          currentSessionTime: 0,
          breakRemindersShown: 0,
          lastActiveTime: Date.now()
        };
        sendResponse({ success: true });
        break;

      case "CHECK_NOTIFICATION_PERMISSION":
        try {
          const permission = await chrome.notifications.getPermissionLevel();
          sendResponse({
            success: true,
            data: {
              permission: permission,
              granted: permission === "granted",
            },
          });
        } catch (error) {
          sendResponse({ success: false, error: "Notifications not supported" });
        }
        break;

      default:
        sendResponse({ success: false, error: "Unknown message type: " + message.type });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Update session time periodically
setInterval(() => {
  const now = Date.now();
  currentTabStats.currentSessionTime += (now - currentTabStats.lastActiveTime);
  currentTabStats.lastActiveTime = now;
}, 1000);

console.log("Minimal background service worker initialized");