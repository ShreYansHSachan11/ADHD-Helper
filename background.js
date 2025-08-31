/**
 * Background Service Worker - Focus Productivity Extension
 * Handles tab tracking, notifications, and persistent background functionality
 */

// Import required modules
importScripts(
  "/services/storage-manager.js",
  "/services/tab-tracker.js",
  "/utils/constants.js",
  "/utils/helpers.js"
);

// Global instances
let tabTracker = null;
let storageManager = null;

// Initialize service worker
console.log("Focus Productivity Extension background service worker loaded");

/**
 * Extension installation and startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);

  try {
    // Initialize storage manager
    storageManager = new StorageManager();

    // Initialize default settings if this is a fresh install
    if (details.reason === "install") {
      await initializeDefaultSettings();
    }

    // Initialize tab tracker
    tabTracker = new TabTracker();

    console.log("Background service worker initialized successfully");
  } catch (error) {
    console.error("Error initializing background service worker:", error);
  }
});

/**
 * Service worker startup (when browser starts)
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser startup detected");

  try {
    // Reinitialize components
    storageManager = new StorageManager();
    tabTracker = new TabTracker();
  } catch (error) {
    console.error("Error on startup:", error);
  }
});

/**
 * Initialize default settings for fresh installation
 */
async function initializeDefaultSettings() {
  try {
    const defaultData = {
      [CONSTANTS.STORAGE_KEYS.SCREEN_TIME_SETTINGS]:
        CONSTANTS.DEFAULT_SETTINGS.screenTime,
      [CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS]: CONSTANTS.DEFAULT_SETTINGS.focus,
      [CONSTANTS.STORAGE_KEYS.BREATHING_SETTINGS]:
        CONSTANTS.DEFAULT_SETTINGS.breathing,
      [CONSTANTS.STORAGE_KEYS.AUDIO_SETTINGS]: CONSTANTS.DEFAULT_SETTINGS.audio,
      [CONSTANTS.STORAGE_KEYS.TAB_HISTORY]: {},
      [CONSTANTS.STORAGE_KEYS.CURRENT_SESSION]: {},
      [CONSTANTS.STORAGE_KEYS.TASKS]: [],
      [CONSTANTS.STORAGE_KEYS.API_KEYS]: {},
    };

    await storageManager.setMultiple(defaultData);
    console.log("Default settings initialized");
  } catch (error) {
    console.error("Error initializing default settings:", error);
  }
}

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Clear the notification
    await chrome.notifications.clear(notificationId);

    // Open extension popup
    const windows = await chrome.windows.getAll({ populate: true });
    const extensionWindow = windows.find(
      (window) =>
        window.tabs &&
        window.tabs.some(
          (tab) => tab.url && tab.url.includes(chrome.runtime.id)
        )
    );

    if (!extensionWindow) {
      // Open popup if not already open
      await chrome.action.openPopup();
    }
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
});

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    try {
      await chrome.notifications.clear(notificationId);

      // Handle different notification types based on button clicked
      if (notificationId.includes("break")) {
        if (buttonIndex === 0) {
          // "Take Break" button clicked
          if (tabTracker) {
            await tabTracker.triggerManualBreak();
          }
        }
        // "Continue Working" - no action needed, just dismiss
      } else if (notificationId.includes("focus")) {
        if (buttonIndex === 0) {
          // "Return to Task" button clicked
          const focusInfo = tabTracker ? tabTracker.getFocusTabInfo() : null;
          if (focusInfo && focusInfo.tabId) {
            try {
              await chrome.tabs.update(focusInfo.tabId, { active: true });
            } catch (error) {
              console.log("Focus tab no longer exists");
            }
          }
        } else if (buttonIndex === 1) {
          // "Update Focus" button clicked - set current tab as new focus
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tabs.length > 0 && tabTracker) {
            await tabTracker.setFocusTab(tabs[0].id, tabs[0].url);
          }
        }
      }
    } catch (error) {
      console.error("Error handling notification button click:", error);
    }
  }
);

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

/**
 * Handle different types of messages
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case "GET_TAB_STATS":
        const stats = tabTracker ? await tabTracker.getCurrentTabStats() : null;
        sendResponse({ success: true, data: stats });
        break;

      case "GET_FOCUS_INFO":
        const focusInfo = tabTracker ? tabTracker.getFocusTabInfo() : null;
        sendResponse({ success: true, data: focusInfo });
        break;

      case "SET_FOCUS_TAB":
        if (tabTracker) {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tabs.length > 0) {
            await tabTracker.setFocusTab(tabs[0].id, tabs[0].url);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "No active tab found" });
          }
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "RESET_FOCUS_TAB":
        if (tabTracker) {
          await tabTracker.resetFocusTab();
          sendResponse({ success: true });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "TRIGGER_MANUAL_BREAK":
        if (tabTracker) {
          await tabTracker.triggerManualBreak();
          sendResponse({ success: true });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;

      case "GET_ALL_TAB_HISTORY":
        const tabHistory =
          (await storageManager.get(CONSTANTS.STORAGE_KEYS.TAB_HISTORY)) || {};
        sendResponse({ success: true, data: tabHistory });
        break;

      case "CLEAR_TAB_HISTORY":
        await storageManager.set(CONSTANTS.STORAGE_KEYS.TAB_HISTORY, {});
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle extension context invalidation
 */
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service worker suspending");

  // Save any pending data
  if (tabTracker && tabTracker.currentTabId) {
    tabTracker.stopTrackingTab(tabTracker.currentTabId).catch(console.error);
  }
});

/**
 * Periodic cleanup and maintenance
 */
setInterval(async () => {
  try {
    // Clean up old tab history entries (older than 7 days)
    const tabHistory =
      (await storageManager.get(CONSTANTS.STORAGE_KEYS.TAB_HISTORY)) || {};
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let cleaned = false;

    Object.keys(tabHistory).forEach((tabId) => {
      const tabData = tabHistory[tabId];
      if (tabData.lastActiveTime < sevenDaysAgo) {
        delete tabHistory[tabId];
        cleaned = true;
      }
    });

    if (cleaned) {
      await storageManager.set(CONSTANTS.STORAGE_KEYS.TAB_HISTORY, tabHistory);
      console.log("Cleaned up old tab history entries");
    }
  } catch (error) {
    console.error("Error during periodic cleanup:", error);
  }
}, 60 * 60 * 1000); // Run every hour

// Initialize when service worker loads
(async () => {
  try {
    storageManager = new StorageManager();
    tabTracker = new TabTracker();
  } catch (error) {
    console.error("Error during initial load:", error);
  }
})();
