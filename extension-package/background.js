/**
 * Background Service Worker - Focus Productivity Extension
 * Handles tab tracking, notifications, and persistent background functionality
 */
// Import required modules
importScripts(
  "/utils/error-handler.js",
  "/services/storage-manager.js",
  "/services/tab-tracker.js",
  "/services/gemini-service.js",
  "/utils/constants.js",
  "/utils/helpers.js"
);
// Global instances
let tabTracker = null;
let storageManager = null;
let geminiService = null;
// Initialize service worker
/**
 * Extension installation and startup
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    // Initialize storage manager
    storageManager = new StorageManager();
    // Initialize default settings if this is a fresh install
    if (details.reason === "install") {
      await initializeDefaultSettings();
    }
    // Initialize tab tracker
    tabTracker = new TabTracker();
    // Initialize Gemini service
    geminiService = new GeminiService();
    // Initialize notification system
    await initializeNotificationSystem();
    } catch (error) {
    console.error("Error initializing background service worker:", error);
  }
});
/**
 * Service worker startup (when browser starts)
 */
chrome.runtime.onStartup.addListener(async () => {
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
              } catch (error) {
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
 * Handle notification dismissal (when user closes notification)
 */
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  try {
    notificationState.activeNotifications.delete(notificationId);
    if (byUser) {
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
    // Validate message structure
    if (!message || typeof message !== 'object' || !message.type) {
      const error = new Error('Invalid message format');
      if (typeof errorHandler !== 'undefined') {
        const result = errorHandler.handleExtensionError(error, 'Message Handler');
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'Invalid message format' });
      }
      return;
    }
    switch (message.type) {
      case "GET_TAB_STATS":
        try {
          const stats = tabTracker ? await tabTracker.getCurrentTabStats() : null;
          sendResponse({ success: true, data: stats });
        } catch (error) {
          console.error('Error getting tab stats:', error);
          if (typeof errorHandler !== 'undefined') {
            const result = errorHandler.handleExtensionError(error, 'Tab Stats');
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'Failed to get tab statistics' });
          }
        }
        break;
      case "GET_FOCUS_INFO":
        try {
          const focusInfo = tabTracker ? tabTracker.getFocusTabInfo() : null;
          sendResponse({ success: true, data: focusInfo });
        } catch (error) {
          console.error('Error getting focus info:', error);
          if (typeof errorHandler !== 'undefined') {
            const result = errorHandler.handleExtensionError(error, 'Focus Info');
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'Failed to get focus information' });
          }
        }
        break;
      case "SET_FOCUS_TAB":
        try {
          if (!tabTracker) {
            throw new Error('Tab tracker not initialized');
          }
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (tabs.length === 0) {
            throw new Error('No active tab found');
          }
          // Check if tab is accessible
          const tab = tabs[0];
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            throw new Error('Cannot set focus on restricted tabs');
          }
          await tabTracker.setFocusTab(tab.id, tab.url);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error setting focus tab:', error);
          if (typeof errorHandler !== 'undefined') {
            const result = errorHandler.handleExtensionError(error, 'Set Focus Tab');
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: error.message });
          }
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
      case "GET_FOCUS_SESSION_STATS":
        if (tabTracker) {
          const sessionStats = await tabTracker.getFocusSessionStats();
          sendResponse({ success: true, data: sessionStats });
        } else {
          sendResponse({
            success: false,
            error: "Tab tracker not initialized",
          });
        }
        break;
      case "GET_FOCUS_DEVIATION_HISTORY":
        if (tabTracker) {
          const deviationHistory = await tabTracker.getFocusDeviationHistory();
          sendResponse({ success: true, data: deviationHistory });
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
        // Also reset current session data
        await storageManager.set(CONSTANTS.STORAGE_KEYS.CURRENT_SESSION, {});
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
      case "getTaskBreakdown":
        try {
          if (!geminiService) {
            throw new Error('Gemini service not initialized');
          }
          // Validate required parameters
          if (!message.taskName || !message.deadline) {
            throw new Error('Task name and deadline are required');
          }
          const result = await geminiService.breakdownTask(
            message.taskName,
            message.deadline
          );
          if (result.success) {
            sendResponse({
              success: true,
              breakdown: result.steps,
              taskName: result.taskName,
              deadline: result.deadline,
            });
          } else {
            // Return error with fallback data
            sendResponse({
              success: false,
              error: result.error,
              errorType: result.errorType,
              canRetry: result.canRetry,
              breakdown: result.placeholder ? result.placeholder.steps : null,
              placeholderMessage: result.placeholder ? result.placeholder.message : null
            });
          }
        } catch (error) {
          console.error("Task breakdown error:", error);
          if (typeof errorHandler !== 'undefined') {
            const result = errorHandler.handleApiError(error, 'Task Breakdown');
            sendResponse({
              success: false,
              error: result.error,
              errorType: result.errorType,
              canRetry: result.canRetry
            });
          } else {
            sendResponse({
              success: false,
              error: "Failed to process task breakdown request",
            });
          }
        }
        break;
      case "toggleWhiteNoise":
        try {
          if (!globalThis.audioManager) {
            // Dynamically import AudioManager
            const AudioManager = await import("./services/audio-manager.js");
            globalThis.audioManager = new AudioManager.default();
          }
          const result = await globalThis.audioManager.togglePlayPause();
          sendResponse(result);
        } catch (error) {
          console.error("White noise toggle error:", error);
          if (typeof errorHandler !== 'undefined') {
            const result = errorHandler.handleAudioError(error, 'White Noise Toggle');
            sendResponse(result);
          } else {
            sendResponse({
              success: false,
              error: "Failed to toggle white noise",
            });
          }
        }
        break;
      case "setWhiteNoiseVolume":
        try {
          if (!globalThis.audioManager) {
            const AudioManager = await import("./services/audio-manager.js");
            globalThis.audioManager = new AudioManager.default();
          }
          const newVolume = globalThis.audioManager.setVolume(message.volume);
          sendResponse({ success: true, volume: newVolume });
        } catch (error) {
          console.error("Volume set error:", error);
          sendResponse({
            success: false,
            error: "Failed to set volume",
          });
        }
        break;
      case "nextWhiteNoiseSound":
        try {
          if (!globalThis.audioManager) {
            const AudioManager = await import("./services/audio-manager.js");
            globalThis.audioManager = new AudioManager.default();
          }
          const result = globalThis.audioManager.nextRandomSound();
          sendResponse(result);
        } catch (error) {
          console.error("Sound change error:", error);
          sendResponse({
            success: false,
            error: "Failed to change sound",
          });
        }
        break;
      case "getWhiteNoiseStatus":
        try {
          if (!globalThis.audioManager) {
            const AudioManager = await import("./services/audio-manager.js");
            globalThis.audioManager = new AudioManager.default();
          }
          sendResponse({
            success: true,
            active: globalThis.audioManager.isActive(),
            volume: globalThis.audioManager.getVolume(),
            currentSound: globalThis.audioManager.getCurrentSoundName(),
            currentSoundIndex: globalThis.audioManager.getCurrentSoundIndex(),
          });
        } catch (error) {
          console.error("Status get error:", error);
          sendResponse({
            success: false,
            error: "Failed to get status",
          });
        }
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
    geminiService = new GeminiService();
    await initializeNotificationSystem();
  } catch (error) {
    console.error("Error during initial load:", error);
  }
})();
