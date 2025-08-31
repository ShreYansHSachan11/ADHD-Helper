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

    // Initialize notification system
    await initializeNotificationSystem();

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

    // Reinitialize notification system
    await initializeNotificationSystem();
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
 * Notification System - Enhanced notification handling with proper timing and permissions
 */

// Notification state tracking
let notificationState = {
  activeNotifications: new Map(),
  lastBreakNotificationTime: 0,
  lastFocusNotificationTime: 0,
  notificationPermissionGranted: false,
};

/**
 * Initialize notification system and check permissions
 */
async function initializeNotificationSystem() {
  try {
    // Check if notifications permission is granted
    const permission = await chrome.notifications.getPermissionLevel();
    notificationState.notificationPermissionGranted = permission === "granted";

    if (!notificationState.notificationPermissionGranted) {
      console.warn("Notifications permission not granted");
    }

    console.log("Notification system initialized, permission:", permission);
  } catch (error) {
    console.error("Error initializing notification system:", error);
  }
}

/**
 * Create and display a notification with proper error handling
 */
async function createNotification(notificationId, options) {
  try {
    // Check permission first
    if (!notificationState.notificationPermissionGranted) {
      console.warn("Cannot show notification: permission not granted");
      return false;
    }

    // Clear any existing notification with the same ID
    if (notificationState.activeNotifications.has(notificationId)) {
      try {
        await chrome.notifications.clear(notificationId);
      } catch (error) {
        console.warn("Error clearing existing notification:", error);
      }
    }

    // Create the notification
    try {
      await chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        ...options,
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
      return false;
    }

    // Track the notification
    notificationState.activeNotifications.set(notificationId, {
      createdAt: Date.now(),
      options: options,
    });

    // Auto-clear notification after 10 seconds if not dismissed
    setTimeout(async () => {
      try {
        await chrome.notifications.clear(notificationId);
        notificationState.activeNotifications.delete(notificationId);
      } catch (error) {
        // Notification might already be cleared
      }
    }, 10000);

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
}

/**
 * Show break reminder notification
 */
async function showBreakReminderNotification(tabId, timeSpent) {
  try {
    const now = Date.now();
    const cooldownMs = CONSTANTS.SCREEN_TIME.NOTIFICATION_COOLDOWN_MS;

    // Check cooldown period
    if (now - notificationState.lastBreakNotificationTime < cooldownMs) {
      console.log("Break notification on cooldown");
      return false;
    }

    const notificationId = `break-reminder-${tabId}-${now}`;
    const timeFormatted = HELPERS.FormatUtils.formatDuration(timeSpent);

    const success = await createNotification(notificationId, {
      title: "Time for a Break! 🕐",
      message: `You've been on this tab for ${timeFormatted}. Consider taking a short break to rest your eyes and mind.`,
      buttons: [{ title: "Take Break" }, { title: "Continue Working" }],
    });

    if (success) {
      notificationState.lastBreakNotificationTime = now;
      console.log("Break reminder notification shown for tab", tabId);
    }

    return success;
  } catch (error) {
    console.error("Error showing break reminder notification:", error);
    return false;
  }
}

/**
 * Show focus reminder notification
 */
async function showFocusReminderNotification(focusUrl, currentUrl) {
  try {
    const now = Date.now();
    const settings = await storageManager.get(
      CONSTANTS.STORAGE_KEYS.FOCUS_SETTINGS
    );
    const cooldownMs = HELPERS.TimeUtils.minutesToMs(
      settings?.reminderCooldownMinutes ||
        CONSTANTS.FOCUS.REMINDER_COOLDOWN_MINUTES
    );

    // Check cooldown period
    if (now - notificationState.lastFocusNotificationTime < cooldownMs) {
      console.log("Focus notification on cooldown");
      return false;
    }

    const notificationId = `focus-reminder-${now}`;

    // Safely extract domain names with error handling
    let focusDomain = "unknown";
    let currentDomain = "unknown";

    try {
      focusDomain = new URL(focusUrl).hostname;
    } catch (error) {
      console.warn("Invalid focus URL:", focusUrl);
      focusDomain = focusUrl || "unknown";
    }

    try {
      if (currentUrl) {
        currentDomain = new URL(currentUrl).hostname;
      }
    } catch (error) {
      console.warn("Invalid current URL:", currentUrl);
      currentDomain = currentUrl || "unknown";
    }

    const success = await createNotification(notificationId, {
      title: "Stay Focused! 🎯",
      message: `You switched from ${focusDomain} to ${currentDomain}. Remember to stay focused on your initial task.`,
      buttons: [{ title: "Return to Task" }, { title: "Update Focus" }],
    });

    if (success) {
      notificationState.lastFocusNotificationTime = now;
      console.log("Focus reminder notification shown");
    }

    return success;
  } catch (error) {
    console.error("Error showing focus reminder notification:", error);
    return false;
  }
}

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Clear the notification
    await chrome.notifications.clear(notificationId);
    notificationState.activeNotifications.delete(notificationId);

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
      // Clear the notification
      await chrome.notifications.clear(notificationId);
      notificationState.activeNotifications.delete(notificationId);

      // Handle different notification types based on button clicked
      if (notificationId.includes("break")) {
        if (buttonIndex === 0) {
          // "Take Break" button clicked
          if (tabTracker) {
            await tabTracker.triggerManualBreak();
            console.log("Manual break triggered from notification");
          }
        }
        // "Continue Working" (buttonIndex === 1) - no action needed, just dismiss
      } else if (notificationId.includes("focus")) {
        if (buttonIndex === 0) {
          // "Return to Task" button clicked
          const focusInfo = tabTracker ? tabTracker.getFocusTabInfo() : null;
          if (focusInfo && focusInfo.tabId) {
            try {
              await chrome.tabs.update(focusInfo.tabId, { active: true });
              console.log("Returned to focus tab from notification");
            } catch (error) {
              console.log("Focus tab no longer exists, cannot return");
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
            console.log("Focus tab updated from notification");
          }
        }
      }
    } catch (error) {
      console.error("Error handling notification button click:", error);
    }
  }
);

/**
 * Handle notification dismissal (when user closes notification)
 */
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  try {
    notificationState.activeNotifications.delete(notificationId);
    if (byUser) {
      console.log("Notification dismissed by user:", notificationId);
    }
  } catch (error) {
    console.error("Error handling notification dismissal:", error);
  }
});

/**
 * Clean up expired notifications periodically
 */
setInterval(() => {
  try {
    const now = Date.now();
    const expiredNotifications = [];

    notificationState.activeNotifications.forEach((data, notificationId) => {
      // Remove notifications older than 30 seconds
      if (now - data.createdAt > 30000) {
        expiredNotifications.push(notificationId);
      }
    });

    expiredNotifications.forEach(async (notificationId) => {
      try {
        await chrome.notifications.clear(notificationId);
        notificationState.activeNotifications.delete(notificationId);
      } catch (error) {
        // Notification might already be cleared
      }
    });

    if (expiredNotifications.length > 0) {
      console.log(
        "Cleaned up expired notifications:",
        expiredNotifications.length
      );
    }
  } catch (error) {
    console.error("Error during notification cleanup:", error);
  }
}, 30000); // Run every 30 seconds

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

      case "SHOW_BREAK_NOTIFICATION":
        const breakSuccess = await showBreakReminderNotification(
          message.tabId,
          message.timeSpent
        );
        sendResponse({ success: breakSuccess });
        break;

      case "SHOW_FOCUS_NOTIFICATION":
        const focusSuccess = await showFocusReminderNotification(
          message.focusUrl,
          message.currentUrl
        );
        sendResponse({ success: focusSuccess });
        break;

      case "CHECK_NOTIFICATION_PERMISSION":
        const permission = await chrome.notifications.getPermissionLevel();
        sendResponse({
          success: true,
          data: {
            permission: permission,
            granted: permission === "granted",
          },
        });
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
    await initializeNotificationSystem();
  } catch (error) {
    console.error("Error during initial load:", error);
  }
})();
